// src/utils/socketClient.js - Frontend WebSocket Client
import { io } from 'socket.io-client';

let socket;

export const initSocketClient = (token, onConnect, onEvent) => {
  const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';
  
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('🔌 Connected to real-time tracking');
    onConnect?.(socket.id);
  });

  socket.on('analytics:live-update', (data) => {
    onEvent?.('live-update', data);
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Disconnected: ${reason}`);
  });

  return socket;
};

export const trackEvent = (event, metadata = {}) => {
  if (!socket?.connected) return;
  socket.emit('track:event', { event, metadata });
};

export const trackPageView = (path, title, referrer = document.referrer) => {
  if (!socket?.connected) return;
  socket.emit('track:pageview', { 
    path, 
    title, 
    referrer,
    timeOnPage: Date.now() - (window.pageLoadTime || Date.now())
  });
};

export const trackInteraction = (feature, action, element, value = null, duration = null) => {
  if (!socket?.connected) return;
  socket.emit('track:interaction', { 
    feature, 
    action, 
    element, 
    value, 
    duration,
    timestamp: new Date().toISOString()
  });
};

export const trackError = (message, stack, component, severity = 'warning') => {
  if (!socket?.connected) return;
  socket.emit('track:error', { 
    message, 
    stack, 
    component, 
    severity,
    timestamp: new Date().toISOString()
  });
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    console.log('🔌 Socket disconnected');
  }
};

// Set page load time for duration tracking
if (typeof window !== 'undefined') {
  window.pageLoadTime = Date.now();
}