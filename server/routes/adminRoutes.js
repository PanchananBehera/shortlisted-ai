// server/routes/adminRoutes.js
import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import AIUsageLog from '../models/AIUsageLog.js';

const router = express.Router();

// ✅ Get usage analytics (admin only)
router.get('/usage/analytics', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate, feature, userId } = req.query;
    
    const filter = {};
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };
    if (feature) filter.featureUsed = feature;
    if (userId) filter.userId = userId;

    const stats = await AIUsageLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$featureUsed',
          totalRequests: { $sum: 1 },
          successfulRequests: { $sum: { $cond: ['$success', 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      }
    ]);

    const recentLogs = await AIUsageLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'fullName email')
      .select('-userAgent -ipAddress');

    res.json({
      success: true,
      stats,
      recentLogs,
      total: await AIUsageLog.countDocuments(filter)
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// ✅ Get usage for a specific user
router.get('/usage/my-activity', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;

    const logs = await AIUsageLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('featureUsed companyName jobRole success createdAt responseTime');

    const stats = await AIUsageLog.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$featureUsed',
          count: { $sum: 1 },
          lastUsed: { $max: '$createdAt' }
        }
      }
    ]);

    res.json({ success: true, logs, stats });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
});

// ✅ Get advanced analytics (accessible to all authenticated users)
router.get('/usage/advanced', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const filter = { createdAt: { $gte: startDate } };

    const allLogs = await AIUsageLog.find(filter).populate('userId', 'name email createdAt');

    // Calculate engagement metrics
    const userEngagement = {};
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = {};
    const featureDiscovery = {};

    allLogs.forEach(log => {
      const userId = log.userId?._id?.toString();
      const hour = new Date(log.createdAt).getHours();
      const day = new Date(log.createdAt).toDateString();
      const feature = log.featureUsed;

      if (!userId) {
        return;
      }

      // User engagement score
      if (!userEngagement[userId]) {
        userEngagement[userId] = {
          userId,
          email: log.userId?.email,
          name: log.userId?.name || log.userId?.email?.split('@')[0] || 'Unknown User',
          totalActions: 0,
          successfulActions: 0,
          featuresUsed: new Set(),
          lastActive: log.createdAt,
          sessionCount: 0,
          engagementScore: 0
        };
      }

      userEngagement[userId].totalActions++;
      if (log.success) userEngagement[userId].successfulActions++;
      userEngagement[userId].featuresUsed.add(feature);
      if (new Date(log.createdAt) > new Date(userEngagement[userId].lastActive)) {
        userEngagement[userId].lastActive = log.createdAt;
      }

      // Hourly activity
      hourlyActivity[hour]++;

      // Daily activity
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;

      // Feature discovery timeline
      if (!featureDiscovery[userId]) featureDiscovery[userId] = [];
      if (!featureDiscovery[userId].includes(feature)) {
        featureDiscovery[userId].push({ feature, discoveredAt: log.createdAt });
      }
    });

    Object.values(userEngagement).forEach(user => {
      const featuresScore = Math.min(user.featuresUsed.size * 20, 40); // Max 40 points
      const successRate = user.totalActions > 0 ? (user.successfulActions / user.totalActions) * 30 : 0; // Max 30 points
      const recencyScore = Math.max(0, 30 - (Date.now() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24)); // Last 30 days
      user.engagementScore = Math.round(featuresScore + successRate + recencyScore);
      user.featuresUsed = Array.from(user.featuresUsed);
      user.sessionCount = Math.ceil(user.totalActions / 5); // Estimate sessions
    });

    // Sort by engagement
    const topUsers = Object.values(userEngagement)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);

    // AI-Powered Insights — always generate all 4 cards with smart contextual messages
    const featureCounts = {};
    allLogs.forEach(log => {
      featureCounts[log.featureUsed] = (featureCounts[log.featureUsed] || 0) + 1;
    });
    const topFeature = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0];
    const errorRate = allLogs.length > 0 ? (allLogs.filter(l => !l.success).length / allLogs.length) : 0;
    const powerUsers = Object.values(userEngagement).filter(u => u.engagementScore >= 70);
    const usersWithSingleFeature = Object.values(userEngagement).filter(u => u.featuresUsed.length === 1).length;
    const totalUsersEngaged = Object.keys(userEngagement).length;

    // Card 2 — Error Rate (always, with positive spin if low)
    const insights = [
      {
        type: 'success',
        title: '🔥 Most Popular Feature',
        description: topFeature
          ? `"${topFeature[0].replace(/-/g, ' ')}" leads with ${topFeature[1]} uses this period`
          : 'No AI features used yet — share the app to get started!',
        action: topFeature ? 'Consider promoting this feature on the homepage' : 'Encourage users to try Resume Analyzer first'
      },

      {
        type: errorRate > 0.15 ? 'warning' : 'success',
        title: errorRate > 0.15 ? '⚠️ High Error Rate Detected' : '✅ System Health: Excellent',
        description: errorRate > 0.15
          ? `${(errorRate * 100).toFixed(1)}% of AI requests are failing — needs attention`
          : `Only ${(errorRate * 100).toFixed(1)}% error rate — all AI features running smoothly`,
        action: errorRate > 0.15 ? 'Check backend logs and Gemini API quota' : 'Keep monitoring as user base grows'
      },

      // Card 3 — Power Users (always)
      {
        type: 'info',
        title: powerUsers.length > 0 ? '🌟 Power Users Active' : '📈 Growing User Base',
        description: powerUsers.length > 0
          ? `${powerUsers.length} of ${totalUsersEngaged} users have 70+ engagement scores`
          : `${totalUsersEngaged} users active — nurture them into power users`,
        action: powerUsers.length > 0 ? 'Reach out for testimonials or beta features' : 'Send re-engagement emails to boost activity'
      },

      // Card 4 — Feature Adoption (always)
      {
        type: usersWithSingleFeature > totalUsersEngaged * 0.5 ? 'suggestion' : 'info',
        title: usersWithSingleFeature > totalUsersEngaged * 0.5 ? '💡 Feature Discovery Gap' : '🎯 Good Feature Adoption',
        description: usersWithSingleFeature > totalUsersEngaged * 0.5
          ? `${usersWithSingleFeature} users only use 1 feature — huge growth opportunity`
          : `Users are exploring multiple features — great cross-adoption!`,
        action: usersWithSingleFeature > totalUsersEngaged * 0.5
          ? 'Add in-app tooltips and feature discovery tours'
          : 'Keep adding features to maintain engagement momentum'
      }
    ];

    // Feature adoption funnel
    const totalUsersCount = Object.keys(userEngagement).length;
    const featureAdoption = [
      { stage: 'Registered', count: totalUsersCount },
      { stage: 'First Action', count: Object.values(userEngagement).filter(u => u.totalActions >= 1).length },
      { stage: 'Explored 2+ Features', count: Object.values(userEngagement).filter(u => u.featuresUsed.length >= 2).length },
      { stage: 'Power User', count: powerUsers.length },
    ];

    res.json({
      success: true,
      topUsers,
      hourlyActivity,
      dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({ date, count })),
      featureAdoption,
      insights,
      totalUsers: totalUsersCount,
      avgEngagementScore: Math.round(Object.values(userEngagement).reduce((sum, u) => sum + u.engagementScore, 0) / (totalUsersCount || 1)) || 0,
      errorRate
    });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch advanced analytics' });
  }
});

// ✅ Get real-time activity stream (accessible to all authenticated users)
router.get('/usage/activity-stream', protect, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await AIUsageLog.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name email');

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Activity stream error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity stream' });
  }
});

export default router;