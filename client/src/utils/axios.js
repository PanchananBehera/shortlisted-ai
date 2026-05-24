// src/utils/axios.js - FIXED: Prevents Login Loop + 429 Handling
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  withCredentials: true,
});

// ✅ Request Interceptor: Add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Response Interceptor: Handle errors globally (FIXED 401 LOOP)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // 🔴 401: Unauthorized - ONLY redirect if NOT on auth pages
    // This prevents the infinite login loop!
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/register';
      
      // Only clear token & redirect if user is NOT already on login/register
      if (!isAuthPage) {
        console.warn('🔐 Session expired or invalid token - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // If on auth page, let the component handle the error (don't redirect)
    }
    
    // 🟡 429: Rate Limited - Show friendly wait message
    if (error.response?.status === 429) {
      const data = error.response?.data;
      const retryAfter = data?.retryAfter || 60;
      const message = data?.error || 'Too many requests';
      const code = data?.code;
      
      console.warn(`⚠️ Rate Limited: ${message} (retry after ${retryAfter}s)`);
      
      // Dispatch custom event for components to listen
      window.dispatchEvent(new CustomEvent('ai-rate-limited', { 
        detail: { message, retryAfter, code } 
      }));
    }
    
    // 🔵 500: Server Error - Log for debugging
    if (error.response?.status === 500) {
      console.error('🔥 Server Error:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;