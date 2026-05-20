import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import AIUsageLog from './models/AIUsageLog.js';

const runTest = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const filter = { createdAt: { $gte: startDate } };

    console.log('1. Fetching all logs and populating...');
    const allLogs = await AIUsageLog.find(filter).populate('userId', 'fullName email createdAt');
    console.log(`Found ${allLogs.length} logs.`);

    // Calculate engagement metrics
    const userEngagement = {};
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = {};
    const featureDiscovery = {};

    console.log('2. Processing logs...');
    allLogs.forEach(log => {
      const userId = log.userId?._id?.toString();
      const hour = new Date(log.createdAt).getHours();
      const day = new Date(log.createdAt).toDateString();
      const feature = log.featureUsed;

      if (!userId) {
        console.log('⚠️ Skipping log without userId:', log._id);
        return;
      }

      // User engagement score
      if (!userEngagement[userId]) {
        userEngagement[userId] = {
          userId,
          email: log.userId?.email,
          name: log.userId?.fullName,
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

    console.log('3. Calculating engagement scores...');
    Object.values(userEngagement).forEach(user => {
      const featuresScore = Math.min(user.featuresUsed.size * 20, 40); // Max 40 points
      const successRate = (user.successfulActions / user.totalActions) * 30; // Max 30 points
      const recencyScore = Math.max(0, 30 - (Date.now() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24)); // Last 30 days
      user.engagementScore = Math.round(featuresScore + successRate + recencyScore);
      user.featuresUsed = Array.from(user.featuresUsed);
      user.sessionCount = Math.ceil(user.totalActions / 5); // Estimate sessions
    });

    // Sort by engagement
    const topUsers = Object.values(userEngagement)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);

    // AI-Powered Insights
    console.log('4. Generating AI insights...');
    const insights = generateAIInsights(allLogs, userEngagement, featureDiscovery);

    // Feature adoption funnel
    const featureAdoption = [
      { stage: 'Registered', count: Object.keys(userEngagement).length },
      { stage: 'First Action', count: Object.values(userEngagement).filter(u => u.totalActions >= 1).length },
      { stage: 'Explored 2+ Features', count: Object.values(userEngagement).filter(u => u.featuresUsed.length >= 2).length },
      { stage: 'Power User', count: Object.values(userEngagement).filter(u => u.engagementScore >= 70).length },
    ];

    const result = {
      success: true,
      topUsers,
      hourlyActivity,
      dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({ date, count })),
      featureAdoption,
      insights,
      totalUsers: Object.keys(userEngagement).length,
      avgEngagementScore: Math.round(Object.values(userEngagement).reduce((sum, u) => sum + u.engagementScore, 0) / Object.keys(userEngagement).length) || 0
    };

    console.log('🎉 Advanced Analytics runs perfectly!');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
};

function generateAIInsights(logs, userEngagement, featureDiscovery) {
  const insights = [];
  
  // Most popular feature
  const featureCounts = {};
  logs.forEach(log => {
    featureCounts[log.featureUsed] = (featureCounts[log.featureUsed] || 0) + 1;
  });
  const topFeature = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0];
  if (topFeature) {
    insights.push({
      type: 'success',
      title: `🔥 Most Popular Feature`,
      description: `${topFeature[0].replace('-', ' ')} is your most used feature with ${topFeature[1]} uses`,
      action: 'Consider promoting this feature on the homepage'
    });
  }

  // Error rate alert
  const errorRate = logs.length > 0 ? (logs.filter(l => !l.success).length / logs.length * 100) : 0;
  if (errorRate > 15) {
    insights.push({
      type: 'warning',
      title: '⚠️ High Error Rate',
      description: `${errorRate.toFixed(1)}% of requests are failing`,
      action: 'Check backend logs and error handling'
    });
  }

  // Power users
  const powerUsers = Object.values(userEngagement).filter(u => u.engagementScore >= 70);
  if (powerUsers.length > 0) {
    insights.push({
      type: 'info',
      title: '🌟 Power Users Detected',
      description: `${powerUsers.length} users have engagement scores above 70`,
      action: 'Reach out for testimonials or beta features'
    });
  }

  // Feature discovery gap
  const usersWithSingleFeature = Object.values(userEngagement).filter(u => u.featuresUsed.length === 1).length;
  if (usersWithSingleFeature > Object.keys(userEngagement).length * 0.5) {
    insights.push({
      type: 'suggestion',
      title: '💡 Feature Adoption Opportunity',
      description: `${usersWithSingleFeature} users only use 1 feature`,
      action: 'Add in-app tours to encourage feature discovery'
    });
  }

  return insights;
}

runTest();
