// src/utils/axios.js - PRODUCTION READY with Silent Error Reporting
import axios from 'axios';

// ✅ Get API URL from env with fallback
const getApiBaseUrl = () => {
  // Vite uses VITE_ prefix for frontend env vars
  const viteUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (viteUrl) return viteUrl;
  
  // Fallbacks for different environments
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '[::1]';

  if (isLocalhost) {
    return 'http://localhost:5002/api'; // Dev fallback
  }
  
  // Production fallback (update to your actual backend URL)
  return 'https://shortlisted-ai-app.onrender.com/api';
};

// ✅ Create base axios instance
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Create separate instance for error reporting (no auth, no interceptors)
// This prevents infinite loops if reporting itself fails
const reportApi = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: false, // No cookies for anonymous reports
  headers: {
    'Content-Type': 'application/json',
  },
  // Short timeout so reporting never blocks UI
  timeout: 3000
});

// ✅ Track reported errors to prevent duplicate reports
const reportedErrors = new Set();
const MAX_REPORTS_PER_SESSION = 20; // Prevent spam if app is broken
let reportCount = 0;

// ✅ Silent error reporting utility (fire-and-forget)
const silentlyReportError = async (error, context = {}) => {
  // Skip if:
  // - Not in production (avoid polluting reports during dev)
  // - Already reported this exact error
  // - Hit session report limit
  if (
    import.meta.env?.DEV ||
    reportedErrors.has(error?.fingerprint) ||
    reportCount >= MAX_REPORTS_PER_SESSION
  ) {
    return;
  }

  // Create fingerprint for deduplication
  const fingerprint = `${error?.response?.status || 'network'}:${error?.message?.substring(0, 50) || 'unknown'}:${context?.endpoint || ''}`;
  
  // Mark as reported
  reportedErrors.add(fingerprint);
  reportCount++;
  
  // Gather safe context (NO sensitive data)
  const safeContext = {
    endpoint: context?.endpoint || error?.config?.url,
    method: context?.method || error?.config?.method,
    statusCode: error?.response?.status,
    statusText: error?.response?.statusText,
    userAgent: navigator.userAgent,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    // Only include non-sensitive request data
    ...(context?.fileSize && { fileSize: context.fileSize }),
    ...(context?.fileType && { fileType: context.fileType }),
    ...(context?.targetRole && { targetRole: context.targetRole }),
  };

  // Get user info if available (from localStorage, not state to avoid deps)
  let userId = null;
  let userEmail = null;
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      userId = user._id || user.id;
      userEmail = user.email;
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Map error to user-friendly type
  const getErrorType = (err) => {
    const status = err?.response?.status;
    const msg = err?.message?.toLowerCase() || '';
    
    if (status === 413) return 'file_too_large';
    if (status === 400) {
      if (msg.includes('pdf') || msg.includes('file')) return 'invalid_file_type';
      if (msg.includes('empty')) return 'empty_file';
      return 'invalid_file_type';
    }
    if (status === 401) return 'unauthorized';
    if (status === 429) return 'quota_exceeded';
    if (status === 504 || status === 502) return 'ai_timeout';
    if (status >= 500) return 'analysis_failed';
    if (msg.includes('network') || msg.includes('fetch') || !err.response) return 'network_error';
    
    return 'generic';
  };

  const payload = {
    type: getErrorType(error),
    message: error?.response?.data?.message || error?.message || 'Unknown error',
    context: safeContext,
    userId,
    userEmail,
    fingerprint // For backend deduplication
  };

  // 🚀 Fire-and-forget: never await, never reject, never block UI
  reportApi.post('/reports/error', payload)
    .then(() => {
      console.log('📤 Error report sent:', payload.type);
    })
    .catch((reportErr) => {
      // Silently fail - never let reporting break the app
      // Only log in dev for debugging
      if (import.meta.env?.DEV) {
        console.warn('⚠️ Failed to send error report:', reportErr.message);
      }
    });
};

// ✅ Request Interceptor: Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor: Handle errors globally + auto-report
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const endpoint = error.config?.url;
    const method = error.config?.method;
    
    // 🔴 401: Unauthorized - ONLY redirect if NOT on auth pages
    if (status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/register';
      
      if (!isAuthPage) {
        console.warn('🔐 Session expired - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    // 🟡 429: Rate Limited
    if (status === 429) {
      const data = error.response?.data;
      const retryAfter = data?.retryAfter || 60;
      const message = data?.error || 'Too many requests';
      
      console.warn(`⚠️ Rate Limited: ${message} (retry after ${retryAfter}s)`);
      
      window.dispatchEvent(new CustomEvent('ai-rate-limited', { 
        detail: { message, retryAfter } 
      }));
    }
    
    // 🔵 500: Server Error - Auto-report critical failures
    if (status >= 500) {
      console.error('🔥 Server Error:', error.response?.data);
      
      // Auto-report server errors silently (but skip if already handled by component)
      if (!error.config?.skipAutoReport) {
        silentlyReportError(error, { endpoint, method });
      }
    }
    
    // 🔴 Network Error (server down or CORS) - Auto-report
    if (!error.response) {
      console.error('🌐 Network Error: Cannot connect to server');
      
      // Only report network errors occasionally to avoid spam during outages
      if (Math.random() < 0.1 && !error.config?.skipAutoReport) { // 10% sampling
        silentlyReportError(error, { endpoint, method, context: { networkError: true } });
      }
    }
    
    // 🟠 4xx Client Errors - Only report specific meaningful ones
    if (status >= 400 && status < 500) {
      // Report validation errors that indicate UX issues
      const reportable4xx = [400, 413, 415]; // Bad Request, Payload Too Large, Unsupported Media
      if (reportable4xx.includes(status) && !error.config?.skipAutoReport) {
        silentlyReportError(error, { endpoint, method });
      }
    }
    
    return Promise.reject(error);
  }
);

// ✅ Export helper: Manually report an error with custom context
// Use this in catch blocks when you want to report but handle UI yourself
export const reportError = (error, context = {}) => {
  silentlyReportError(error, { ...context, manual: true });
};

// ✅ Export helper: Disable auto-reporting for a specific request
// Use this for expected errors (e.g., "file not found" in search)
export const withoutAutoReport = (config) => ({
  ...config,
  skipAutoReport: true
});

export default api;