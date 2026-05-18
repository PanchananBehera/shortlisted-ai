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

    // Aggregate stats
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

    // Recent activity
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

// ✅ Get usage for a specific user (for user dashboard)
router.get('/usage/my-activity', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;

    const logs = await AIUsageLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('featureUsed companyName jobRole success createdAt responseTime');

    // Simple stats for the user
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

    res.json({
      success: true,
      logs,
      stats
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
});

export default router;