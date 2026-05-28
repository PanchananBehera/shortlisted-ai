// src/middleware/rateLimit.js
// ✅ Simple in-memory rate limiter for error reporting endpoint
// 🔄 For production: Replace with Redis-based limiter

const reportLimits = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REPORTS = 10; // Max reports per user/IP in window

export const limitErrorReports = (req, res, next) => {
  // Identify user: prefer userId, fallback to IP
  const identifier = req.user?._id || req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Get or initialize user's report history
  if (!reportLimits.has(identifier)) {
    reportLimits.set(identifier, []);
  }
  
  const reports = reportLimits.get(identifier);
  
  // Remove timestamps outside the window
  const validReports = reports.filter(time => now - time < WINDOW_MS);
  
  // Check if limit exceeded
  if (validReports.length >= MAX_REPORTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many error reports. Please try again later.',
      retryAfter: Math.ceil((WINDOW_MS - (now - validReports[0])) / 1000)
    });
  }
  
  // Add current request timestamp
  validReports.push(now);
  reportLimits.set(identifier, validReports);
  
  // Cleanup old entries periodically (simple approach)
  if (validReports.length % 5 === 0) {
    setTimeout(() => {
      const current = reportLimits.get(identifier) || [];
      const cleaned = current.filter(time => Date.now() - time < WINDOW_MS);
      if (cleaned.length === 0) {
        reportLimits.delete(identifier);
      } else {
        reportLimits.set(identifier, cleaned);
      }
    }, WINDOW_MS);
  }
  
  next();
};

// 🔄 Production alternative: Express-rate-limit package
// npm install express-rate-limit
/*
import rateLimit from 'express-rate-limit';

export const errorReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id || req.ip,
  message: {
    success: false,
    message: 'Too many error reports. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
*/