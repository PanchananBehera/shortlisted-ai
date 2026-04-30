import Application from '../models/Application.js';

// @desc    Get Dashboard Statistics
// @route   GET /api/analytics/dashboard-stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all applications for the user
    const applications = await Application.find({ userId });
    const total = applications.length;

    // 1. Status Breakdown (for Pie Chart)
    const statusCounts = applications.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // 2. Key Metrics
    const interviewCount = applications.filter(app => 
      app.status === 'Interview Scheduled' || app.status === 'HR Round'
    ).length;
    
    const offerCount = applications.filter(app => app.status === 'Offer Received').length;
    const rejectedCount = applications.filter(app => app.status === 'Rejected').length;

    const interviewRate = total > 0 ? Math.round((interviewCount / total) * 100) : 0;
    const offerRate = total > 0 ? Math.round((offerCount / total) * 100) : 0;

    // 3. Activity Trend (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentApps = applications.filter(app => new Date(app.dateApplied) >= thirtyDaysAgo);
    
    const trendData = recentApps.reduce((acc, curr) => {
      const date = new Date(curr.dateApplied).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const trendChartData = Object.entries(trendData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. Recent Applications (Last 5)
    const recentApplications = applications
      .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied))
      .slice(0, 5)
      .map(app => ({
        id: app._id,
        companyName: app.companyName,
        jobRole: app.jobRole,
        status: app.status,
        dateApplied: app.dateApplied,
      }));

    res.json({
      total,
      interviewCount,
      offerCount,
      rejectedCount,
      interviewRate,
      offerRate,
      statusData,
      trendChartData,
      recentApplications
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};