import React, { useState, useEffect } from 'react';
import api from '../utils/axios';

const AdvancedAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [advancedRes, activityRes] = await Promise.all([
        api.get(`/admin/usage/advanced?days=${timeRange}`),
        api.get('/admin/usage/activity-stream?limit=20')
      ]);
      setData({
        advanced: advancedRes.data,
        activity: activityRes.data.logs
      });
    } catch (err) {
      console.error('Failed to fetch analytics', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch advanced analytics data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} retry={fetchData} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎯 Advanced User Intelligence
            </h1>
            <p className="text-slate-400 mt-2">AI-powered insights and real-time user behavior analytics</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={fetchData}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-medium transition shadow-lg shadow-purple-500/30"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* AI Insights Cards — always 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data?.advanced?.insights || []).map((insight, idx) => (
            <InsightCard key={idx} insight={insight} />
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon="👥"
            label="Total Users"
            value={data?.advanced?.totalUsers || 0}
            gradient="from-blue-500 to-cyan-500"
          />
          <MetricCard
            icon="⭐"
            label="Avg Engagement"
            value={`${data?.advanced?.avgEngagementScore || 0}/100`}
            gradient="from-purple-500 to-pink-500"
          />
          <MetricCard
            icon="🔥"
            label="Power Users"
            value={data?.advanced?.topUsers?.filter(u => u.engagementScore >= 70)?.length || 0}
            gradient="from-orange-500 to-red-500"
          />
          <MetricCard
            icon="📊"
            label="Features Used"
            value={data?.advanced?.featureAdoption?.[3]?.count || 0}
            gradient="from-green-500 to-emerald-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800">
          {['overview', 'journey', 'heatmap', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 font-medium capitalize transition ${
                activeTab === tab
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab data={data?.advanced} />}
        {activeTab === 'journey' && <JourneyTab data={data?.advanced} />}
        {activeTab === 'heatmap' && <HeatmapTab data={data?.advanced} />}
        {activeTab === 'activity' && <ActivityTab logs={data?.activity} />}

      </div>
    </div>
  );
};

// Sub-Components

const InsightCard = ({ insight }) => {
  const colors = {
    success: 'from-green-600 to-emerald-600',
    warning: 'from-amber-600 to-orange-600',
    info: 'from-blue-600 to-cyan-600',
    suggestion: 'from-purple-600 to-pink-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[insight.type]} p-5 rounded-2xl shadow-xl`}>
      <h3 className="font-bold text-lg mb-2">{insight.title}</h3>
      <p className="text-white/90 text-sm mb-3">{insight.description}</p>
      <p className="text-white/70 text-xs bg-white/20 px-3 py-2 rounded-lg inline-block">
        💡 {insight.action}
      </p>
    </div>
  );
};

const MetricCard = ({ icon, label, value, gradient }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm">
    <div className="text-3xl mb-2">{icon}</div>
    <div className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
      {value}
    </div>
    <div className="text-slate-400 text-sm mt-1">{label}</div>
  </div>
);

const OverviewTab = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Feature Adoption Funnel */}
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">🎪 Feature Adoption Funnel</h3>
      <div className="space-y-3">
        {data?.featureAdoption?.map((stage, idx) => (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">{stage.stage}</span>
              <span className="text-white font-semibold">{stage.count}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${data?.featureAdoption?.[0]?.count ? (stage.count / (data.featureAdoption[0].count || 1)) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Top Users */}
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">🏆 Top Engaged Users</h3>
      <div className="space-y-3">
        {data?.topUsers?.slice(0, 5)?.map((user, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="font-semibold">{user.name || user.email}</div>
                <div className="text-xs text-slate-400">{user?.featuresUsed?.length || 0} features used</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">{user.engagementScore}</div>
              <div className="text-xs text-slate-400">score</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
const JourneyTab = ({ data }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <h3 className="text-xl font-bold mb-6 text-white">🗺️ User Journey Map</h3>
    <div className="space-y-6">
      {data?.topUsers?.slice(0, 5).map((user, idx) => (
        <div key={idx} className="border-l-2 border-purple-500 pl-6 py-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg text-white">
                {user.name !== 'Unknown User' ? user.name : user.email}
              </div>
              <div className="text-sm text-slate-400">{user.email}</div>
              <div className="text-sm text-slate-400">Engagement Score: {user.engagementScore}/100</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {user.featuresUsed.map((feature, fidx) => (
              <span key={fidx} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                {feature.replace('-', ' ')}
              </span>
            ))}
          </div>
          <div className="text-sm text-slate-400">
            {user.totalActions} actions • {user.sessionCount} sessions • Last active {new Date(user.lastActive).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HeatmapTab = ({ data }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <h3 className="text-xl font-bold mb-6">🔥 Hourly Activity Heatmap</h3>
    <div className="grid grid-cols-12 gap-2">
      {data?.hourlyActivity?.map((count, hour) => {
        const intensity = Math.min(count / 10, 1);
        return (
          <div key={hour} className="text-center">
            <div
              className="h-24 rounded-lg transition-all duration-300"
              style={{
                background: `linear-gradient(to top, rgba(168, 85, 247, ${intensity}), rgba(236, 72, 153, ${intensity}))`,
                opacity: 0.3 + intensity * 0.7
              }}
              title={`${hour}:00 - ${count} actions`}
            />
            <div className="text-xs text-slate-400 mt-2">{hour}:00</div>
          </div>
        );
      })}
    </div>
  </div>
);
const ActivityTab = ({ logs }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <h3 className="text-xl font-bold mb-6 text-white">⚡ Real-Time Activity Stream</h3>
    <div className="space-y-3">
      {logs?.map((log, idx) => (
        <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <div>
              <div className="font-semibold text-white capitalize">
                {log.userId?.name || log.userId?.email?.split('@')[0] || 'Unknown'}
              </div>
              <div className="text-sm text-slate-400">
                {log.featureUsed.replace('-', ' ')} • {log.companyName || log.jobRole || 'General'}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              log.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {log.success ? '✅ Success' : '❌ Failed'}
            </span>
            <span className="text-sm text-slate-400">{log.responseTime}ms</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
      <p className="text-slate-400">Loading intelligence...</p>
    </div>
  </div>
);

const ErrorScreen = ({ error, retry }) => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-md text-center space-y-6">
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-red-500/5 animate-pulse">
        ⚠️
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          Connection Failed
        </h2>
        <p className="text-slate-400 text-sm">
          {error.includes('403') || error.includes('401')
            ? 'You do not have administrative privileges to access this analytics dashboard.'
            : error}
        </p>
      </div>
      <button
        onClick={retry}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-medium transition shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98]"
      >
        🔄 Retry Connection
      </button>
    </div>
  </div>
);

export default AdvancedAnalytics;