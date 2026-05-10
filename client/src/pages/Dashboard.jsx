import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalApplications: 0, interviews: 0, offers: 0, rejected: 0 });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, appsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/applications?limit=5')
      ]);
      setStats(statsRes.data);
      setApplications(appsRes.data.applications || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Applied', value: stats.totalApplications, color: '#22c55e' },
    { name: 'Interviews', value: stats.interviews, color: '#3b82f6' },
    { name: 'Offers', value: stats.offers, color: '#8b5cf6' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
  ].filter(item => item.value > 0);

  if (loading) return <div className="flex items-center justify-center h-64 bg-[#fafaf8] dark:bg-slate-950 transition-colors"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div></div>;

  return (
    <div className="space-y-8 bg-[#fafaf8] dark:bg-slate-950 min-h-screen transition-colors duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif text-gray-900 dark:text-white transition-colors">📊 Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors">Track your placement journey</p>
        </div>
        <Link to="/applications/new" className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white px-8 py-3 rounded-full font-medium transition shadow-md hover:shadow-lg">
          + Add Application
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Applications', value: stats.totalApplications, icon: '📝', color: 'bg-green-100 dark:bg-green-900/30' },
          { label: 'Interviews', value: stats.interviews, icon: '🎤', color: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Offers', value: stats.offers, icon: '🎉', color: 'bg-purple-100 dark:bg-purple-900/30' },
          { label: 'Rejected', value: stats.rejected, icon: '❌', color: 'bg-rose-100 dark:bg-rose-900/30' },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1 transition-colors">{card.value}</p>
              </div>
              <div className={`p-3 ${card.color} rounded-xl`}><span className="text-2xl">{card.icon}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-white mb-4 transition-colors">📊 Application Status</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500"><p>No applications yet</p></div>}
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-white mb-4 transition-colors">📈 Activity (Last 30 Days)</h3>
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500"><p>Activity chart coming soon</p></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors overflow-hidden">
        <div className="p-6 border-b border-gray-200/50 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-serif font-semibold text-gray-900 dark:text-white transition-colors">🕒 Recent Applications</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
              <tr>
                {['Company', 'Role', 'Status', 'Date', 'Action'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-slate-800 transition-colors">
              {applications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white transition-colors">{app.companyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 transition-colors">{app.jobRole}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      app.status === 'Applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      app.status === 'Interview' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      app.status === 'Offer' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                      'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                    } transition-colors`}>{app.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 transition-colors">{new Date(app.appliedDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link to={`/applications/${app._id}`} className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;