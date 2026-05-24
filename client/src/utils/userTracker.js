// server/utils/userTracker.js - Intelligent User Tracking
import UserActivity from '../models/UserActivity.js';
import { getIO } from './socket.js';

// ✅ Event batching: Buffer events to reduce DB writes
const eventBuffer = new Map();
const BATCH_INTERVAL = 5000; // 5 seconds
const MAX_BATCH_SIZE = 20;

// ✅ Smart event deduplication
const dedupeKey = (userId, event, metadata) => {
  return `${userId}:${event}:${JSON.stringify(metadata).slice(0, 100)}`;
};

// ✅ Track a user event (with batching & deduplication)
export const trackUserEvent = async ({ userId, event, metadata = {} }) => {
  const key = dedupeKey(userId, event, metadata);
  
  // Skip if duplicate within 2 seconds
  if (eventBuffer.has(key) && Date.now() - eventBuffer.get(key) < 2000) {
    return;
  }
  eventBuffer.set(key, Date.now());

  // Add to batch buffer
  const batch = eventBuffer.get('BATCH') || [];
  batch.push({ userId, event, metadata, timestamp: new Date() });
  eventBuffer.set('BATCH', batch);

  // Flush if batch is full
  if (batch.length >= MAX_BATCH_SIZE) {
    await flushEventBatch();
  }
};

// ✅ Flush batched events to database
export const flushEventBatch = async () => {
  const batch = eventBuffer.get('BATCH') || [];
  if (batch.length === 0) return;

  try {
    // ✅ Bulk insert for performance
    await UserActivity.insertMany(batch.map(item => ({
      userId: item.userId,
      event: item.event,
      metadata: item.metadata,
      timestamp: item.timestamp,
      processed: false
    })));

    // ✅ Clear buffer
    eventBuffer.delete('BATCH');
    console.log(`✅ Flushed ${batch.length} tracking events`);
    
  } catch (error) {
    console.error('❌ Failed to flush tracking events:', error);
    // Keep events in buffer for retry on next flush
  }
};

// ✅ Start auto-flush interval
export const startTrackingService = () => {
  setInterval(flushEventBatch, BATCH_INTERVAL);
  console.log('🔄 User tracking service started (batch interval: 5s)');
};

// ✅ Get real-time user insights (for dashboard)
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

  // ✅ Compute smart insights
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

// ✅ Get global real-time analytics (admin)
export const getGlobalAnalytics = async (limit = 50) => {
  const recent = await UserActivity.find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('userId event metadata timestamp');

  // ✅ Aggregate live stats
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
    errorRate: recent.filter(a => a.event === 'app:error').length / recent.length
  };

  return { recent, stats };
};