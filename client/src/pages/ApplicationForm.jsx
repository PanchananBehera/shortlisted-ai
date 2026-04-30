import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/axios'; // ✅ Import our API instance

const ApplicationForm = () => {
  const { id } = useParams(); // Get ID from URL (if editing)
  const navigate = useNavigate();
  const isEdit = !!id;

  // Initial form state matching your DB Schema
  const [formData, setFormData] = useState({
    companyName: '',
    jobRole: '',
    status: 'Applied',
    dateApplied: new Date().toISOString().split('T')[0], // Default to today
    jobDescription: '',
    followUpDate: '',
    ctc: '',
    location: '',
    applicationLink: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ If in Edit Mode, fetch existing data on load
  useEffect(() => {
    if (isEdit) {
      fetchApplication();
    }
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${id}`);
      const data = res.data;
      
      // Format dates for <input type="date">
      setFormData({
        ...data,
        dateApplied: data.dateApplied ? new Date(data.dateApplied).toISOString().split('T')[0] : '',
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString().split('T')[0] : ''
      });
    } catch (err) {
      console.error('Error fetching application', err);
      setError('Failed to load application data.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(''); // Clear errors when user types
  };

  // ✅ Handle Form Submission (POST or PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic Validation
    if (!formData.companyName || !formData.jobRole || !formData.dateApplied) {
      setError('Company Name, Job Role, and Date Applied are required.');
      return;
    }

    try {
      setLoading(true);
      
      if (isEdit) {
        // Update existing application
        await api.put(`/applications/${id}`, formData);
      } else {
        // Create new application
        await api.post('/applications', formData);
      }
      
      // Redirect back to list on success
      navigate('/applications');
      
    } catch (err) {
      console.error('Save failed', err);
      // Show server error message if available
      setError(err.response?.data?.message || 'Failed to save application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/applications')} className="text-gray-400 hover:text-brand-600 transition">
          ← Back
        </button>
        <h1 className="text-3xl font-serif text-gray-900">
          {isEdit ? 'Edit Application' : 'Add New Application'}
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-surface-card p-8 rounded-3xl shadow-soft border border-gray-100">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Row 1: Company & Role */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
            <input
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
              placeholder="e.g., Microsoft"
            />
          </div>
          
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Role *</label>
            <input
              name="jobRole"
              required
              value={formData.jobRole}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
              placeholder="e.g., SDE Intern"
            />
          </div>

          {/* Row 2: Status & Date */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
            >
              {['Applied', 'Interview Scheduled', 'HR Round', 'Offer Received', 'Rejected', 'Withdrawn'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Applied *</label>
            <input
              type="date"
              name="dateApplied"
              required
              value={formData.dateApplied}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
            />
          </div>

          {/* Row 3: CTC & Location */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">CTC / Package</label>
            <input
              name="ctc"
              value={formData.ctc}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
              placeholder="e.g., 24 LPA"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
              placeholder="e.g., Bangalore / Remote"
            />
          </div>

          {/* Row 4: Follow Up & Link */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
            <input
              type="date"
              name="followUpDate"
              value={formData.followUpDate}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Application Link</label>
            <input
              name="applicationLink"
              value={formData.applicationLink}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition"
              placeholder="https://..."
            />
          </div>

          {/* Row 5: Job Description (Full Width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description <span className="text-xs text-brand-600">(Required for AI Features)</span>
            </label>
            <textarea
              name="jobDescription"
              rows="4"
              value={formData.jobDescription}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition resize-none"
              placeholder="Paste the job description here so the AI can generate cover letters and interview questions..."
            ></textarea>
          </div>

          {/* Row 6: Notes (Full Width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              rows="2"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-brand-400 outline-none bg-gray-50 focus:bg-white transition resize-none"
              placeholder="Interviewer name, referral details, etc."
            ></textarea>
          </div>

          {/* Buttons */}
          <div className="md:col-span-2 flex gap-4 mt-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="flex-1 py-3 px-6 rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 rounded-full text-white bg-brand-400 hover:bg-brand-500 transition font-medium shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Application')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;