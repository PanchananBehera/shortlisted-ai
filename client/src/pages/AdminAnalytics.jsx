// client/src/pages/AdminAnalytics.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/axios';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [myActivity, setMyActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState({ feature: '', startDate: '', endDate: '' });

  useEffect(() => {
    fetchAll();
  }, [filter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filter).filter(([_, v]) => v))
      );
      const [adminRes, myRes] = await Promise.allSettled([
        api.get(`/admin/usage/analytics?${params}`),
        api.get('/admin/usage/my-activity?limit=30')
      ]);
      if (adminRes.status === 'fulfilled') setAnalytics(adminRes.value.data);
      if (myRes.status === 'fulfilled') setMyActivity(myRes.value.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const featureIcon = (f) => {
    const icons = { 'cover-letter': '📝', 'interview-qa': '🎯', 'resume-analysis': '📄', 'analyze-resume': '📄' };
    return icons[f] || '🤖';
  };

  const featureLabel = (f) => {
    const labels = { 'cover-letter': 'Cover Letter', 'interview-qa': 'Interview Prep', 'resume-analysis': 'Resume Analysis', 'analyze-resume': 'Resume Analysis' };
    return labels[f] || f;
  };

  const formatTime = (ms) => {
    if (!ms) return '—';
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const totalRequests = analytics?.stats?.reduce((s, x) => s + x.totalRequests, 0) || 0;
  const totalSuccess = analytics?.stats?.reduce((s, x) => s + x.successfulRequests, 0) || 0;
  const successRate = totalRequests > 0 ? Math.round((totalSuccess / totalRequests) * 100) : 0;
  const uniqueUsers = [...new Set(analytics?.recentLogs?.map(l => l.userId?.email).filter(Boolean))].length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">📊 User Tracking & Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor AI feature usage and user activity in real-time</p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition shadow-md"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total API Calls', value: totalRequests, icon: '⚡', color: 'from-blue-500 to-blue-600' },
            { label: 'Success Rate', value: `${successRate}%`, icon: '✅', color: 'from-green-500 to-green-600' },
            { label: 'Active Users', value: uniqueUsers, icon: '👥', color: 'from-purple-500 to-purple-600' },
            { label: 'Features Used', value: analytics?.stats?.length || 0, icon: '🛠️', color: 'from-amber-500 to-amber-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 p-5 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-lg mb-3`}>
                {kpi.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 pb-1">
          {[
            { id: 'overview', label: '📊 Feature Stats' },
            { id: 'activity', label: '🕒 Recent Activity' },
            { id: 'my', label: '👤 My Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium rounded-t-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feature Stats Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/50 dark:border-slate-800 flex flex-wrap gap-3 transition-colors">
              <select
                value={filter.feature}
                onChange={(e) => setFilter({ ...filter, feature: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm transition-colors"
              >
                <option value="">All Features</option>
                <option value="cover-letter">Cover Letters</option>
                <option value="interview-qa">Interview Prep</option>
                <option value="analyze-resume">Resume Analysis</option>
              </select>
              <input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm transition-colors" />
              <input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm transition-colors" />
              <button onClick={() => setFilter({ feature: '', startDate: '', endDate: '' })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                Clear
              </button>
            </div>

            {analytics?.stats?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.stats.map((stat) => {
                  const rate = Math.round((stat.successfulRequests / stat.totalRequests) * 100);
                  return (
                    <div key={stat._id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 p-6 transition-colors hover:shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{featureIcon(stat._id)}</span>
                        <h3 className="font-serif font-bold text-gray-900 dark:text-white">{featureLabel(stat._id)}</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Total Requests</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{stat.totalRequests}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Success Rate</span>
                          <span className={`font-semibold ${rate >= 80 ? 'text-green-600 dark:text-green-400' : rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{rate}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }}></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Avg Response</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatTime(stat.avgResponseTime)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Unique Users</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{stat.uniqueUsers?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p>No feature usage data yet. Start using AI tools to see stats here.</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-serif font-bold text-gray-900 dark:text-white">All User Activity Log</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last {analytics?.recentLogs?.length || 0} requests across all users</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr>
                    {['User', 'Feature', 'Company / Role', 'Status', 'Response Time', 'Date'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {analytics?.recentLogs?.length > 0 ? analytics.recentLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{log.userId?.fullName || log.userId?.name || '—'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{log.userId?.email || '—'}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {featureIcon(log.featureUsed)} {featureLabel(log.featureUsed)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{log.companyName || log.jobRole || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          log.success ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {log.success ? '✅ Success' : '❌ Failed'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{formatTime(log.responseTime)}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500">No activity logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* My Activity Tab */}
        {activeTab === 'my' && (
          <div className="space-y-6">
            {/* My Stats */}
            {myActivity?.stats?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {myActivity.stats.map((s) => (
                  <div key={s._id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 p-5 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{featureIcon(s._id)}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{featureLabel(s._id)}</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{s.count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">times used</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Last: {new Date(s.lastUsed).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* My Recent Logs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="p-5 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-serif font-bold text-gray-900 dark:text-white">My Recent AI Activity</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {myActivity?.logs?.length > 0 ? myActivity.logs.map((log) => (
                  <div key={log._id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{featureIcon(log.featureUsed)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{featureLabel(log.featureUsed)}</p>
                        {log.companyName && <p className="text-xs text-gray-500 dark:text-gray-400">{log.companyName}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        log.success ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {log.success ? '✅ Success' : '❌ Failed'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <p className="text-3xl mb-2">🤖</p>
                    <p>You haven't used any AI features yet. Try generating a cover letter!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;