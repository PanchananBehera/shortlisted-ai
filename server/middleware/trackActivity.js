// server/middleware/trackActivity.js - Auto-track API calls
import { trackUserEvent } from '../utils/userTracker.js';

export const trackAPIUsage = (featureName) => {
  return async (req, res, next) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next();

    const start = Date.now();
    
    // ✅ Track request start
    trackUserEvent({
      userId,
      event: 'api:request',
      metadata: {
        feature: featureName,
        path: req.path,
        method: req.method,
        query: req.query,
        bodySize: JSON.stringify(req.body)?.length || 0
      }
    });

    // ✅ Override res.json to track response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const duration = Date.now() - start;
      
      trackUserEvent({
        userId,
        event: data?.success ? 'api:success' : 'api:error',
        metadata: {
          feature: featureName,
          path: req.path,
          duration,
          statusCode: res.statusCode,
          responseSize: JSON.stringify(data)?.length || 0,
          error: data?.error || null
        }
      });
      
      return originalJson(data);
    };

    next();
  };
};