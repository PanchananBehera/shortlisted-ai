// server/index.js
import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import applicationRoutes from './routes/applicationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';


// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Production-ready CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173', // Local development
    'https://shortlisted-ai-frontend.vercel.app', // Vercel production (update with your actual URL)
    /\.vercel\.app$/, // Allow all Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Handle larger resume files
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Request logging for production debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Route registrations
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user/profile', profileRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/analytics', analyticsRoutes);

// ✅ Health check endpoint for Render/Vercel monitoring
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: '🤖 AI Job Application Tracker API',
    version: '1.0.0',
    status: 'Running ✅',
    docs: 'https://github.com/YOUR_USERNAME/shortlisted-ai-backend'
  });
});

// ✅ Global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ 
      success: false, 
      message: 'Duplicate entry. This record already exists.' 
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token. Please login again.' 
    });
  }
  
  // Default error
  res.status(err.status || 500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong. Please try again later.' 
      : err.message 
  });
});

// ✅ 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.path 
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ✅ Graceful shutdown for production
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});