import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import api from '../utils/axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Colors for Pie Chart
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/analytics/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-rose-600 text-lg">{error}</p>
        <button onClick={fetchStats} className="mt-4 text-brand-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-gray-900">📊 Dashboard</h1>
          <p className="text-gray-500">Track your placement journey</p>
        </div>
        <Link
          to="/applications/new"
          className="px-6 py-3 bg-brand-400 text-white rounded-full font-medium hover:bg-brand-500 transition shadow-md"
        >
          + Add Application
        </Link>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Applications"
          value={stats?.total || 0}
          icon="📝"
          color="bg-brand-50 text-brand-700"
        />
        <MetricCard
          title="Interviews"
          value={stats?.interviewCount || 0}
          subtext={`${stats?.interviewRate || 0}% rate`}
          icon="🎤"
          color="bg-blue-50 text-blue-700"
        />
        <MetricCard
          title="Offers"
          value={stats?.offerCount || 0}
          subtext={`${stats?.offerRate || 0}% rate`}
          icon="🎉"
          color="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          title="Rejected"
          value={stats?.rejectedCount || 0}
          icon="❌"
          color="bg-rose-50 text-rose-700"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart: Status Distribution */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🥧 Application Status</h2>
          <div className="h-64">
            {stats?.statusData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No applications yet. Start adding! 🚀
              </div>
            )}
          </div>
        </div>

        {/* Line Chart: Activity Trend */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Activity (Last 30 Days)</h2>
          <div className="h-64">
            {stats?.trendChartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No recent activity. Add applications to see trends! 📊
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🕐 Recent Applications</h2>
          <Link to="/applications" className="text-brand-600 hover:underline text-sm">
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats?.recentApplications?.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 font-medium text-gray-900">{app.companyName}</td>
                  <td className="py-3 text-gray-600">{app.jobRole}</td>
                  <td className="py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="py-3 text-gray-500 text-sm">
                    {new Date(app.dateApplied).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {(!stats?.recentApplications || stats.recentApplications.length === 0) && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">
                    No applications yet. Start tracking! 🎯
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

// Reusable Metric Card Component
const MetricCard = ({ title, value, subtext, icon, color }) => (
  <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100 hover:shadow-md transition">
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {title}
      </span>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const colors = {
    'Applied': 'bg-brand-100 text-brand-700',
    'Interview Scheduled': 'bg-blue-100 text-blue-700',
    'HR Round': 'bg-purple-100 text-purple-700',
    'Offer Received': 'bg-emerald-100 text-emerald-700',
    'Rejected': 'bg-rose-100 text-rose-700',
    'Withdrawn': 'bg-gray-100 text-gray-600',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

export default Dashboard;