import Application from '../models/Application.js';
import mongoose from 'mongoose';

// @desc    Get dashboard stats, charts, and recent applications
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // 1. Get Basic Counts
    const total = await Application.countDocuments({ userId });
    const interviews = await Application.countDocuments({
      userId,
      status: { $in: ['Interview Scheduled', 'HR Round'] }
    });
    const offers = await Application.countDocuments({
      userId,
      status: 'Offer Received'
    });
    const rejected = await Application.countDocuments({
      userId,
      status: 'Rejected'
    });

    // 2. Get Status Distribution (for Pie Chart)
    const statusData = await Application.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId.toString()) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 3. Get Activity for Last 30 Days (for Bar Chart)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityData = await Application.aggregate([
      { $match: { 
          userId: new mongoose.Types.ObjectId(userId.toString()),
          createdAt: { $gte: thirtyDaysAgo } 
      }},
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // 4. Get Recent Applications
    const recentApplications = await Application.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('companyName jobRole status dateApplied');

    res.json({
      success: true,
      data: {
        stats: {
          total,
          interviews,
          offers,
          rejected
        },
        statusDistribution: statusData.map(item => ({
          name: item._id,
          value: item.count
        })),
        activity: activityData.map(item => ({
          date: item._id,
          count: item.count
        })),
        recentApplications
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get PacoBoard user analytics
// @route   GET /api/analytics/pacoboard
// @access  Private/Admin
export const getPacoBoardAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Import UserProgress model
    const UserProgress = (await import('../models/UserProgress.js')).default;
    const User = (await import('../models/User.js')).default;

    // Get users who accessed PacoBoard
    const pacoBoardUsers = await UserProgress.find({
      updatedAt: { $gte: startDate }
    })
    .populate('userId', 'name email jobTitle')
    .sort({ totalXP: -1 })
    .limit(50);

    // Format response
    const formattedUsers = pacoBoardUsers.map(user => ({
      userId: user.userId?._id,
      name: user.userId?.name,
      email: user.userId?.email,
      jobTitle: user.userId?.jobTitle,
      level: user.level,
      totalXP: user.totalXP,
      currentStreak: user.currentStreak,
      badgesEarned: user.badges?.length || 0,
      lastAccessed: user.updatedAt,
      interviewsCompleted: user.totalSessions
    }));

    // Summary stats
    const totalPacoBoardUsers = pacoBoardUsers.length;
    const avgLevel = pacoBoardUsers.reduce((sum, u) => sum + u.level, 0) / (totalPacoBoardUsers || 1);
    const avgXP = pacoBoardUsers.reduce((sum, u) => sum + u.totalXP, 0) / (totalPacoBoardUsers || 1);
    const topPerformer = formattedUsers[0] || null;

    res.json({
      success: true,
      users: formattedUsers,
      summary: {
        totalUsers: totalPacoBoardUsers,
        avgLevel: Math.round(avgLevel * 10) / 10,
        avgXP: Math.round(avgXP),
        topPerformer
      }
    });
  } catch (error) {
    console.error('PacoBoard Analytics Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch PacoBoard analytics' });
  }
};