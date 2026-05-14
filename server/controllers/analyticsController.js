import Application from '../models/Application.js';
import mongoose from 'mongoose';

// @desc    Get dashboard stats, charts, and recent applications
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

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
      { $match: { userId: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 3. Get Activity for Last 30 Days (for Bar Chart)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityData = await Application.aggregate([
      { $match: { 
          userId: userObjectId,
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