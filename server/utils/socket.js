// server/utils/socket.js - Real-Time Socket.io Setup
import { Server } from 'socket.io';
import { trackUserEvent } from './userTracker.js';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  const getAllowedOrigins = () => {
    const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174'];
    const rawUrl = process.env.FRONTEND_URL;
    if (!rawUrl) return defaultOrigins;
    
    const parsedOrigins = rawUrl.split(',').map(url => {
      return url.trim().replace(/['"]/g, '').replace(/\/$/, '');
    });
    return [...parsedOrigins, ...defaultOrigins];
  };

  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // ✅ Middleware: Attach user to socket from JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId}`);
    
    socket.join(`user:${socket.userId}`);
    socket.join('analytics:global');

    // 🎯 Track: User online
    trackUserEvent({
      userId: socket.userId,
      event: 'user:online',
      metadata: {
        socketId: socket.id,
        userAgent: socket.handshake.headers['user-agent'],
        ip: socket.handshake.address
      }
    });

    // 📥 Listen for client events
    socket.on('track:event', (data) => {
      trackUserEvent({
        userId: socket.userId,
        event: data.event,
        metadata: {
          ...data.metadata,
          sessionId: socket.id,
          timestamp: new Date().toISOString()
        }
      });
      
      io.to('analytics:global').emit('analytics:live-update', {
        userId: socket.userId,
        event: data.event,
        metadata: data.metadata,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('track:pageview', (data) => {
      trackUserEvent({
        userId: socket.userId,
        event: 'page:view',
        metadata: {
          path: data.path,
          title: data.title,
          referrer: data.referrer,
          timeOnPage: data.timeOnPage,
          sessionId: socket.id
        }
      });
    });

    socket.on('track:interaction', (data) => {
      trackUserEvent({
        userId: socket.userId,
        event: 'feature:interact',
        metadata: {
          feature: data.feature,
          action: data.action,
          element: data.element,
          value: data.value,
          duration: data.duration,
          sessionId: socket.id
        }
      });
    });

    socket.on('track:error', (data) => {
      trackUserEvent({
        userId: socket.userId,
        event: 'app:error',
        metadata: {
          message: data.message,
          stack: data.stack,
          component: data.component,
          severity: data.severity || 'warning',
          sessionId: socket.id
        }
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${socket.userId} (${reason})`);
      trackUserEvent({
        userId: socket.userId,
        event: 'user:offline',
        metadata: {
          reason,
          sessionDuration: Date.now() - (socket.connectedAt || Date.now()),
          socketId: socket.id
        }
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket first.');
  return io;
};