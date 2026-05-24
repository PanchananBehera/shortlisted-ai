// client/src/hooks/useRealTimeTrack.js - Smart Tracking Hook
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  initSocketClient, 
  trackEvent, 
  trackPageView, 
  trackInteraction, 
  trackError,
  disconnectSocket 
} from '../utils/socketClient';

export const useRealTimeTrack = (options = {}) => {
  const { autoTrackPageViews = true, autoTrackErrors = true } = options;
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const pageLoadTime = useRef(Date.now());
  const eventListeners = useRef(new Map());

  // ✅ Initialize socket on auth
  useEffect(() => {
    if (!token || !user) return;

    socketRef.current = initSocketClient(
      token,
      (socketId) => {
        console.log('🔌 Real-time tracking active');
        // Track session start
        trackEvent('session:start', { userId: user._id });
      },
      (eventType, data) => {
        // ✅ Notify registered listeners
        eventListeners.current.get(eventType)?.forEach(cb => cb(data));
      }
    );

    return () => {
      // Track session end
      trackEvent('session:end', { 
        userId: user._id,
        duration: Date.now() - pageLoadTime.current 
      });
      disconnectSocket();
    };
  }, [token, user]);

  // ✅ Auto-track page views
  useEffect(() => {
    if (!autoTrackPageViews || !socketRef.current?.connected) return;

    const trackCurrentPage = () => {
      trackPageView(
        window.location.pathname,
        document.title,
        document.referrer
      );
    };

    // Track initial load
    trackCurrentPage();

    // Track navigation (for SPA)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(trackCurrentPage, 100); // Wait for render
    };

    return () => {
      history.pushState = originalPushState;
    };
  }, [autoTrackPageViews]);

  // ✅ Auto-track errors
  useEffect(() => {
    if (!autoTrackErrors || !socketRef.current?.connected) return;

    const handleError = (event) => {
      trackError(
        event.message || event.error?.message || 'Unknown error',
        event.stack || event.error?.stack,
        event.component || 'global',
        event.severity || 'error'
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (e) => {
      handleError({ message: e.reason?.message || 'Unhandled promise rejection', error: e.reason });
    });

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [autoTrackErrors]);

  // ✅ Register listener for real-time events
  const onLiveUpdate = useCallback((eventType, callback) => {
    if (!eventListeners.current.has(eventType)) {
      eventListeners.current.set(eventType, []);
    }
    eventListeners.current.get(eventType).push(callback);
    
    return () => {
      const listeners = eventListeners.current.get(eventType) || [];
      eventListeners.current.set(eventType, listeners.filter(cb => cb !== callback));
    };
  }, []);

  // ✅ Expose tracking functions
  return {
    trackEvent: (event, metadata) => trackEvent(event, { ...metadata, userId: user?._id }),
    trackInteraction: (feature, action, element, value, duration) => 
      trackInteraction(feature, action, element, value, duration),
    onLiveUpdate,
    isConnected: socketRef.current?.connected || false
  };
};