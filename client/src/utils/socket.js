// client/src/utils/socket.js - WebSocket Client with Auth
import { io } from 'socket.io-client';

let socket;

export const initSocket = (authToken) => {
  if (socket) return socket; // Prevent duplicate connections

  const socketUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws')?.replace('https', 'wss') 
    || 'ws://localhost:5000';

  socket = io(socketUrl, {
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('⚠️ Socket not initialized. Call initSocket first.');
    return null;
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ✅ Helper: Join interview room for real-time coaching
export const joinInterviewRoom = (sessionId) => {
  const socket = getSocket();
  if (socket && sessionId) {
    socket.emit('join-interview', sessionId);
    console.log(`👥 Joined interview room: ${sessionId}`);
  }
};

// ✅ Helper: Request real-time AI coaching hint
export const requestCoaching = (sessionId, transcript, currentQuestion) => {
  const socket = getSocket();
  if (socket && sessionId && transcript && currentQuestion) {
    socket.emit('request-coaching', { sessionId, transcript, currentQuestion });
  }
};

// ✅ Helper: Request tone/sentiment analysis
export const analyzeResponse = (sessionId, text) => {
  const socket = getSocket();
  if (socket && sessionId && text) {
    socket.emit('analyze-response', { sessionId, text });
  }
};

// ✅ Event listeners for coaching hints
export const onCoachingHint = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('coaching-hint', callback);
    return () => socket.off('coaching-hint', callback);
  }
};

export const onToneAnalysis = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('tone-analysis', callback);
    return () => socket.off('tone-analysis', callback);
  }
};

export const onCoachingError = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('coaching-error', callback);
    return () => socket.off('coaching-error', callback);
  }
};