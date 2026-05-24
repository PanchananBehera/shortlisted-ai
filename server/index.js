// server/index.js - PRODUCTION OPTIMIZED
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { connectDB } from './config/db.js';

// ✅ Routes
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import profileRoutes from './routes/profile.js';
import profileControllerRoutes from './routes/profileRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// ✅ Real-Time Tracking Imports
import { initSocket } from './utils/socket.js';
import { startTrackingService } from './utils/userTracker.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Trust proxy for Render/Vercel (critical for Socket.io + HTTPS)
app.set('trust proxy', 1);

// ✅ Create HTTP server for Socket.io
const server = http.createServer(app);

// ✅ Initialize Socket.io with production config
initSocket(server);

// ✅ Start background tracking service
startTrackingService();

// ✅ Request Logging Middleware (production-friendly)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // Only log non-200 errors in production to reduce noise
    if (process.env.NODE_ENV === 'production' && res.statusCode >= 400) {
      console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${Date.now() - start}ms)`);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// ✅ CORS & Body Parsing (production-ready)
const getAllowedOrigins = () => {
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174'];
  const rawUrl = process.env.FRONTEND_URL;
  if (!rawUrl) return defaultOrigins;
  
  const parsedOrigins = rawUrl.split(',').map(url => {
    return url.trim().replace(/['"]/g, '').replace(/\/$/, '');
  });
  return [...parsedOrigins, ...defaultOrigins];
};

app.use(cors({ 
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Security Headers (optional but recommended)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/user/profile', profileRoutes);
app.use('/api/profile', profileControllerRoutes);
app.use('/api/admin', adminRoutes);

// ✅ Health Check (enhanced for uptime monitoring)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    realtime: 'enabled',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ Root Route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shortlisted AI API running ✅',
    features: ['auth', 'ai-assistant', 'resume-analyzer', 'real-time-tracking'],
    docs: 'https://github.com/yourusername/shortlisted-ai'
  });
});

// ✅ Global Error Handler (production-safe)
app.use((err, req, res, next) => {
  // Log full error in development, sanitized in production
  if (process.env.NODE_ENV === 'development') {
    console.error('Server Error:', err);
  } else {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack?.split('\n')[0], // First line only
      url: req.url,
      method: req.method
    });
  }
  
  // Don't leak internal errors to client in production
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({ 
    success: false, 
    error: isProduction ? 'Internal server error' : err.message 
  });
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ✅ Start Server with HTTP (production config)
const startServer = async () => {
  try {
    await connectDB();
    
    // ✅ Render requires listening on 0.0.0.0
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔌 Real-time tracking enabled (Socket.io)`);
      console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`📊 Analytics: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/analytics`);
      console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // ✅ Graceful shutdown (critical for zero-downtime deploys)
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
      // Force exit after 10 seconds if connections don't close
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();