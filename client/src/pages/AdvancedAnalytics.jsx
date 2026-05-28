// src/pages/AdvancedAnalytics.jsx - FINAL PRO VERSION WITH FIXES
import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../utils/axios';
import { useRealTime } from '../context/RealTimeContext';

const AdvancedAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  
  // ✅ Pro Tip #3: User search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // ✅ Real-time tracking integration
  const { liveStats, recentActivities, onEvent, isConnected } = useRealTime();
  const liveDataRef = useRef(null);

  // ✅ Listen for live analytics updates
  useEffect(() => {
    const cleanup = onEvent('live-update', (update) => {
      if (update.event?.includes('feature:')) {
        liveDataRef.current = update;
        if (activeTab === 'activity') {
          setData(prev => prev ? {
            ...prev,
            activity: [update, ...(prev.activity || [])].slice(0, 50)
          } : prev);
        }
      }
    });
    return cleanup;
  }, [onEvent, activeTab]);

  // ✅ Fetch historical data
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
        activity: activityRes.data.logs,
        liveStats: isConnected ? liveStats : null
      });
    } catch (err) {
      console.error('Failed to fetch analytics', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch advanced analytics data.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Computed live stats fallback (ensures dashboard is immediately alive upon load!)
  const computedErrorRate = useMemo(() => {
    if (isConnected && liveStats.errorRate > 0) return liveStats.errorRate;
    if (data?.advanced?.errorRate !== undefined) return data.advanced.errorRate;
    const logs = data?.activity || [];
    const failed = logs.filter(l => l.success === false).length;
    return logs.length > 0 ? failed / logs.length : 0;
  }, [liveStats.errorRate, data, isConnected]);

  const computedActiveUsers = useMemo(() => {
    if (isConnected && liveStats.activeUsers > 0) return liveStats.activeUsers;
    const logs = data?.activity || [];
    const unique = new Set(logs.map(l => l.userId?._id || l.userId || 'unknown')).size;
    return unique || 1;
  }, [liveStats.activeUsers, data, isConnected]);

  const computedEventsPerMin = useMemo(() => {
    if (isConnected && liveStats.eventsPerMinute > 0) return liveStats.eventsPerMinute;
    const logs = data?.activity || [];
    const oneHourAgo = Date.now() - 3600000;
    const recent = logs.filter(l => new Date(l.createdAt || l.timestamp).getTime() > oneHourAgo).length;
    return Math.round(recent / 60) || 1;
  }, [liveStats.eventsPerMinute, data, isConnected]);

  const computedAiAnalyses = useMemo(() => {
    const liveCount = recentActivities.filter(a => a.event === 'ai:resume-analysis' || a.event?.includes('resume')).length;
    const histCount = (data?.activity || []).filter(l => l.featureUsed === 'resume-analyzer' || l.event?.includes('resume')).length;
    return liveCount + histCount;
  }, [recentActivities, data]);

  // ✅ Debug: Log error rate and banner visibility
  useEffect(() => {
    console.log('🔍 Analytics Debug:', {
      computedErrorRate,
      liveStatsErrorRate: liveStats?.errorRate,
      advancedErrorRate: data?.advanced?.errorRate,
      shouldShowBanner: computedErrorRate > 0.1,
      totalActivities: data?.activity?.length || 0,
      failedActivities: data?.activity?.filter(a => a.success === false)?.length || 0
    });
  }, [computedErrorRate, liveStats, data]);

  // ✅ Pro Tip #1: Export to CSV function
  const exportToCSV = (activities, filename = 'analytics-export') => {
    if (!activities || activities.length === 0) {
      alert('No data to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Event',
      'Feature',
      'Status',
      'Response Time (ms)',
      'Target Role',
      'Company'
    ];

    // Format rows
    const rows = activities.map(item => {
      const event = item.event || item.featureUsed || 'unknown';
      const success = item.success !== false;
      const timestamp = item.createdAt || item.timestamp;
      const user = item.userId?.name || item.userId?.email?.split('@')[0] || 'Unknown';
      const email = item.userId?.email || 'N/A';
      const responseTime = item.responseTime || item.metadata?.duration || '-';
      const targetRole = item.companyName || item.jobRole || item.metadata?.targetRole || '-';
      const company = item.metadata?.companyName || '-';

      return [
        timestamp ? new Date(timestamp).toISOString() : '-',
        user,
        email,
        event,
        event.replace('-', ' '),
        success ? 'Success' : 'Failed',
        responseTime,
        targetRole,
        company
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    // Create CSV content
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${headers.join(',') ? filename : 'export'}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Exported ${activities.length} activities to CSV`);
  };

  // ✅ Memoized selector to get all failed activities across live and historical logs
  const failedActivities = useMemo(() => {
    const combined = [...(data?.activity || []), ...recentActivities];
    const seen = new Set();
    return combined
      .filter(item => item.success === false)
      .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
      .filter(item => {
        const key = `${item.userId?._id || item.userId}-${item.event || item.featureUsed}-${new Date(item.createdAt || item.timestamp).getTime()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 50);
  }, [data?.activity, recentActivities]);

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
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              AI-powered insights and real-time user behavior analytics
              <span className={`px-2 py-1 text-xs rounded-full ${
                isConnected 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {isConnected ? '🟢 Live' : '🟡 Syncing...'}
              </span>
            </p>
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

        {/* ✅ Pro Tip #2: Anomaly Alert Banner */}
        {computedErrorRate > 0.1 ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-400">High Error Rate Detected</p>
                <p className="text-sm text-slate-300">
                  Current error rate: <span className="font-bold">{(computedErrorRate * 100).toFixed(1)}%</span> 
                  {' '}(threshold: 10%)
                </p>
              </div>
            </div>
             <button 
              onClick={() => setShowErrorModal(true)}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition transform hover:scale-105 active:scale-95"
            >
              View Errors →
            </button>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-400">System Health Optimal</p>
                <p className="text-sm text-slate-300">
                  Error rate: <span className="font-bold">{(computedErrorRate * 100).toFixed(1)}%</span> 
                  {' '}(threshold: 10%)
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('activity')}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm transition"
            >
              View All Activity →
            </button>
          </div>
        )}

        {/* Live Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-2xl font-bold text-green-400">{computedActiveUsers}</div>
            <div className="text-xs text-slate-400">Active Now</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-2xl font-bold text-purple-400">{computedEventsPerMin}</div>
            <div className="text-xs text-slate-400">Events/Min</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-400">
              {computedAiAnalyses}
            </div>
            <div className="text-xs text-slate-400">AI Analyses</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-2xl font-bold text-amber-400">
              {(computedErrorRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">Error Rate</div>
          </div>
        </div>

        {/* AI Insights Cards */}
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
        {activeTab === 'overview' && (
          <OverviewTab 
            data={data?.advanced} 
            liveStats={liveStats} 
            onSelectUser={(email) => {
              setSearchQuery(email);
              setActiveTab('activity');
            }}
            onSelectStage={(stage) => {
              setSearchQuery(stage);
              setActiveTab('activity');
            }}
          />
        )}
        {activeTab === 'journey' && (
          <JourneyTab 
            data={data?.advanced} 
            onSelectUser={(email) => {
              setSearchQuery(email);
              setActiveTab('activity');
            }}
          />
        )}
        {activeTab === 'heatmap' && (
          <HeatmapTab 
            data={data?.advanced} 
            liveStats={liveStats} 
            onSelectHour={(hour) => {
              setSearchQuery(`${hour}:00`);
              setActiveTab('activity');
            }}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab 
            logs={data?.activity} 
            liveActivities={recentActivities} 
            isConnected={isConnected}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onExport={exportToCSV}
          />
        )}

      </div>

      {/* Error Modal overlay window */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setShowErrorModal(false)}>
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl shadow-red-500/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-pulse">🚨</span>
                <div>
                  <h3 className="text-xl font-bold text-red-400">System Error Intelligence</h3>
                  <p className="text-xs text-slate-400">Showing the latest {failedActivities.length} failed system activities</p>
                </div>
              </div>
              <button 
                onClick={() => setShowErrorModal(false)}
                className="text-slate-400 hover:text-white transition p-2 hover:bg-slate-800 rounded-full"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {failedActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-green-400 text-lg font-semibold">🟢 Zero Errors Detected</p>
                  <p className="text-sm mt-1 text-slate-500">All system services and AI pipelines are operating optimally.</p>
                </div>
              ) : (
                failedActivities.map((log, idx) => {
                  const event = log.event || log.featureUsed || 'unknown';
                  const timestamp = log.createdAt || log.timestamp;
                  const userName = log.userId?.name || log.userId?.email?.split('@')[0] || 'Unknown';
                  const userEmail = log.userId?.email || '';

                  return (
                    <div key={idx} className="p-4 bg-slate-950/40 border border-red-900/20 rounded-2xl space-y-3 hover:border-red-500/20 transition duration-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-white capitalize flex items-center gap-2">
                            {userName}
                            {userEmail && (
                              <span className="text-xs text-slate-400 font-normal">({userEmail})</span>
                            )}
                          </div>
                          <div className="text-xs text-red-400 mt-1 capitalize font-medium">
                            ❌ Failed Event: {event?.replace('-', ' ')}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {timestamp ? new Date(timestamp).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-red-300">Detailed Exception Stack:</div>
                        <p className="text-red-200 font-mono text-xs bg-red-950/30 p-3 rounded-lg border border-red-950/40 break-words leading-relaxed">
                          {log.errorMessage || log.error || 'General connection or AI API error occurred.'}
                        </p>
                      </div>
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="group">
                          <summary className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer outline-none select-none transition">
                            View context parameters
                          </summary>
                          <pre className="text-slate-400 text-[10px] bg-slate-950 p-2.5 rounded-lg overflow-x-auto border border-slate-900/60 mt-1.5 font-mono">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 flex justify-between bg-slate-950/40">
              <button
                onClick={() => exportToCSV(failedActivities, 'system-errors')}
                className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-300 border border-red-900/40 rounded-xl text-sm font-semibold transition"
              >
                📥 Export Errors to CSV
              </button>
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl text-sm font-semibold text-white transition shadow-lg shadow-red-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ Sub-Components

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

const OverviewTab = ({ data, liveStats, onSelectUser, onSelectStage }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Feature Adoption Funnel */}
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">🎪 Feature Adoption Funnel</h3>
      <div className="space-y-3">
        {data?.featureAdoption?.map((stage, idx) => (
          <div 
            key={idx}
            onClick={() => onSelectStage?.(stage.stage)}
            className="group cursor-pointer hover:bg-slate-800/40 p-3 rounded-xl transition-all duration-300 active:scale-[0.98]"
            title={`Click to filter activities by ${stage.stage}`}
          >
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300 transition group-hover:text-purple-300">{stage.stage}</span>
              <span className="text-white font-semibold">{stage.count}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 group-hover:scale-y-110"
                style={{ width: `${data?.featureAdoption?.[0]?.count ? (stage.count / (data.featureAdoption[0].count || 1)) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Top Users */}
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">🏆 Top Engaged Users</h3>
        {liveStats?.activeUsers > 0 && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {liveStats.activeUsers} online
          </span>
        )}
      </div>
      <div className="space-y-3">
        {data?.topUsers?.slice(0, 5)?.map((user, idx) => (
          <div 
            key={idx}
            onClick={() => onSelectUser?.(user.email || user.name)}
            className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-transparent hover:border-purple-500/20"
            title={`Click to view activity for ${user.name || user.email}`}
          >
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

const JourneyTab = ({ data, onSelectUser }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <h3 className="text-xl font-bold mb-6 text-white">🗺️ User Journey Map</h3>
    <div className="space-y-6">
      {data?.topUsers?.slice(0, 5).map((user, idx) => (
        <div 
          key={idx}
          onClick={() => onSelectUser?.(user.email || user.name)}
          className="border-l-2 border-purple-500 pl-6 py-3 cursor-pointer hover:bg-slate-800/30 rounded-r-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] border-y border-r border-transparent hover:border-slate-800"
          title={`Click to filter activities by ${user.name || user.email}`}
        >
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

const HeatmapTab = ({ data, liveStats, onSelectHour }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold">🔥 Hourly Activity Heatmap</h3>
      {liveStats?.eventsPerMinute > 0 && (
        <span className="text-xs text-purple-400">
          ⚡ {liveStats.eventsPerMinute} events/min live
        </span>
      )}
    </div>
    <div className="grid grid-cols-12 gap-2">
      {data?.hourlyActivity?.map((count, hour) => {
        const intensity = Math.min(count / 10, 1);
        return (
          <div 
            key={hour} 
            className="text-center group cursor-pointer"
            onClick={() => onSelectHour?.(hour)}
            title={`${hour}:00 - ${count} actions (Click to filter stream)`}
          >
            <div
              className="h-24 rounded-lg transition-all duration-300 group-hover:scale-105 group-hover:brightness-125 group-hover:shadow-lg group-hover:shadow-purple-500/20"
              style={{
                background: `linear-gradient(to top, rgba(168, 85, 247, ${intensity}), rgba(236, 72, 153, ${intensity}))`,
                opacity: 0.3 + intensity * 0.7
              }}
            />
            <div className="text-xs text-slate-400 mt-2 transition duration-300 group-hover:text-purple-400 font-semibold">{hour}:00</div>
          </div>
        );
      })}
    </div>
  </div>
);

// ✅ Enhanced ActivityTab with ALL Pro Tips
const ActivityTab = ({ logs, liveActivities, isConnected, searchQuery, onSearchChange, onExport }) => {
  const [expandedItem, setExpandedItem] = useState(null);

  // Merge and deduplicate activities
  const allActivities = useMemo(() => {
    const combined = [...(logs || []), ...(liveActivities || [])];
    const seen = new Set();
    return combined
      .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
      .filter(item => {
        const key = `${item.userId?._id || item.userId}-${item.event || item.featureUsed}-${new Date(item.createdAt || item.timestamp).getTime()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
  }, [logs, liveActivities]);

  // ✅ Pro Tip #3: Filter by search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return allActivities;
    
    const query = searchQuery.toLowerCase();
    return allActivities.filter(item => {
      // ✅ Allow filtering by success/failure status
      const success = item.success !== false;
      if (query === 'failed' || query === 'error') {
        if (!success) return true;
      } else if (query === 'success') {
        if (success) return true;
      }

      const userName = item.userId?.name?.toLowerCase() || '';
      const userEmail = item.userId?.email?.toLowerCase() || '';
      const event = (item.event || item.featureUsed || '').toLowerCase();
      const role = (item.companyName || item.jobRole || item.metadata?.targetRole || '').toLowerCase();
      
      return userName.includes(query) || 
             userEmail.includes(query) || 
             event.includes(query) || 
             role.includes(query);
    });
  }, [allActivities, searchQuery]);

  // ✅ Debug: Log when filter changes
  useEffect(() => {
    console.log('📊 Activity Filter Debug:', {
      searchQuery,
      totalActivities: allActivities.length,
      filteredCount: filteredActivities.length,
      failedCount: allActivities.filter(a => a.success === false).length
    });
  }, [searchQuery, allActivities, filteredActivities]);

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      {/* Header with Search & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">⚡ Real-Time Activity Stream</h3>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className={`px-2 py-1 rounded ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isConnected ? '🟢 Live' : '🟡 Historical'}
            </span>
            <span className="text-slate-400">
              {filteredActivities.length} of {allActivities.length} events
            </span>
            {searchQuery === 'failed' && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                🔴 Showing failed only
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* ✅ Pro Tip #3: Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search user, event, role..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 px-4 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* ✅ Pro Tip #1: Export Button */}
          <button
            onClick={() => onExport(filteredActivities, 'activity-export')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            title="Export filtered activities to CSV"
          >
            📥 Export CSV
          </button>
        </div>
      </div>
      
      {/* Activity List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {searchQuery === 'failed' ? (
              <div className="space-y-3">
                <p className="text-amber-400/80 text-lg">🔍 No failed activities found</p>
                <p className="text-sm text-slate-500">
                  Great news! There are no errors in the current time range.
                </p>
                <button 
                  onClick={() => onSearchChange('')}
                  className="text-purple-400 hover:underline text-sm"
                >
                  Clear filter and show all
                </button>
              </div>
            ) : searchQuery ? (
              <div>
                <p className="mb-2">No results for "{searchQuery}"</p>
                <button 
                  onClick={() => onSearchChange('')}
                  className="text-purple-400 hover:underline text-sm"
                >
                  Clear search
                </button>
              </div>
            ) : isConnected ? (
              'Waiting for activity...'
            ) : (
              'No activity logs found'
            )}
          </div>
        ) : (
          filteredActivities.map((log, idx) => {
            const event = log.event || log.featureUsed || 'unknown';
            const success = log.success !== false;
            const timestamp = log.createdAt || log.timestamp;
            const userName = log.userId?.name || log.userId?.email?.split('@')[0] || 'Unknown';
            const userEmail = log.userId?.email || '';
            const isLive = log.isLive || !log._id; // Live events won't have MongoDB _id
            
            const itemKey = `${log._id || log.id || timestamp}-${idx}`;
            const isExpanded = expandedItem === itemKey;

            return (
              <div 
                key={itemKey} 
                onClick={() => setExpandedItem(isExpanded ? null : itemKey)}
                className={`p-4 rounded-xl transition cursor-pointer ${
                  isLive ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-slate-800/50 hover:bg-slate-800'
                } ${!success ? 'border-l-4 border-l-red-500 hover:border-l-red-400' : 'hover:border-l-4 hover:border-l-green-500'} ${isExpanded ? 'ring-2 ring-purple-500/30 bg-slate-800/80' : ''}`}
                title="Click to view details/errors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Live indicator */}
                    {isLive && (
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-ping" title="Live event" />
                    )}
                    <div className={`w-3 h-3 rounded-full ${success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-semibold text-white capitalize flex items-center gap-2">
                        {userName}
                        {userEmail && (
                          <span className="text-xs text-slate-400 font-normal">({userEmail})</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        {event?.replace('-', ' ')} • {log.companyName || log.jobRole || log.metadata?.targetRole || 'General'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {timestamp ? new Date(timestamp).toLocaleString() : 'Just now'}
                        {isLive && <span className="ml-2 text-purple-400">• Live</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {success ? '✅ Success' : '❌ Failed'}
                    </span>
                    <span className="text-sm text-slate-400 min-w-[80px] text-right">
                      {log.responseTime || log.metadata?.duration ? `${log.responseTime || log.metadata.duration}ms` : '-'}
                    </span>
                    <span className="text-slate-500 text-xs transition duration-300 transform">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Detailed view (error messages / metadata) */}
                {isExpanded && (
                  <div 
                    className="mt-4 pt-4 border-t border-slate-700/50 text-sm space-y-3 animate-fade-in"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inner content
                  >
                    {!success && (
                      <div className="space-y-1.5">
                        <span className="text-red-400 font-semibold flex items-center gap-1">
                          ⚠️ Error Details:
                        </span>
                        <p className="text-red-200 font-mono text-xs bg-red-950/40 p-3 rounded-lg border border-red-900/30 break-words leading-relaxed">
                          {log.errorMessage || log.error || 'Unknown server error occurred.'}
                        </p>
                      </div>
                    )}
                    
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="space-y-1">
                        <span className="text-slate-300 font-semibold">Activity Metadata:</span>
                        <pre className="text-slate-400 text-xs bg-slate-950/50 p-3 rounded-lg overflow-x-auto border border-slate-800 font-mono">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap justify-between text-xs text-slate-500 gap-2 pt-2 border-t border-slate-800/40">
                      <span>User Reference ID: {log.userId?._id || log.userId || 'N/A'}</span>
                      {timestamp && <span>Log Timestamp: {new Date(timestamp).toISOString()}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer actions */}
      {filteredActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Showing {filteredActivities.length} events</span>
          <button
            onClick={() => onExport(filteredActivities, `activity-${new Date().toISOString().split('T')[0]}`)}
            className="text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
          >
            📥 Export visible
          </button>
        </div>
      )}
    </div>
  );
};

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