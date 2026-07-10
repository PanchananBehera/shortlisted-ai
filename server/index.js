// server/index.js - FINAL PRODUCTION VERSION with Error Reporting
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
import audioRoutes from './routes/audioRoutes.js';
// ✅ NEW: Error reporting routes
import errorReportRoutes from './routes/errorReports.js';
import interviewRoutes from './routes/interviewRoutes.js';
import userRoutes from './routes/userRoutes.js';

// ✅ Real-Time Tracking Imports
import { initSocket } from './utils/socket.js';
import { startTrackingService } from './utils/userTracker.js';

// ✅ Middleware
import { limitErrorReports } from './middleware/rateLimit.js';

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

// ✅ Helper: Get allowed CORS origins (handles comma-separated env var)
const getAllowedOrigins = () => {
  const defaultOrigins = [
    'http://localhost:5173', 
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://[::1]:5173',
    'http://[::1]:5174',
    'https://shortlisted-ai-job-alpha.vercel.app'
  ];
  const rawUrl = process.env.FRONTEND_URL;
  
  if (!rawUrl) return defaultOrigins;
  
  // Parse, clean, and deduplicate origins
  const parsedOrigins = rawUrl
    .split(',')
    .map(url => url.trim().replace(/['"]/g, '').replace(/\/$/, ''))
    .filter(url => url.length > 0);
  
  // Combine + remove duplicates
  return [...new Set([...parsedOrigins, ...defaultOrigins])];
};

// ✅ Request Logging Middleware (production-friendly)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const isProd = process.env.NODE_ENV === 'production';
    const shouldLog = !isProd || res.statusCode >= 400;
    
    if (shouldLog) {
      console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// ✅ CORS & Body Parsing (production-ready)
app.use(cors({ 
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Security Headers (production only)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// ✅ API Routes (CORS must be BEFORE routes)
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/user/profile', profileRoutes);
app.use('/api/profile', profileControllerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', errorReportRoutes);
app.use('/api/admin/reports', errorReportRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api', userRoutes);
app.use('/api/audio', audioRoutes);
// ✅ Health Check (enhanced for uptime monitoring)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    realtime: 'enabled',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ✅ Root Route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shortlisted AI API running ✅',
    features: ['auth', 'ai-assistant', 'resume-analyzer', 'real-time-tracking', 'error-reporting'],
    docs: 'https://github.com/yourusername/shortlisted-ai',
    health: '/api/health'
  });
});

// ✅ Global Error Handler (production-safe + auto-reporting)
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 🚨 Auto-report critical server errors (fire-and-forget, don't block response)
  if (isProduction && err.statusCode >= 500 && !err.reported) {
    // Mark as reported to prevent infinite loops
    err.reported = true;
    
    // Import dynamically to avoid circular dependencies
    import('./models/ErrorReport.js').then(({ default: ErrorReport }) => {
      ErrorReport.create({
        type: 'server_error',
        message: err.message,
        context: {
          statusCode: err.statusCode,
          path: req.originalUrl || req.url,
          method: req.method,
          userAgent: req.get('user-agent'),
          timestamp: new Date().toISOString()
        },
        user: {
          _id: req.user?._id || null,
          email: req.user?.email || null
        },
        severity: 'critical'
      }).catch(reportErr => {
        // Silently fail - never let reporting break error handling
        console.warn('⚠️ Failed to auto-report server error:', reportErr.message);
      });
    }).catch(() => {
      // Ignore import errors in error handler
    });
  }
  
  // Log appropriately
  if (isProduction) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack?.split('\n')[0],
      url: req.url,
      method: req.method,
      userId: req.user?._id || 'anonymous',
      statusCode: err.statusCode
    });
  } else {
    console.error('Server Error:', err);
  }
  
  // Safe response
  res.status(err.statusCode || 500).json({ 
    success: false, 
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
    // ✅ Include request ID for support tracing (if you have one)
    requestId: req.id || null
  });
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/ai/analyze-resume',
      'POST /api/ai/cover-letter',
      'POST /api/ai/interview-qa',
      'POST /api/reports/error' // ✅ NEW: Error reporting endpoint
    ]
  });
});

// ✅ Start Server with HTTP (production config)
const startServer = async () => {
  try {
    await connectDB();
    
    // ✅ Log allowed origins for debugging
    console.log(`🔐 Allowed Origins: ${getAllowedOrigins().join(', ')}`);
    
    // ✅ Render requires listening on 0.0.0.0
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔌 Real-time tracking enabled (Socket.io)`);
      console.log(`🐛 Error reporting enabled: POST /api/reports/error`);
      console.log(`🌐 Frontend: ${getAllowedOrigins().filter(u => !u.includes('localhost')).join(', ') || 'http://localhost:5173'}`);
      console.log(`📊 Analytics: /admin/analytics`);
      console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Version: ${process.env.npm_package_version || '1.0.0'}`);
    });
    
    // ✅ Graceful shutdown (critical for zero-downtime deploys)
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Close database connections if needed
        // mongoose.connection.close(() => {
        //   console.log('✅ MongoDB connection closed');
        // });
        
        console.log('✅ Shutdown complete');
        process.exit(0);
      });
      
      // Force exit after 10 seconds if connections don't close
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit on unhandled rejections in production (let app continue)
      if (process.env.NODE_ENV !== 'production') {
        gracefulShutdown('unhandledRejection');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ✅ Start the server
startServer();