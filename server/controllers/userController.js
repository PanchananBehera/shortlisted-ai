import UserProgress from '../models/UserProgress.js';
import User from '../models/User.js';

// ✅ Get user's gamification progress
export const getUserProgress = async (req, res) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.user._id });
    
    res.json(progress || { 
      currentStreak: 0, 
      longestStreak: 0, 
      totalXP: 0, 
      level: 1, 
      badges: [], 
      totalSessions: 0 
    });
  } catch (err) {
    console.error('Failed to fetch user progress:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

// ✅ Get global leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const { view = 'alltime' } = req.query; // weekly, monthly, alltime
    
    // Calculate date range based on view
    let dateFilter = {};
    if (view === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter = { updatedAt: { $gte: oneWeekAgo } };
    } else if (view === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter = { updatedAt: { $gte: oneMonthAgo } };
    }
    // alltime has no date filter

    // Get top users from UserProgress
    const leaderboardData = await UserProgress.find(dateFilter)
      .sort({ totalXP: -1 })
      .limit(50)
      .populate('userId', 'name email');

    // Format the response
    const formattedLeaderboard = leaderboardData.map(entry => ({
      userId: entry.userId?._id,
      name: entry.userId?.name || 'Anonymous User',
      email: entry.userId?.email,
      totalXP: entry.totalXP,
      level: entry.level,
      currentStreak: entry.currentStreak,
      badges: entry.badges || [],
      interviewsCompleted: entry.totalSessions || 0
    }));

    res.json(formattedLeaderboard);
  } catch (error) {
    console.error('Leaderboard Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leaderboard',
      message: error.message 
    });
  }
};