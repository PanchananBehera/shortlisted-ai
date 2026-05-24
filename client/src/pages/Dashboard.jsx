import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Phone, PartyPopper, XCircle, 
  Building2, MapPin, Calendar, ChevronRight, Loader2 
} from 'lucide-react';
import { analyticsService } from '../service/analyticsService';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import api from '../utils/axios';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorObj, setErrorObj] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const result = await analyticsService.getDashboardStats();
      setData(result);
    } catch (error) {
      console.error("Failed to load dashboard", error);
      setErrorObj(error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400">
        <p className="text-lg">⚠️ Could not load dashboard data.</p>
        <p className="text-sm text-red-500">{errorObj}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📊 Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your placement journey
          </p>
        </div>
        <Link to="/applications/new" className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium transition flex items-center gap-2 shadow-lg">
          <span>+ Add Application</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Applications" 
          value={data.stats.total} 
          icon={<FileText className="w-6 h-6" />} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Interviews" 
          value={data.stats.interviews} 
          icon={<Phone className="w-6 h-6" />} 
          color="bg-purple-100 text-purple-600" 
        />
        <StatCard 
          title="Offers" 
          value={data.stats.offers} 
          icon={<PartyPopper className="w-6 h-6" />} 
          color="bg-yellow-100 text-yellow-600" 
        />
        <StatCard 
          title="Rejected" 
          value={data.stats.rejected} 
          icon={<XCircle className="w-6 h-6" />} 
          color="bg-red-100 text-red-600" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Application Status Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">📊 Application Status</h3>
          {data.statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <p>No applications added yet. Start tracking! 🚀</p>
            </div>
          )}
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">📈 Activity (Last 30 Days)</h3>
          {data.activity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <p>Activity will appear here as you add applications 📅</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Applications and AI Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Applications List */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold dark:text-white"> Recent Applications</h3>
          <Link to="/applications" className="text-sm text-green-500 hover:text-green-600 font-medium">View All</Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Position</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              {data.recentApplications.length > 0 ? (
                data.recentApplications.map((app) => (
                  <tr key={app._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-4 font-medium">{app.companyName}</td>
                    <td className="py-4">{app.jobRole}</td>
                    <td className="py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-4 text-sm text-gray-500">{new Date(app.dateApplied).toLocaleDateString()}</td>
                    <td className="py-4">
                      <Link to={`/applications/${app._id}`} className="text-green-500 hover:text-green-600 inline-block">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">
                    No applications found. Click "Add Application" to start! 
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Usage Activity */}
      <div className="lg:col-span-1">
        <MyAIActivity />
      </div>
      </div>
    </div>
  );
};

// Helper Components

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold dark:text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      {icon}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    'Applied': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Interview Scheduled': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'HR Round': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Offer Received': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Withdrawn': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

const MyAIActivity = () => {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    api.get('/admin/usage/my-activity')
      .then(res => setActivity(res.data.logs))
      .catch(console.error);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold mb-4 dark:text-white">🤖 Your AI Usage</h3>
      <ul className="space-y-3">
        {activity.map(log => (
          <li key={log._id} className="flex justify-between text-sm">
            <span className="text-gray-900 dark:text-gray-200">
              {log.featureUsed === 'cover-letter' ? '✍️' : '🎯'} {log.companyName}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {new Date(log.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;