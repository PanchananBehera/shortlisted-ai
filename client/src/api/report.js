// src/api/report.js
// ✅ Silent error reporting utility
import api from '../utils/axios';

/**
 * Send an error report to the backend
 * @param {Object} params - Error report details
 * @param {string} params.type - Error type identifier (e.g., 'ai_timeout')
 * @param {string} params.message - User-facing error message
 * @param {Object} params.context - Additional debug context (file size, role, etc.)
 * @param {string} params.userId - User ID (if authenticated)
 * @param {string} params.userEmail - User email (if authenticated)
 */
export const reportIssue = async ({ 
  type, 
  message, 
  context = {}, 
  userId, 
  userEmail 
}) => {
  try {
    // ✅ Send minimal, anonymized data to protect privacy
    const payload = {
      type,
      message,
      context: {
        // Only include safe, non-sensitive context
        fileSize: context.fileSize,
        fileType: context.fileType,
        targetRole: context.targetRole,
        hasJobDescription: context.hasJobDescription,
        // Auto-collected safe metadata
        timestamp: context.timestamp,
        path: context.path,
        userAgent: context.userAgent,
        // ❌ NEVER send: raw file content, passwords, tokens, PII beyond email
      },
      // Auth info (axios interceptor will add token if logged in)
      userId,
      userEmail
    };

    // ✅ Fire-and-forget: don't block UI if reporting fails
    await api.post('/reports/error', payload, {
      // Optional: lower priority request
      headers: { 'X-Priority': 'low' }
    });
    
    console.log('📤 Error report sent:', { type, userId });
    return true;
  } catch (err) {
    // ✅ Silently fail - never let reporting break the user experience
    console.warn('⚠️ Failed to send error report (non-critical):', err);
    return false;
  }
};

/**
 * Quick helper for common error types
 */
export const reportErrorByStatus = (status, context = {}) => {
  const errorMap = {
    413: 'file_too_large',
    400: 'invalid_file_type',
    401: 'unauthorized',
    429: 'quota_exceeded',
    504: 'ai_timeout',
    500: 'analysis_failed'
  };
  
  const type = errorMap[status] || 'generic';
  return reportIssue({ 
    type, 
    message: `HTTP ${status} error`, 
    context: { ...context, statusCode: status } 
  });
};