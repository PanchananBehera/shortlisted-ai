// src/pages/AdvancedAnalytics.jsx - PHASE 3 + EMAIL FEATURE
import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../utils/axios';
import { useRealTime } from '../context/RealTimeContext';
import { useAuth } from '../context/AuthContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdvancedAnalytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // Interview History
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  
  // Session Comparison State
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // ✅ NEW: Email Feature State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const { liveStats, recentActivities, onEvent, isConnected } = useRealTime();
  const liveDataRef = useRef(null);

  // Listen for live updates
  useEffect(() => {
    const cleanup = onEvent('live-update', (update) => {
      if (update.event?.includes('feature:')) {
        liveDataRef.current = update;
        if (activeTab === 'activity') {
          setData(prev => prev ? { ...prev, activity: [update, ...(prev.activity || [])].slice(0, 50) } : prev);
        }
      }
    });
    return cleanup;
  }, [onEvent, activeTab]);

  // Fetch data
  useEffect(() => {
    fetchData();
    if (user?._id) fetchInterviewHistory();
  }, [timeRange, user]);

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

  const fetchInterviewHistory = async () => {
    if (!user?._id) return;
    setInterviewLoading(true);
    try {
      const res = await api.get('/ai/interview/history');
      if (res.data.success) setInterviewHistory(res.data.sessions);
    } catch (err) {
      console.error('Failed to fetch interview history:', err);
    } finally {
      setInterviewLoading(false);
    }
  };

  // 📈 CHART DATA PREPARATION
  const chartData = useMemo(() => {
    if (!interviewHistory.length) return [];
    return [...interviewHistory]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((session, idx) => ({
        name: `Session ${idx + 1}`,
        score: session.overallScore || 0,
        date: new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        role: session.targetRole || 'Unknown'
      }));
  }, [interviewHistory]);

  // 📊 PERFORMANCE METRICS
  const performanceMetrics = useMemo(() => {
    if (!interviewHistory.length) return null;
    const scores = interviewHistory.map(s => s.overallScore || 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    const totalSessions = interviewHistory.length;
    const recent = scores.slice(-3);
    const older = scores.slice(0, 3);
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const olderAvg = older.length ? older.reduce((a, b) => a + b, 0) / older.length : 0;
    const trend = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
    const trendPercent = olderAvg ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
    return { avgScore, bestScore, worstScore, totalSessions, trend, trendPercent };
  }, [interviewHistory]);

  // ✅ Skills Breakdown Data for Pie Chart
  const skillsData = useMemo(() => {
    if (!interviewHistory.length) return [];
    const allStrengths = interviewHistory.flatMap(s => s.strengths || []);
    const allWeaknesses = interviewHistory.flatMap(s => s.weaknesses || []);
    
    const categories = {
      'Communication': 0,
      'Technical': 0,
      'Problem-Solving': 0,
      'Leadership': 0,
      'Other': 0
    };
    
    [...allStrengths, ...allWeaknesses].forEach(skill => {
      const lower = skill.toLowerCase();
      if (lower.includes('communicat') || lower.includes('present') || lower.includes('explain')) {
        categories['Communication']++;
      } else if (lower.includes('technic') || lower.includes('code') || lower.includes('react') || lower.includes('python')) {
        categories['Technical']++;
      } else if (lower.includes('problem') || lower.includes('solve') || lower.includes('analyz')) {
        categories['Problem-Solving']++;
      } else if (lower.includes('lead') || lower.includes('team') || lower.includes('manag')) {
        categories['Leadership']++;
      } else {
        categories['Other']++;
      }
    });
    
    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([name, value], idx) => ({
        name,
        value,
        color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#6b7280'][idx % 5]
      }));
  }, [interviewHistory]);

  // Computed stats
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
    return new Set(logs.map(l => l.userId?._id || l.userId || 'unknown')).size || 1;
  }, [liveStats.activeUsers, data, isConnected]);

  const computedEventsPerMin = useMemo(() => {
    if (isConnected && liveStats.eventsPerMinute > 0) return liveStats.eventsPerMinute;
    const logs = data?.activity || [];
    const recent = logs.filter(l => new Date(l.createdAt || l.timestamp).getTime() > Date.now() - 3600000).length;
    return Math.round(recent / 60) || 1;
  }, [liveStats.eventsPerMinute, data, isConnected]);

  const computedAiAnalyses = useMemo(() => {
    const liveCount = recentActivities.filter(a => a.event === 'ai:resume-analysis' || a.event?.includes('resume')).length;
    const histCount = (data?.activity || []).filter(l => l.featureUsed === 'resume-analyzer' || l.event?.includes('resume')).length;
    return liveCount + histCount;
  }, [recentActivities, data]);

  const failedActivities = useMemo(() => {
    const combined = [...(data?.activity || []), ...recentActivities];
    const seen = new Set();
    return combined.filter(item => item.success === false)
      .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
      .filter(item => {
        const key = `${item.userId?._id || item.userId}-${item.event || item.featureUsed}-${new Date(item.createdAt || item.timestamp).getTime()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 50);
  }, [data?.activity, recentActivities]);

  // ✅ Export to PDF Function
  const exportToPDF = () => {
    if (!interviewHistory.length) return alert('No interview data to export');
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Mock Interview Performance Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`User: ${user?.name || user?.email || 'Anonymous'}`, 14, 33);
    
    doc.setFontSize(14);
    doc.text('Performance Summary', 14, 45);
    doc.setFontSize(10);
    
    const summaryData = [
      ['Total Sessions', performanceMetrics?.totalSessions || 0],
      ['Average Score', `${performanceMetrics?.avgScore || 0}%`],
      ['Best Score', `${performanceMetrics?.bestScore || 0}%`],
      ['Trend', `${performanceMetrics?.trendPercent || 0}% ${performanceMetrics?.trend}`]
    ];
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 9 }
    });
    
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Session Details', 14, 20);
    
    const sessionData = interviewHistory.map(s => [
      new Date(s.createdAt).toLocaleDateString(),
      s.targetRole,
      s.dreamCompany || '-',
      `${s.overallScore}%`,
      s.duration || '-'
    ]);
    
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Role', 'Company', 'Score', 'Duration']],
      body: sessionData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    doc.save(`interview-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ✅ NEW: Email Report Handler
  const handleSendEmail = async () => {
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return alert('Please enter a valid email address');
    }
    setEmailLoading(true);
    try {
      await api.post('/ai/interview/email-report', { recipientEmail });
      alert('✅ Report sent successfully! Check your inbox.');
      setShowEmailModal(false);
      setRecipientEmail('');
    } catch (err) {
      console.error(err);
      alert('❌ Failed to send email. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Session Comparison Handlers
  const toggleSessionSelection = (session) => {
    setSelectedSessions(prev => {
      const exists = prev.find(s => s._id === session._id);
      if (exists) {
        return prev.filter(s => s._id !== session._id);
      } else if (prev.length < 2) {
        return [...prev, session];
      } else {
        return [prev[1], session];
      }
    });
  };

  const exportToCSV = (activities, filename = 'analytics-export') => {
    if (!activities?.length) return alert('No data to export');
    const headers = ['Timestamp', 'User', 'Email', 'Event', 'Feature', 'Status', 'Response Time (ms)', 'Target Role', 'Company'];
    const rows = activities.map(item => {
      const event = item.event || item.featureUsed || 'unknown';
      const success = item.success !== false;
      const timestamp = item.createdAt || item.timestamp;
      const user = item.userId?.name || item.userId?.email?.split('@')[0] || 'Unknown';
      const email = item.userId?.email || 'N/A';
      const responseTime = item.responseTime || item.metadata?.duration || '-';
      const targetRole = item.companyName || item.jobRole || item.metadata?.targetRole || '-';
      const company = item.metadata?.companyName || '-';
      return [timestamp ? new Date(timestamp).toISOString() : '-', user, email, event, event.replace('-', ' '), success ? 'Success' : 'Failed', responseTime, targetRole, company]
        .map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} retry={fetchData} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">🎯 Advanced User Intelligence</h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              AI-powered insights and real-time user behavior analytics
              <span className={`px-2 py-1 text-xs rounded-full ${isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                {isConnected ? '🟢 Live' : '🟡 Syncing...'}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <select value={timeRange} onChange={(e) => setTimeRange(Number(e.target.value))} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button onClick={fetchData} className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-medium transition shadow-lg shadow-purple-500/30">🔄 Refresh</button>
          </div>
        </div>

        {/* Alert Banner */}
        {computedErrorRate > 0.1 ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><div><p className="font-semibold text-red-400">High Error Rate Detected</p><p className="text-sm text-slate-300">Current error rate: <span className="font-bold">{(computedErrorRate * 100).toFixed(1)}%</span> (threshold: 10%)</p></div></div>
            <button onClick={() => setShowErrorModal(true)} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition">View Errors →</button>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><span className="text-2xl">✅</span><div><p className="font-semibold text-green-400">System Health Optimal</p><p className="text-sm text-slate-300">Error rate: <span className="font-bold">{(computedErrorRate * 100).toFixed(1)}%</span> (threshold: 10%)</p></div></div>
            <button onClick={() => setActiveTab('activity')} className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm transition">View All Activity →</button>
          </div>
        )}

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl"><div className="text-2xl font-bold text-green-400">{computedActiveUsers}</div><div className="text-xs text-slate-400">Active Now</div></div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl"><div className="text-2xl font-bold text-purple-400">{computedEventsPerMin}</div><div className="text-xs text-slate-400">Events/Min</div></div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl"><div className="text-2xl font-bold text-blue-400">{computedAiAnalyses}</div><div className="text-xs text-slate-400">AI Analyses</div></div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl"><div className="text-2xl font-bold text-amber-400">{(computedErrorRate * 100).toFixed(1)}%</div><div className="text-xs text-slate-400">Error Rate</div></div>
        </div>

        {/* AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data?.advanced?.insights || []).map((insight, idx) => <InsightCard key={idx} insight={insight} />)}
        </div>

        {/* PHASE 3 + EMAIL: ENHANCED INTERVIEW ANALYTICS */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">📊 Interview Performance Analytics</h3>
            <div className="flex gap-2">
              <button onClick={fetchInterviewHistory} className="text-xs text-purple-400 hover:text-purple-300 transition">🔄 Refresh</button>
              {interviewHistory.length > 0 && (
                <>
                  <button onClick={exportToPDF} className="text-xs text-emerald-400 hover:text-emerald-300 transition">📄 Export PDF</button>
                  {/* ✅ NEW: Email Button */}
                  <button onClick={() => setShowEmailModal(true)} className="text-xs text-blue-400 hover:text-blue-300 transition">📧 Email Report</button>
                </>
              )}
            </div>
          </div>

          {interviewLoading ? (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><div className="w-4 h-4 border-2 border-slate-600 border-t-purple-500 rounded-full animate-spin" /> Loading analytics...</div>
          ) : interviewHistory.length > 0 ? (
            <>
              {/* Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard icon="" label="Average Score" value={`${performanceMetrics?.avgScore || 0}%`} gradient="from-green-500 to-emerald-500" />
                <MetricCard icon="🏆" label="Best Score" value={`${performanceMetrics?.bestScore || 0}%`} gradient="from-purple-500 to-pink-500" />
                <MetricCard icon="🎯" label="Total Sessions" value={performanceMetrics?.totalSessions || 0} gradient="from-blue-500 to-cyan-500" />
                <MetricCard icon={performanceMetrics?.trend === 'improving' ? '📈' : performanceMetrics?.trend === 'declining' ? '📉' : '➡️'} label="Trend" value={`${performanceMetrics?.trendPercent || 0}% ${performanceMetrics?.trend}`} gradient={performanceMetrics?.trend === 'improving' ? 'from-green-500 to-emerald-500' : performanceMetrics?.trend === 'declining' ? 'from-red-500 to-orange-500' : 'from-gray-500 to-slate-500'} />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Score Trend Chart */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-300 mb-4">📈 Score Progression</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="score" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Skills Breakdown Pie Chart */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-300 mb-4">🎯 Skills Breakdown</h4>
                  <div className="h-48 w-full flex items-center justify-center">
                    {skillsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={skillsData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                            {skillsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend verticalAlign="bottom" height={36} fontSize={10} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-500 text-sm">Complete more interviews to see skills breakdown</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Comparison Selection */}
              {selectedSessions.length > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔄</span>
                    <div>
                      <p className="font-semibold text-purple-300">Comparing {selectedSessions.length} session(s)</p>
                      <p className="text-sm text-slate-400">
                        {selectedSessions.map(s => s.targetRole).join(' vs ')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowCompareModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
                  >
                    View Comparison →
                  </button>
                </div>
              )}

              {/* Session History List with Selection */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {interviewHistory.map((session, idx) => {
                  const isSelected = selectedSessions.find(s => s._id === session._id);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleSessionSelection(session)}
                      className={`flex items-center justify-between p-3 rounded-lg transition cursor-pointer group border ${
                        isSelected 
                          ? 'bg-purple-500/20 border-purple-500/50 ring-2 ring-purple-500/30' 
                          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                      }`}
                      title={`Click to ${isSelected ? 'deselect' : 'select'} for comparison`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Selection Checkbox */}
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                          isSelected ? 'bg-purple-500 border-purple-400' : 'border-slate-600 group-hover:border-purple-400'
                        }`}>
                          {isSelected && <span className="text-xs text-white">✓</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                            {session.targetRole}{session.dreamCompany && <span className="text-xs text-slate-500">@ {session.dreamCompany}</span>}
                          </p>
                          <p className="text-xs text-slate-400">{new Date(session.createdAt).toLocaleDateString()} • {session.experienceLevel}</p>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <span className={`text-lg font-bold ${session.overallScore >= 80 ? 'text-green-400' : session.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{session.overallScore}%</span>
                        <p className="text-xs text-slate-500">{session.questionCount} Qs • {session.duration}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p className="text-lg">🎭 No interview sessions yet</p>
              <p className="text-sm mt-1">Complete your first mock interview to see performance analytics!</p>
              <button onClick={() => window.location.href = '/mock-interview'} className="mt-3 text-xs text-purple-400 hover:text-purple-300 underline">Start practicing →</button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800">
          {['overview', 'journey', 'heatmap', 'activity'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 font-medium capitalize transition ${activeTab === tab ? 'text-purple-400 border-b-2 border-purple-500' : 'text-slate-400 hover:text-white'}`}>{tab}</button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab data={data?.advanced} liveStats={liveStats} onSelectUser={(e) => { setSearchQuery(e); setActiveTab('activity'); }} onSelectStage={(s) => { setSearchQuery(s); setActiveTab('activity'); }} />}
        {activeTab === 'journey' && <JourneyTab data={data?.advanced} onSelectUser={(e) => { setSearchQuery(e); setActiveTab('activity'); }} />}
        {activeTab === 'heatmap' && <HeatmapTab data={data?.advanced} liveStats={liveStats} onSelectHour={(h) => { setSearchQuery(`${h}:00`); setActiveTab('activity'); }} />}
        {activeTab === 'activity' && <ActivityTab logs={data?.activity} liveActivities={recentActivities} isConnected={isConnected} searchQuery={searchQuery} onSearchChange={setSearchQuery} onExport={exportToCSV} />}

      </div>

      {/* ✅ NEW: Email Report Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setShowEmailModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">📧 Email Interview Report</h3>
            <p className="text-sm text-slate-400 mb-4">Send a formatted performance summary to any email address.</p>
            
            <input 
              type="email" 
              placeholder="e.g., recruiter@company.com" 
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowEmailModal(false)} 
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendEmail} 
                disabled={emailLoading || !recipientEmail} 
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg transition font-medium"
              >
                {emailLoading ? 'Sending...' : 'Send Report'}
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mt-3 text-center">🔒 Securely sent via Shortlisted AI backend</p>
          </div>
        </div>
      )}

      {/* Session Comparison Modal */}
      {showCompareModal && selectedSessions.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setShowCompareModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">🔄 Session Comparison</h3>
              <button onClick={() => setShowCompareModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedSessions.map((session, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <h4 className="font-semibold text-white">{session.targetRole}{session.dreamCompany && ` @ ${session.dreamCompany}`}</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Score:</span><span className={`font-bold ${session.overallScore >= 80 ? 'text-green-400' : 'text-amber-400'}`}>{session.overallScore}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Date:</span><span className="text-white">{new Date(session.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Duration:</span><span className="text-white">{session.duration}</span></div>
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-slate-300 font-medium mb-2">Strengths:</p>
                      <ul className="space-y-1">{(session.strengths || []).map((s, i) => <li key={i} className="text-green-400 text-xs">✓ {s}</li>)}</ul>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-slate-300 font-medium mb-2">Areas to Improve:</p>
                      <ul className="space-y-1">{(session.weaknesses || []).map((w, i) => <li key={i} className="text-red-400 text-xs">• {w}</li>)}</ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end">
              <button onClick={() => setShowCompareModal(false)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-semibold transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setShowErrorModal(false)}>
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center"><div className="flex items-center gap-3"><span className="text-3xl">🚨</span><div><h3 className="text-xl font-bold text-red-400">System Error Intelligence</h3><p className="text-xs text-slate-400">Latest {failedActivities.length} failed activities</p></div></div><button onClick={() => setShowErrorModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full">✕</button></div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {failedActivities.length === 0 ? <div className="text-center py-12 text-slate-400"><p className="text-green-400 text-lg">🟢 Zero Errors Detected</p></div> : failedActivities.map((log, idx) => (
                <div key={idx} className="p-4 bg-slate-950/40 border border-red-900/20 rounded-2xl space-y-3">
                  <div className="flex justify-between"><div><div className="font-semibold text-white">{log.userId?.name || 'Unknown'}</div><div className="text-xs text-red-400 mt-1">❌ Failed: {log.event || log.featureUsed}</div></div><span className="text-xs text-slate-500">{new Date(log.createdAt || log.timestamp).toLocaleTimeString()}</span></div>
                  <p className="text-red-200 font-mono text-xs bg-red-950/30 p-3 rounded-lg">{log.errorMessage || log.error || 'Unknown error'}</p>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-between"><button onClick={() => exportToCSV(failedActivities, 'errors')} className="px-4 py-2 bg-red-900/20 text-red-300 rounded-xl text-sm">📥 Export CSV</button><button onClick={() => setShowErrorModal(false)} className="px-6 py-2 bg-red-600 rounded-xl text-sm font-semibold">Done</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ Sub-Components (same as before)
const InsightCard = ({ insight }) => {
  const colors = { success: 'from-green-600 to-emerald-600', warning: 'from-amber-600 to-orange-600', info: 'from-blue-600 to-cyan-600', suggestion: 'from-purple-600 to-pink-600' };
  return (<div className={`bg-gradient-to-br ${colors[insight.type]} p-5 rounded-2xl shadow-xl`}><h3 className="font-bold text-lg mb-2">{insight.title}</h3><p className="text-white/90 text-sm mb-3">{insight.description}</p><p className="text-white/70 text-xs bg-white/20 px-3 py-2 rounded-lg inline-block">💡 {insight.action}</p></div>);
};

const MetricCard = ({ icon, label, value, gradient }) => (
  <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl"><div className="text-2xl mb-1">{icon}</div><div className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</div><div className="text-slate-400 text-xs mt-1">{label}</div></div>
);

const OverviewTab = ({ data, liveStats, onSelectUser, onSelectStage }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">🎪 Feature Adoption</h3>
      <div className="space-y-3">{data?.featureAdoption?.map((s, i) => (<div key={i} onClick={() => onSelectStage?.(s.stage)} className="cursor-pointer hover:bg-slate-800 p-3 rounded-xl transition"><div className="flex justify-between text-sm mb-1"><span className="text-slate-300">{s.stage}</span><span className="text-white font-semibold">{s.count}</span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${(s.count / (data.featureAdoption[0]?.count || 1)) * 100}%` }} /></div></div>))}</div>
    </div>
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">🏆 Top Users</h3>{liveStats?.activeUsers > 0 && <span className="text-xs text-green-400">{liveStats.activeUsers} online</span>}</div>
      <div className="space-y-3">{data?.topUsers?.slice(0, 5).map((u, i) => (<div key={i} onClick={() => onSelectUser?.(u.email || u.name)} className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-sm">{u.name?.[0] || 'U'}</div><div><div className="font-semibold text-sm">{u.name || u.email}</div><div className="text-xs text-slate-400">{u.featuresUsed?.length || 0} features</div></div></div><div className="text-right"><div className="font-bold text-purple-400">{u.engagementScore}</div><div className="text-xs text-slate-500">score</div></div></div>))}</div>
    </div>
  </div>
);

const JourneyTab = ({ data, onSelectUser }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <h3 className="text-xl font-bold mb-6">🗺️ User Journey</h3>
    <div className="space-y-4">{data?.topUsers?.slice(0, 5).map((u, i) => (<div key={i} onClick={() => onSelectUser?.(u.email)} className="border-l-2 border-purple-500 pl-4 py-2 cursor-pointer hover:bg-slate-800 rounded-r-xl transition"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-bold">{u.name?.[0] || 'U'}</div><div><div className="font-bold">{u.name !== 'Unknown User' ? u.name : u.email}</div><div className="text-xs text-slate-400">Score: {u.engagementScore}/100 • {u.totalActions} actions</div></div></div><div className="flex flex-wrap gap-1">{u.featuresUsed?.map((f, fi) => (<span key={fi} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">{f.replace('-', ' ')}</span>))}</div></div>))}</div>
  </div>
);

const HeatmapTab = ({ data, liveStats, onSelectHour }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
    <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">🔥 Hourly Activity</h3>{liveStats?.eventsPerMinute > 0 && <span className="text-xs text-purple-400">⚡ {liveStats.eventsPerMinute}/min</span>}</div>
    <div className="grid grid-cols-12 gap-2">{data?.hourlyActivity?.map((count, hour) => { const intensity = Math.min(count / 10, 1); return (<div key={hour} onClick={() => onSelectHour?.(hour)} className="text-center cursor-pointer hover:scale-105 transition"><div className="h-20 rounded-lg transition" style={{ background: `linear-gradient(to top, rgba(139, 92, 246, ${intensity}), rgba(236, 72, 153, ${intensity}))`, opacity: 0.3 + intensity * 0.7 }} /><div className="text-xs text-slate-500 mt-1">{hour}:00</div></div>); })}</div>
  </div>
);

const ActivityTab = ({ logs, liveActivities, isConnected, searchQuery, onSearchChange, onExport }) => {
  const [expandedItem, setExpandedItem] = useState(null);
  const allActivities = useMemo(() => {
    const combined = [...(logs || []), ...(liveActivities || [])];
    const seen = new Set();
    return combined.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)).filter(item => {
      const key = `${item.userId?._id || item.userId}-${item.event}-${new Date(item.createdAt || item.timestamp).getTime()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 100);
  }, [logs, liveActivities]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allActivities;
    const q = searchQuery.toLowerCase();
    return allActivities.filter(item => {
      if (q === 'failed' && item.success === false) return true;
      if (q === 'success' && item.success !== false) return true;
      return (item.userId?.name?.toLowerCase() || '').includes(q) || (item.userId?.email?.toLowerCase() || '').includes(q) || (item.event || '').toLowerCase().includes(q);
    });
  }, [allActivities, searchQuery]);

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div><h3 className="text-xl font-bold">⚡ Activity Stream</h3><div className="text-xs text-slate-400 mt-1">{isConnected ? '🟢 Live' : '🟡 Historical'} • {filtered.length} events</div></div>
        <div className="flex gap-3">
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm w-48" />
          <button onClick={() => onExport(filtered, 'activity')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm">📥 Export</button>
        </div>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filtered.length === 0 ? <div className="text-center py-8 text-slate-500">No events found</div> : filtered.map((log, idx) => {
          const key = `${log._id || log.id || idx}`;
          return (
            <div key={key} onClick={() => setExpandedItem(expandedItem === key ? null : key)} className={`p-3 rounded-lg cursor-pointer transition ${log.success !== false ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-red-900/20 border border-red-500/30'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${log.success !== false ? 'bg-green-500' : 'bg-red-500'}`} /><div><div className="font-medium text-sm">{log.userId?.name || log.userId?.email || 'User'}</div><div className="text-xs text-slate-400">{log.event || log.featureUsed} • {new Date(log.createdAt || log.timestamp).toLocaleDateString()}</div></div></div>
                <span className={`px-2 py-0.5 rounded text-xs ${log.success !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{log.success !== false ? '✅' : '❌'}</span>
              </div>
              {expandedItem === key && <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400"><pre className="bg-slate-950 p-2 rounded overflow-x-auto">{JSON.stringify(log, null, 2)}</pre></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LoadingScreen = () => (<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4" /><p className="text-slate-400">Loading intelligence...</p></div></div>);
const ErrorScreen = ({ error, retry }) => (<div className="min-h-screen bg-slate-950 flex items-center justify-center p-6"><div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-8 rounded-3xl text-center space-y-6"><div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center text-3xl mx-auto">⚠️</div><h2 className="text-2xl font-bold text-red-400">Connection Failed</h2><p className="text-slate-400 text-sm">{error}</p><button onClick={retry} className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition">🔄 Retry</button></div></div>);

export default AdvancedAnalytics;