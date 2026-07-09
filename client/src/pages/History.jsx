import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/axios';
import SessionPlayback from '../components/SessionPlayback';

const History = () => {
  const [history, setHistory] = useState([]);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('resume');
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllHistory();
  }, []);

  const fetchAllHistory = async () => {
    try {
      setLoading(true);
      const [resumeRes, interviewRes] = await Promise.all([
        api.get('/ai/history'),
        api.get('/interview/sessions')
      ]);
      
      if (resumeRes.data.success) {
        const data = resumeRes.data.history;
        setHistory(data);
        calculateAnalytics(data);
      }
      
      if (interviewRes.data.success) {
        setInterviewHistory(interviewRes.data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data) => {
    if (!data || data.length === 0) return;

    const sorted = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    const lineData = sorted.map(item => ({
      date: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      overall: item.score,
      ats: item.atsCheck?.overallScore || 0,
    }));

    const latest = sorted[sorted.length - 1];
    const barData = [
      { name: 'Overall', value: latest.score, fill: '#10b981' },
      { name: 'ATS', value: latest.atsCheck?.overallScore || 0, fill: '#3b82f6' },
    ];

    const scoreRanges = {
      'Excellent (80+)': 0,
      'Good (50-79)': 0,
      'Needs Work (<50)': 0,
    };
    data.forEach(item => {
      if (item.score >= 80) scoreRanges['Excellent (80+)']++;
      else if (item.score >= 50) scoreRanges['Good (50-79)']++;
      else scoreRanges['Needs Work (<50)']++;
    });
    const pieData = Object.entries(scoreRanges)
      .filter(([_, count]) => count > 0)
      .map(([name, value], i) => ({
        name,
        value,
        color: ['#10b981', '#f59e0b', '#ef4444'][i],
      }));

    const firstScore = sorted[0]?.score || 0;
    const lastScore = latest?.score || 0;
    const improvement = lastScore - firstScore;

    setAnalytics({
      lineData,
      barData,
      pieData,
      stats: {
        totalAnalyses: data.length,
        avgScore: Math.round(data.reduce((sum, item) => sum + item.score, 0) / data.length),
        improvement,
        bestScore: Math.max(...data.map(item => item.score)),
        firstScore,
        lastScore,
      },
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this analysis?')) return;
    try {
      await api.delete(`/ai/history/${id}`);
      setHistory(prev => prev.filter(item => item._id !== id));
      calculateAnalytics(history.filter(item => item._id !== id));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  // ✅ NEW: Download Recording Handler
  const handleDownloadRecording = async (fileId, targetRole, createdAt) => {
    try {
      const token = localStorage.getItem('token'); 
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/audio/download/${fileId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const date = new Date(createdAt).toISOString().split('T')[0];
      const safeRole = targetRole.replace(/\s+/g, '_');
      a.download = `Interview_${safeRole}_${date}.webm`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download recording.');
    }
  };

  const chartColors = {
    grid: '#e5e7eb',
    text: '#6b7280',
    axis: '#9ca3af',
    tooltip: { bg: '#ffffff', border: '#e5e7eb', text: '#111827' },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="text-4xl sm:text-5xl">📁</span> Your Progress
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 ml-2">Track your journey to interview mastery</p>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(activeTab === 'resume' ? '/resume-analyzer' : '/mock-interview')}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all flex items-center gap-2 sm:ml-auto"
            >
              <span>+</span> New {activeTab === 'resume' ? 'Analysis' : 'Interview'}
            </motion.button>
          </div>

          {/* Menu Bar */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm flex items-center gap-2 max-w-md sm:max-w-lg lg:max-w-xl">
            <button
              onClick={() => setActiveTab('resume')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'resume'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <span></span> Resume Analyses
            </button>
            <button
              onClick={() => setActiveTab('interview')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'interview'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>🎭</span> Mock Interviews
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* RESUME ANALYSES TAB */}
            {activeTab === 'resume' && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {analytics?.stats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Analyses', value: analytics.stats.totalAnalyses, color: 'bg-green-500', icon: '📊' },
                      { label: 'Average Score', value: analytics.stats.avgScore, color: 'bg-blue-500', icon: '📈' },
                      { label: 'Improvement', value: `${analytics.stats.improvement >= 0 ? '+' : ''}${analytics.stats.improvement}`, color: analytics.stats.improvement >= 0 ? 'bg-green-500' : 'bg-red-500', icon: '📉' },
                      { label: 'Best Score', value: analytics.stats.bestScore, color: 'bg-purple-500', icon: '' },
                    ].map((stat, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-2xl mb-4`}>
                          {stat.icon}
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {analytics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="text-2xl"></span> Score Progress
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.lineData}>
                            <defs>
                              <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} className="dark:opacity-50" />
                            <XAxis dataKey="date" stroke={chartColors.axis} fontSize={12} />
                            <YAxis stroke={chartColors.axis} fontSize={12} domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip.bg, border: `1px solid ${chartColors.tooltip.border}`, borderRadius: '8px', color: chartColors.tooltip.text }} />
                            <Area type="monotone" dataKey="overall" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOverall)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="text-2xl">📈</span> Score Distribution
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={analytics.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                              {analytics.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip.bg, border: `1px solid ${chartColors.tooltip.border}`, borderRadius: '8px', color: chartColors.tooltip.text }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-green-500">🕐</span> Recent Analyses
                  </h3>
                  {history.length > 0 ? history.map((item, idx) => (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 hover:border-green-500/30 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.targetRole}</h3>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              item.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 
                              item.score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 
                              'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}>
                              {item.score}/100
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate('/resume-analyzer', { state: { preloadedAnalysis: item } })} className="px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition border border-green-200 dark:border-green-800">
                            View
                          </button>
                          <button onClick={() => handleDelete(item._id)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl">
                      <div className="text-6xl mb-4">📄</div>
                      <p className="text-gray-600 dark:text-gray-400 text-lg">No analyses yet. Start optimizing your resume!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* MOCK INTERVIEWS TAB */}
            {activeTab === 'interview' && (
              <motion.div
                key="interview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {interviewHistory.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Interviews', value: interviewHistory.length, color: 'bg-blue-500', icon: '🎭' },
                      { label: 'Avg Score', value: Math.round(interviewHistory.reduce((sum, i) => sum + (i.overallScore || 0), 0) / interviewHistory.length), color: 'bg-green-500', icon: '📊' },
                      { label: 'Best Score', value: Math.max(...interviewHistory.map(i => i.overallScore || 0)), color: 'bg-purple-500', icon: '🏆' },
                      { label: 'Recorded', value: interviewHistory.filter(i => i.audioRecordingUrl).length, color: 'bg-amber-500', icon: '🎙️' },
                    ].map((stat, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm"
                      >
                        <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center text-2xl mb-4`}>
                          {stat.icon}
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* ✅ UPDATED: Interview Sessions with Download Button */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-blue-500">🎬</span> Recent Interviews
                  </h3>
                  {interviewHistory.length > 0 ? interviewHistory.map((session, idx) => (
                    <motion.div
                      key={session._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 hover:border-blue-500/30 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{session.targetRole}</h3>
                            {session.dreamCompany && <span className="text-sm text-gray-600 dark:text-gray-400">@ {session.dreamCompany}</span>}
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              (session.overallScore || 0) >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 
                              (session.overallScore || 0) >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 
                              'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}>
                              {session.overallScore || 0}/100
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(session.createdAt).toLocaleDateString()} • {session.duration || 'N/A'}</p>
                          {session.audioRecordingUrl && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                              <span>️</span> Recording available
                            </p>
                          )}
                        </div>
                        
                        {/* ✅ Button Group: Replay, Download, Practice Again */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {session.audioRecordingUrl && (
                            <button 
                              onClick={() => setSelectedSession(session)}
                              className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition shadow-sm flex items-center gap-1"
                            >
                              ▶️ Replay
                            </button>
                          )}
                          
                          {/* ✅ NEW: Download Button */}
                          {session.audioRecordingUrl && (
                            <button 
                              onClick={() => handleDownloadRecording(session.audioRecordingUrl, session.targetRole, session.createdAt)}
                              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition shadow-sm flex items-center gap-1"
                              title="Download recording"
                            >
                              📥 Download
                            </button>
                          )}
                          
                          <button 
                            onClick={() => navigate('/mock-interview')} 
                            className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition border border-blue-200 dark:border-blue-800"
                          >
                            Practice Again
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl">
                      <div className="text-6xl mb-4">🎭</div>
                      <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No interviews yet. Start practicing!</p>
                      <button onClick={() => navigate('/mock-interview')} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all">
                        Start Mock Interview →
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Session Playback Modal */}
      {selectedSession && (
        <SessionPlayback session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
};

export default History;