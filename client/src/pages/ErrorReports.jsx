// src/pages/admin/ErrorReports.jsx
// ✅ Admin Dashboard: View, filter, and manage user error reports
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';

// ✅ SVG Icons (inline for zero dependencies)
const Icons = {
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  // ✅ UPDATED: Clean Alert Triangle Icon (Replaces the QR-looking Bug icon)
  ErrorReportsLogo: () => (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
  )
};

const ErrorReportsAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  
  // ✅ State
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ Filters & Pagination
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    severity: '',
    type: '',
    search: '',
    dateRange: '7d' // '24h', '7d', '30d', 'all'
  });
  
  const [selectedReport, setSelectedReport] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // ✅ Error type labels for display
  const errorTypeLabels = {
    file_too_large: ' File Too Large',
    invalid_file_type: '📄 Invalid File Type',
    empty_file: '🔍 Empty File',
    ai_timeout: '🤖 AI Timeout',
    analysis_failed: '⚠️ Analysis Failed',
    quota_exceeded: '⏱️ Quota Exceeded',
    network_error: ' Network Error',
    unauthorized: '🔐 Unauthorized',
    generic: '❓ Unknown Error',
    server_error: '🖥️ Server Error'
  };
  
  // ✅ Severity colors
  const severityColors = {
    low: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    medium: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    high: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    critical: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
  };
  
  // ✅ Status colors
  const statusColors = {
    new: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    acknowledged: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    resolved: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    dismissed: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800'
  };

  // ✅ Admin guard
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin, navigate]);

  // ✅ Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // Fetch reports + stats in parallel
      const [reportsRes, statsRes] = await Promise.all([
        api.get(`/admin/reports/errors?${params}`),
        api.get('/admin/reports/errors/stats')
      ]);
      
      if (reportsRes.data.success) {
        setReports(reportsRes.data.data.reports);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      
    } catch (err) {
      console.error('Failed to fetch error reports:', err);
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial fetch + filter changes
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [filters.page, filters.limit, isAdmin]);

  // ✅ Update report status
  const updateReportStatus = async (reportId, newStatus) => {
    try {
      setUpdatingId(reportId);
      await api.patch(`/admin/reports/errors/${reportId}`, {
        status: newStatus,
        resolution: newStatus === 'resolved' ? `Resolved by ${user?.email}` : undefined
      });
      
      // Optimistic update
      setReports(prev => prev.map(r => 
        r._id === reportId ? { ...r, status: newStatus } : r
      ));
      
      // Refresh stats
      const statsRes = await api.get('/admin/reports/errors/stats');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      
    } catch (err) {
      console.error('Failed to update report:', err);
      alert('Failed to update report status');
    } finally {
      setUpdatingId(null);
    }
  };

  // ✅ Copy to clipboard helper
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      // Simple toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.textContent = `✅ ${label} copied!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // ✅ Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ Format age helper
  const formatAge = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // ✅ Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'new', label: '🆕 New' },
    { value: 'acknowledged', label: '👁️ Acknowledged' },
    { value: 'resolved', label: '✅ Resolved' },
    { value: 'dismissed', label: '❌ Dismissed' }
  ];
  
  const severityOptions = [
    { value: '', label: 'All Severities' },
    { value: 'critical', label: '🔴 Critical' },
    { value: 'high', label: '🟠 High' },
    { value: 'medium', label: '🟡 Medium' },
    { value: 'low', label: ' Low' }
  ];
  
  const typeOptions = [
    { value: '', label: 'All Types' },
    ...Object.entries(errorTypeLabels).map(([key, label]) => ({
      value: key,
      label
    }))
  ];

  // ✅ Memoized filtered stats for dashboard
  const dashboardStats = useMemo(() => {
    if (!stats) return null;
    
    return {
      total: stats.total || 0,
      new24h: stats.new24h || 0,
      critical: stats.bySeverity?.critical || 0,
      high: stats.bySeverity?.high || 0,
      topError: stats.topErrors?.[0] || null
    };
  }, [stats]);

  // ✅ Loading state
  if (loading && !reports.length) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-400">Loading error reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* ✅ Styled Logo Icon */}
            <Icons.ErrorReportsLogo />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                Error Reports Dashboard
              </h1>
              <p className="text-slate-400 mt-1">
                Monitor, triage, and resolve user-reported issues
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <Icons.Refresh />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                showFilters 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Icons.Filter />
              Filters
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <div className="text-3xl font-bold text-white">{dashboardStats.total}</div>
              <div className="text-xs text-slate-400">Total Reports</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <div className="text-3xl font-bold text-blue-400">{dashboardStats.new24h}</div>
              <div className="text-xs text-slate-400">New (24h)</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <div className="text-3xl font-bold text-rose-400">{dashboardStats.critical}</div>
              <div className="text-xs text-slate-400">Critical</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <div className="text-3xl font-bold text-amber-400">{dashboardStats.high}</div>
              <div className="text-xs text-slate-400">High Priority</div>
            </div>
          </div>
        )}

        {/* Top Error Alert */}
        {dashboardStats?.topError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3">
            <Icons.Alert />
            <div className="flex-1">
              <p className="font-semibold text-rose-400">Most Frequent Error</p>
              <p className="text-sm text-slate-300 mt-1">
                <strong>{errorTypeLabels[dashboardStats.topError.type] || dashboardStats.topError.type}</strong>
                {' • '}Reported {dashboardStats.topError.count} times in 7 days
              </p>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {dashboardStats.topError.message}
              </p>
            </div>
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, search: dashboardStats.topError.fingerprint, page: 1 }));
              }}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs transition"
            >
              View All →
            </button>
          </div>
        )}

        {/* Filters Panel (Collapsible) */}
        {showFilters && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search message, file, role..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                    className="w-full px-3 py-2 pl-9 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Icons.Search />
                  </span>
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Severity Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500"
                >
                  {severityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Type Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Error Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500"
                >
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Date Range & Reset */}
            <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-800">
              <div className="flex gap-1">
                {['24h', '7d', '30d', 'all'].map(range => (
                  <button
                    key={range}
                    onClick={() => setFilters(prev => ({ ...prev, dateRange: range, page: 1 }))}
                    className={`px-3 py-1.5 text-xs rounded-lg transition ${
                      filters.dateRange === range
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {range === 'all' ? 'All Time' : `Last ${range}`}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFilters({
                  page: 1, limit: 20, status: '', severity: '', type: '', search: '', dateRange: '7d'
                })}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {/* Reports Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-white">
              Error Reports 
              <span className="text-slate-400 text-sm font-normal ml-2">
                ({reports.length} shown)
              </span>
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Per page:</span>
              <select
                value={filters.limit}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
              >
                {[10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-300">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Time</th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-left font-medium">Message</th>
                  <th className="px-6 py-3 text-left font-medium">User</th>
                  <th className="px-6 py-3 text-left font-medium">Severity</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      {filters.search || filters.status || filters.severity || filters.type
                        ? 'No reports match your filters'
                        : 'No error reports yet'}
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr 
                      key={report._id}
                      className={`hover:bg-slate-800/30 transition cursor-pointer ${
                        selectedReport?._id === report._id ? 'bg-purple-500/10' : ''
                      }`}
                      onClick={() => setSelectedReport(selectedReport?._id === report._id ? null : report)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-white">{formatDate(report.createdAt)}</div>
                        <div className="text-xs text-slate-500">{formatAge(report.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">
                          {errorTypeLabels[report.type] || report.type}
                        </span>
                        {report.count > 1 && (
                          <span className="ml-2 px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">
                            ×{report.count}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-slate-300 truncate" title={report.message}>
                          {report.message}
                        </p>
                        {report.context?.fileName && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            📄 {report.context.fileName}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {report.user?.email ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-medium">
                              {report.user.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-300 text-xs" title={report.user.email}>
                              {report.user.email.split('@')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Anonymous</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${severityColors[report.severity]}`}>
                          {report.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[report.status]}`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Status Quick Actions */}
                          {report.status === 'new' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateReportStatus(report._id, 'acknowledged');
                              }}
                              disabled={updatingId === report._id}
                              className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded transition disabled:opacity-50"
                              title="Mark as acknowledged"
                            >
                              <Icons.Eye />
                            </button>
                          )}
                          {report.status !== 'resolved' && report.status !== 'dismissed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateReportStatus(report._id, 'resolved');
                              }}
                              disabled={updatingId === report._id}
                              className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded transition disabled:opacity-50"
                              title="Mark as resolved"
                            >
                              <Icons.Check />
                            </button>
                          )}
                          {/* Expand/Collapse */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReport(selectedReport?._id === report._id ? null : report);
                            }}
                            className={`p-1.5 rounded transition ${
                              selectedReport?._id === report._id 
                                ? 'text-purple-400 bg-purple-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                            title={selectedReport?._id === report._id ? 'Collapse details' : 'Expand details'}
                          >
                            <Icons.ChevronDown />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Expanded Report Details */}
          {selectedReport && (
            <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Error Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Full Message</h4>
                    <p className="text-slate-200 text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                      {selectedReport.message}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Context</h4>
                    <div className="text-xs space-y-1.5">
                      {selectedReport.context?.targetRole && (
                        <p><span className="text-slate-500">Target Role:</span> <span className="text-slate-300">{selectedReport.context.targetRole}</span></p>
                      )}
                      {selectedReport.context?.fileType && (
                        <p><span className="text-slate-500">File Type:</span> <span className="text-slate-300">{selectedReport.context.fileType}</span></p>
                      )}
                      {selectedReport.context?.fileSize && (
                        <p><span className="text-slate-500">File Size:</span> <span className="text-slate-300">{(selectedReport.context.fileSize / 1024).toFixed(1)} KB</span></p>
                      )}
                      {selectedReport.context?.statusCode && (
                        <p><span className="text-slate-500">HTTP Status:</span> <span className="text-amber-400">{selectedReport.context.statusCode}</span></p>
                      )}
                      {selectedReport.context?.path && (
                        <p><span className="text-slate-500">Path:</span> <span className="text-slate-300 font-mono text-[11px]">{selectedReport.context.path}</span></p>
                      )}
                      {selectedReport.context?.userAgent && (
                        <details className="mt-2">
                          <summary className="text-slate-500 cursor-pointer hover:text-slate-300">User Agent</summary>
                          <p className="mt-1 text-[11px] text-slate-400 font-mono break-all bg-slate-900/50 p-2 rounded">
                            {selectedReport.context.userAgent}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Right: Actions & Metadata */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Report Metadata</h4>
                    <div className="text-xs space-y-1.5 text-slate-400">
                      <p><span className="text-slate-500">Report ID:</span> <span className="font-mono text-[11px]">{selectedReport._id}</span></p>
                      <p><span className="text-slate-500">Fingerprint:</span> <span className="font-mono text-[11px]">{selectedReport.fingerprint}</span></p>
                      <p><span className="text-slate-500">First Reported:</span> {formatDate(selectedReport.createdAt)}</p>
                      <p><span className="text-slate-500">Last Updated:</span> {formatDate(selectedReport.updatedAt)}</p>
                      {selectedReport.resolution && (
                        <p><span className="text-slate-500">Resolution:</span> <span className="text-green-400">{selectedReport.resolution}</span></p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => copyToClipboard(selectedReport.fingerprint, 'Fingerprint')}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition flex items-center gap-1"
                    >
                      📋 Copy Fingerprint
                    </button>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedReport.context, null, 2), 'Context JSON')}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition flex items-center gap-1"
                    >
                       Copy Context
                    </button>
                    {selectedReport.status !== 'dismissed' && (
                      <button
                        onClick={() => updateReportStatus(selectedReport._id, 'dismissed')}
                        disabled={updatingId === selectedReport._id}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <Icons.X /> Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Pagination */}
          {reports.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center">
              <p className="text-sm text-slate-400">
                Page {filters.page} of {Math.ceil((stats?.pagination?.total || 0) / filters.limit)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={filters.page === 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filters.page * filters.limit >= (stats?.pagination?.total || 0)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default ErrorReportsAdmin;