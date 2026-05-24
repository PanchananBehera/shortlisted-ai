// src/context/RealTimeContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  initSocketClient, 
  trackEvent, 
  trackPageView, 
  trackInteraction, 
  trackError,
  disconnectSocket 
} from '../utils/socketClient';

const RealTimeContext = createContext(null);

export const RealTimeProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [connectionState, setConnectionState] = useState('disconnected');
  const [liveStats, setLiveStats] = useState({
    activeUsers: 0,
    eventsPerMinute: 0,
    topFeatures: {},
    errorRate: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const eventListeners = useMemo(() => new Map(), []);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) {
      setConnectionState('disconnected');
      return;
    }

    socketRef.current = initSocketClient(
      token,
      () => {
        setConnectionState('connected');
        trackEvent('session:start', { userId: user._id, page: window.location.pathname });
      },
      (eventType, data) => {
        if (eventType === 'live-update') {
          setRecentActivities(prev => {
            const newActivity = { id: `${data.userId?._id || data.userId || 'unknown'}-${Date.now()}`, ...data, isLive: true };
            const updated = [newActivity, ...prev].slice(0, 50);
            
            // Calculate real-time stats from stream
            const activeUsers = new Set(updated.map(a => a.userId?._id || a.userId || 'unknown')).size;
            const now = Date.now();
            const eventsLastMin = updated.filter(a => (now - new Date(a.createdAt || a.timestamp || now).getTime()) < 60000).length;
            
            const totalEvents = updated.length;
            const errorEvents = updated.filter(a => a.event === 'app:error' || a.success === false).length;
            const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) : 0;
            
            setLiveStats({
              activeUsers: Math.max(activeUsers, 1),
              eventsPerMinute: Math.max(eventsLastMin, 1),
              topFeatures: {},
              errorRate
            });
            
            return updated;
          });
        }
        eventListeners.get(eventType)?.forEach(cb => cb(data));
      }
    );

    const statsInterval = setInterval(() => {
      setLiveStats(prev => ({ ...prev, eventsPerMinute: 0 }));
    }, 60000);

    return () => {
      clearInterval(statsInterval);
      trackEvent('session:end', { 
        userId: user._id, 
        page: window.location.pathname,
        duration: Date.now() - (window.pageLoadTime || Date.now())
      });
      disconnectSocket();
      setConnectionState('disconnected');
    };
  }, [token, user, eventListeners]);

  const onEvent = (eventType, callback) => {
    if (!eventListeners.has(eventType)) {
      eventListeners.set(eventType, []);
    }
    eventListeners.get(eventType).push(callback);
    
    return () => {
      const listeners = eventListeners.get(eventType) || [];
      eventListeners.set(eventType, listeners.filter(cb => cb !== callback));
    };
  };

  const value = {
    connectionState,
    liveStats,
    recentActivities,
    trackEvent: (event, metadata) => trackEvent(event, { ...metadata, userId: user?._id }),
    trackPageView: (path, title) => trackPageView(path, title),
    trackInteraction: (feature, action, element, value, duration) => 
      trackInteraction(feature, action, element, value, duration),
    trackError: (message, stack, component, severity) => 
      trackError(message, stack, component, severity),
    onEvent,
    isConnected: connectionState === 'connected'
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within RealTimeProvider');
  }
  return context;
};