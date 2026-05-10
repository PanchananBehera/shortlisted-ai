import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

const ApplicationsList = () => {
  const [applications, setApplications] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState('newest');

  useEffect(() => { fetchApplications(); }, []);

  useEffect(() => {
    let result = [...applications];
    if (search) result = result.filter(app => app.companyName.toLowerCase().includes(search.toLowerCase()) || app.jobRole.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'All') result = result.filter(app => app.status === statusFilter);
    if (sort === 'newest') result.sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
    else if (sort === 'oldest') result.sort((a, b) => new Date(a.dateApplied) - new Date(b.dateApplied));
    else result.sort((a, b) => a.companyName.localeCompare(b.companyName));
    setFiltered(result);
  }, [search, statusFilter, sort, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/applications');
      setApplications(res.data);
    } catch (error) {
      console.error('Failed to fetch applications', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try { await api.delete(`/applications/${id}`); setApplications(prev => prev.filter(app => app._id !== id)); }
    catch (error) { console.error('Failed to delete application', error); alert('Failed to delete. Please try again.'); }
  };

  const statusColors = {
    'Applied': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'Interview Scheduled': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'HR Round': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'Offer Received': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'Rejected': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'Withdrawn': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };

  if (loading) return <div className="flex justify-center py-20 bg-[#fafaf8] dark:bg-slate-950 transition-colors"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div></div>;

  return (
    <div className="space-y-8 bg-[#fafaf8] dark:bg-slate-950 min-h-screen transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-serif text-gray-900 dark:text-white transition-colors">My Applications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors">{applications.length} total applications tracked</p>
        </div>
        <Link to="/applications/new" className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white px-8 py-3 rounded-full font-medium transition-all shadow-md hover:shadow-lg">+ Add Application</Link>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/50 dark:border-slate-800 flex flex-col md:flex-row gap-4 transition-colors">
        <input type="text" placeholder="🔍 Search company or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 outline-none transition-colors" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-colors">
          <option value="All">All Statuses</option>
          {Object.keys(statusColors).map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-colors">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="a-z">Company A-Z</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? filtered.map(app => (
          <div key={app._id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{app.companyName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">{app.jobRole}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusColors[app.status]}`}>{app.status}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 transition-colors">Applied: {new Date(app.dateApplied).toLocaleDateString()}</p>
            <div className="flex gap-2">
              <Link to={`/applications/${app._id}`} className="flex-1 text-center py-2 px-4 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition text-sm font-medium">View Details</Link>
              <Link to={`/applications/${app._id}/edit`} className="flex-1 text-center py-2 px-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition text-sm font-medium">Edit</Link>
              <button onClick={() => handleDelete(app._id)} className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition">🗑️</button>
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
            <p className="text-gray-500 dark:text-gray-400 text-lg transition-colors">No applications found</p>
            <Link to="/applications/new" className="text-green-600 dark:text-green-400 hover:underline mt-2 inline-block transition-colors">Add your first application →</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsList;