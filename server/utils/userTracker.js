// server/utils/userTracker.js - Intelligent User Tracking
import UserActivity from '../models/UserActivity.js';

const eventBuffer = new Map();
const BATCH_INTERVAL = 5000;
const MAX_BATCH_SIZE = 20;

const dedupeKey = (userId, event, metadata) => {
  return `${userId}:${event}:${JSON.stringify(metadata).slice(0, 100)}`;
};

export const trackUserEvent = async ({ userId, event, metadata = {} }) => {
  if (!userId) return;
  
  const key = dedupeKey(userId, event, metadata);
  
  if (eventBuffer.has(key) && Date.now() - eventBuffer.get(key) < 2000) {
    return;
  }
  eventBuffer.set(key, Date.now());

  const batch = eventBuffer.get('BATCH') || [];
  batch.push({ userId, event, metadata, timestamp: new Date() });
  eventBuffer.set('BATCH', batch);

  if (batch.length >= MAX_BATCH_SIZE) {
    await flushEventBatch();
  }
};

export const flushEventBatch = async () => {
  const batch = eventBuffer.get('BATCH') || [];
  if (batch.length === 0) return;

  try {
    await UserActivity.insertMany(batch.map(item => ({
      userId: item.userId,
      event: item.event,
      metadata: item.metadata,
      timestamp: item.timestamp,
      processed: false
    })));

    eventBuffer.delete('BATCH');
    console.log(`✅ Flushed ${batch.length} tracking events`);
    
  } catch (error) {
    console.error('❌ Failed to flush tracking events:', error);
  }
};

export const startTrackingService = () => {
  setInterval(flushEventBatch, BATCH_INTERVAL);
  console.log('🔄 User tracking service started (batch interval: 5s)');
};

export const getUserInsights = async (userId, timeRange = '1h') => {
  const now = new Date();
  const ranges = {
    '1h': new Date(now - 60 * 60 * 1000),
    '24h': new Date(now - 24 * 60 * 60 * 1000),
    '7d': new Date(now - 7 * 24 * 60 * 60 * 1000)
  };
  const since = ranges[timeRange] || ranges['1h'];

  const activities = await UserActivity.find({
    userId,
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 }).limit(100);

  const insights = {
    sessionCount: activities.filter(a => a.event === 'user:online').length,
    featuresUsed: [...new Set(
      activities
        .filter(a => a.event === 'feature:interact')
        .map(a => a.metadata.feature)
    )],
    topActions: activities
      .filter(a => a.event === 'feature:interact')
      .reduce((acc, curr) => {
        const key = `${curr.metadata.feature}:${curr.metadata.action}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    timeOnPlatform: activities
      .filter(a => a.event === 'page:view')
      .reduce((sum, a) => sum + (a.metadata.timeOnPage || 0), 0),
    errors: activities
      .filter(a => a.event === 'app:error')
      .map(a => ({ message: a.metadata.message, severity: a.metadata.severity }))
  };

  return { activities, insights };
};

export const getGlobalAnalytics = async (limit = 50) => {
  const recent = await UserActivity.find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('userId event metadata timestamp');

  const stats = {
    activeUsers: new Set(recent
      .filter(a => a.event === 'user:online')
      .map(a => a.userId)
    ).size,
    eventsPerMinute: recent.filter(a => {
      const age = Date.now() - new Date(a.timestamp);
      return age < 60000;
    }).length,
    topFeatures: recent
      .filter(a => a.event === 'feature:interact')
      .reduce((acc, curr) => {
        const feature = curr.metadata.feature;
        acc[feature] = (acc[feature] || 0) + 1;
        return acc;
      }, {}),
    errorRate: recent.length > 0 
      ? recent.filter(a => a.event === 'app:error').length / recent.length 
      : 0
  };

  return { recent, stats };
};