// src/pages/History.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../utils/axios';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ai/history');
      if (res.data.success) {
        const data = res.data.history;
        setHistory(data);
        calculateAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Calculate analytics from history data
  const calculateAnalytics = (data) => {
    if (!data || data.length === 0) return;

    // Sort by date for line chart
    const sorted = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Line chart data: Score over time
    const lineData = sorted.map(item => ({
      date: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      overall: item.score,
      ats: item.atsCheck?.overallScore || 0,
    }));

    // Bar chart: Latest ATS vs Overall comparison
    const latest = sorted[sorted.length - 1];
    const barData = [
      { name: 'Overall Score', value: latest.score, fill: '#16a34a' },
      { name: 'ATS Score', value: latest.atsCheck?.overallScore || 0, fill: '#3b82f6' },
    ];

    // Pie chart: Status distribution (if you track application statuses)
    // For now, we'll use score ranges as categories
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
        color: ['#16a34a', '#f59e0b', '#ef4444'][i],
      }));

    // Motivational stats
    const firstScore = sorted[0]?.score || 0;
    const lastScore = latest?.score || 0;
    const improvement = lastScore - firstScore;
    const improvementPercent = firstScore > 0 ? Math.round((improvement / firstScore) * 100) : 0;

    setAnalytics({
      lineData,
      barData,
      pieData,
      stats: {
        totalAnalyses: data.length,
        avgScore: Math.round(data.reduce((sum, item) => sum + item.score, 0) / data.length),
        improvement,
        improvementPercent,
        bestScore: Math.max(...data.map(item => item.score)),
      },
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) return;
    try {
      await api.delete(`/ai/history/${id}`);
      setHistory(prev => prev.filter(item => item._id !== id));
      // Recalculate analytics after delete
      const updated = history.filter(item => item._id !== id);
      calculateAnalytics(updated);
    } catch (err) {
      console.error('Failed to delete analysis:', err);
      alert('Failed to delete analysis. Please try again.');
    }
  };

  const handleDownload = (correctedResume, targetRole, date) => {
    if (!correctedResume) return;
    const blob = new Blob([correctedResume], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Resume_${targetRole}_${new Date(date).toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadAnalysis = (analysis) => {
    navigate('/resume-analyzer', { state: { preloadedAnalysis: analysis } });
  };

  // ✅ Chart colors for dark mode
  const chartColors = {
    grid: '#374151', // gray-700
    text: '#9ca3af', // gray-400
    axis: '#6b7280', // gray-500
    tooltip: {
      bg: '#1f2937', // gray-800
      border: '#374151', // gray-700
      text: '#f9fafb', // gray-50
    },
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 bg-[#fafaf8] dark:bg-slate-950 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif text-gray-900 dark:text-white transition-colors">📈 Your Progress</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors">Track your resume optimization journey</p>
        </div>
        <button 
          onClick={() => navigate('/resume-analyzer')}
          className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white px-6 py-3 rounded-full font-medium transition shadow-md"
        >
          + New Analysis
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-8">
          
          {/* ✅ Motivational Stats Cards */}
          {analytics?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/50 dark:border-slate-800 text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.stats.totalAnalyses}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Analyses</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/50 dark:border-slate-800 text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.stats.avgScore}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/50 dark:border-slate-800 text-center">
                <p className={`text-3xl font-bold ${analytics.stats.improvement >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {analytics.stats.improvement >= 0 ? '+' : ''}{analytics.stats.improvement}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Score Change</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/50 dark:border-slate-800 text-center">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{analytics.stats.bestScore}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
              </div>
            </div>
          )}

          {/* ✅ Improvement Badge */}
          {analytics?.stats?.improvementPercent > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl border border-green-200 dark:border-green-800 flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">
                  You've improved by {analytics.stats.improvementPercent}%!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Keep optimizing — you're on a great trajectory! 🚀
                </p>
              </div>
            </div>
          )}

          {/* ✅ Charts Section */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Line Chart: Score Over Time */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800">
                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4">📊 Score Progress Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="date" stroke={chartColors.axis} fontSize={12} />
                      <YAxis stroke={chartColors.axis} fontSize={12} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: chartColors.tooltip.bg, 
                          border: `1px solid ${chartColors.tooltip.border}`,
                          borderRadius: '8px',
                          color: chartColors.tooltip.text,
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="overall" name="Overall Score" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="ats" name="ATS Score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Latest Scores */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800">
                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4">🎯 Latest Analysis Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" stroke={chartColors.axis} fontSize={12} domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" stroke={chartColors.axis} fontSize={12} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: chartColors.tooltip.bg, 
                          border: `1px solid ${chartColors.tooltip.border}`,
                          borderRadius: '8px',
                          color: chartColors.tooltip.text,
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart: Score Distribution */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 lg:col-span-2">
                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4">📈 Score Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {analytics.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: chartColors.tooltip.bg, 
                          border: `1px solid ${chartColors.tooltip.border}`,
                          borderRadius: '8px',
                          color: chartColors.tooltip.text,
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ✅ History List (Existing) */}
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white">🕒 Recent Analyses</h3>
            {history.map((item) => (
              <div 
                key={item._id}
                className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 hover:shadow-lg transition-all group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  
                  {/* Left Side: Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white transition-colors">{item.targetRole}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 
                        item.score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      } transition-colors`}>
                        Score: {item.score}/100
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                    {item.fileName && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 transition-colors">📄 {item.fileName}</p>
                    )}
                    {item.atsCheck?.overallScore && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                        🔍 ATS Score: {item.atsCheck.overallScore}/100
                      </p>
                    )}
                  </div>
                  
                  {/* Right Side: Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => handleLoadAnalysis(item)}
                      className="flex-1 md:flex-none px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition border border-green-200 dark:border-green-800"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => handleDownload(item.correctedResume, item.targetRole, item.createdAt)}
                      className="flex-1 md:flex-none px-4 py-2 text-sm bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-500 transition shadow-sm"
                    >
                      📥 Download
                    </button>
                    <button 
                      onClick={() => handleDelete(item._id)}
                      className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                      title="Delete Analysis"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800">
          <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📂</span>
          </div>
          <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-white mb-2">No history yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Start analyzing your resume to build your history!</p>
          <button 
            onClick={() => navigate('/resume-analyzer')}
            className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white px-6 py-3 rounded-full font-medium transition shadow-md"
          >
            Analyze Your Resume →
          </button>
        </div>
      )}
    </div>
  );
};

export default History;