import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/axios';

const ApplicationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    companyName: '', jobRole: '', status: 'Applied', dateApplied: new Date().toISOString().split('T')[0],
    jobDescription: '', followUpDate: '', ctc: '', location: '', applicationLink: '', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (isEdit) fetchApplication(); }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${id}`);
      const data = res.data;
      setFormData({
        ...data,
        dateApplied: data.dateApplied ? new Date(data.dateApplied).toISOString().split('T')[0] : '',
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString().split('T')[0] : ''
      });
    } catch (err) { console.error('Error fetching application', err); setError('Failed to load application data.'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); if (error) setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.companyName || !formData.jobRole || !formData.dateApplied) { setError('Company Name, Job Role, and Date Applied are required.'); return; }
    try {
      setLoading(true);
      if (isEdit) await api.put(`/applications/${id}`, formData);
      else await api.post('/applications', formData);
      navigate('/applications');
    } catch (err) { console.error('Save failed', err); setError(err.response?.data?.message || 'Failed to save application. Please try again.'); }
    finally { setLoading(false); }
  };

  if (loading && isEdit) return <div className="flex justify-center items-center py-20 bg-[#fafaf8] dark:bg-slate-950 transition-colors"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div></div>;

  return (
    <div className="max-w-4xl mx-auto bg-[#fafaf8] dark:bg-slate-950 min-h-screen py-12 px-4 transition-colors duration-300">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/applications')} className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors">← Back</button>
        <h1 className="text-4xl font-serif text-gray-900 dark:text-white transition-colors">{isEdit ? 'Edit Application' : 'Add New Application'}</h1>
      </div>

      {error && <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-sm transition-colors">{error}</div>}

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: 'companyName', label: 'Company Name *', type: 'text', placeholder: 'e.g., Microsoft', col: 1 },
            { name: 'jobRole', label: 'Job Role *', type: 'text', placeholder: 'e.g., SDE Intern', col: 1 },
            { name: 'status', label: 'Status *', type: 'select', options: ['Applied', 'Interview Scheduled', 'HR Round', 'Offer Received', 'Rejected', 'Withdrawn'], col: 1 },
            { name: 'dateApplied', label: 'Date Applied *', type: 'date', col: 1 },
            { name: 'ctc', label: 'CTC / Package', type: 'text', placeholder: 'e.g., 24 LPA', col: 1 },
            { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g., Bangalore / Remote', col: 1 },
            { name: 'followUpDate', label: 'Follow-up Date', type: 'date', col: 1 },
            { name: 'applicationLink', label: 'Application Link', type: 'url', placeholder: 'https://...', col: 1 },
          ].map((field) => (
            <div key={field.name} className={field.col === 2 ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">{field.label}</label>
              {field.type === 'select' ? (
                <select name={field.name} value={formData[field.name]} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-green-500 outline-none text-gray-900 dark:text-white transition-colors">
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={field.type} name={field.name} value={formData[field.name]} onChange={handleChange} placeholder={field.placeholder} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-green-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors" />
              )}
            </div>
          ))}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Job Description <span className="text-xs text-green-600 dark:text-green-400">(Required for AI Features)</span></label>
            <textarea name="jobDescription" rows="4" value={formData.jobDescription} onChange={handleChange} placeholder="Paste the job description here..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-green-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-colors"></textarea>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Notes</label>
            <textarea name="notes" rows="2" value={formData.notes} onChange={handleChange} placeholder="Interviewer name, referral details, etc." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-green-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-colors"></textarea>
          </div>

          <div className="md:col-span-2 flex gap-4 mt-4 pt-6 border-t border-gray-200/50 dark:border-slate-800 transition-colors">
            <button type="button" onClick={() => navigate('/applications')} className="flex-1 py-3 px-6 rounded-full text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-6 rounded-full text-white bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-500 transition-colors font-medium shadow-md hover:shadow-lg disabled:opacity-50">{loading ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Application')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;