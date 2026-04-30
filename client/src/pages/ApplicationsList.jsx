import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios'; // ✅ Import our configured axios instance

const ApplicationsList = () => {
  const [applications, setApplications] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState('newest');

  // ✅ Fetch data from Backend on load
  useEffect(() => {
    fetchApplications();
  }, []);

  // Filter logic runs whenever data or filters change
  useEffect(() => {
    let result = [...applications];
    
    // Search
    if (search) {
      result = result.filter(app => 
        app.companyName.toLowerCase().includes(search.toLowerCase()) ||
        app.jobRole.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Filter by status
    if (statusFilter !== 'All') {
      result = result.filter(app => app.status === statusFilter);
    }
    
    // Sort
    if (sort === 'newest') result.sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
    else if (sort === 'oldest') result.sort((a, b) => new Date(a.dateApplied) - new Date(b.dateApplied));
    else result.sort((a, b) => a.companyName.localeCompare(b.companyName));
    
    setFiltered(result);
  }, [search, statusFilter, sort, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // ✅ Real API Call: GET /api/applications
      const res = await api.get('/applications');
      setApplications(res.data);
    } catch (error) {
      console.error('Failed to fetch applications', error);
      if (error.response?.status === 401) {
        // If unauthorized, token might be invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Real API Call: DELETE
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await api.delete(`/applications/${id}`);
      // Update UI immediately after deletion
      setApplications(prev => prev.filter(app => app._id !== id));
    } catch (error) {
      console.error('Failed to delete application', error);
      alert('Failed to delete. Please try again.');
    }
  };

  const statusColors = {
    'Applied': 'bg-brand-100 text-brand-700',
    'Interview Scheduled': 'bg-blue-100 text-blue-700',
    'HR Round': 'bg-purple-100 text-purple-700',
    'Offer Received': 'bg-amber-100 text-amber-700',
    'Rejected': 'bg-rose-100 text-rose-700',
    'Withdrawn': 'bg-gray-100 text-gray-600',
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-400"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-1">{applications.length} total applications tracked</p>
        </div>
        <Link to="/applications/new" className="bg-brand-400 text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-500 transition-all shadow-md hover:shadow-lg">
          + Add Application
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-surface-card p-4 rounded-2xl shadow-soft flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="🔍 Search company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none">
          <option value="All">All Statuses</option>
          {Object.keys(statusColors).map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="a-z">Company A-Z</option>
        </select>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? filtered.map(app => (
          <div key={app._id} className="bg-surface-card p-6 rounded-3xl shadow-soft hover:shadow-hover transition-all border border-gray-100 group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{app.companyName}</h3>
                <p className="text-sm text-gray-600">{app.jobRole}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[app.status]}`}>
                {app.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Applied: {new Date(app.dateApplied).toLocaleDateString()}</p>
            <div className="flex gap-2">
              <Link to={`/applications/${app._id}`} className="flex-1 text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium">
                View Details
              </Link>
              <Link to={`/applications/${app._id}/edit`} className="flex-1 text-center py-2 px-4 bg-brand-50 text-brand-700 rounded-xl hover:bg-brand-100 transition text-sm font-medium">
                Edit
              </Link>
              <button onClick={() => handleDelete(app._id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition">
                🗑️
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center py-16 bg-surface-card rounded-3xl">
            <p className="text-gray-500 text-lg">No applications found</p>
            <Link to="/applications/new" className="text-brand-600 hover:underline mt-2 inline-block">Add your first application →</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsList;