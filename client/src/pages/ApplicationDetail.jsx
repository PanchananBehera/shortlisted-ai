import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/axios';

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // ✅ Added profile state
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiType, setAiType] = useState(null);
  const [error, setError] = useState('');
  const [expandedQ, setExpandedQ] = useState({});
  const [activeFilter, setActiveFilter] = useState('All');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApplication();
    fetchUserProfile(); // ✅ Fetch profile on mount
  }, [id]);

  const fetchApplication = async () => {
    try {
      const res = await api.get(`/applications/${id}`);
      setApplication(res.data);
    } catch (err) {
      console.error('Failed to fetch application', err);
      setError('Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch user profile data for personalization
  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/user/profile');
      if (res.data.success) {
        setUserProfile(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch profile, using defaults:', err);
    }
  };

  // ✨ AI Cover Letter Generator (Fixed Regenerate + Profile Integration)
  const generateCoverLetter = async () => {
    if (!application?.jobDescription) {
      setError('Please add a job description first to generate a cover letter');
      return;
    }

    // ✅ Clear previous result BEFORE loading to force UI refresh
    setAiResult(null);
    setAiLoading(true);
    setAiType('cover-letter');
    setError('');
    setCopied(false);

    try {
      // ✅ Build personalized prompt with profile data
      const profileContext = userProfile ? {
        fullName: userProfile.fullName,
        jobTitle: userProfile.jobTitle,
        skills: userProfile.skills,
        summary: userProfile.summary,
        experience: userProfile.experience,
        education: userProfile.education,
        projects: userProfile.projects
      } : {};

      const res = await api.post('/ai/cover-letter', {
        companyName: application.companyName,
        jobRole: application.jobRole,
        jobDescription: application.jobDescription,
        profile: profileContext, // ✅ Send profile to backend
        regenerate: aiResult !== null // ✅ Tell backend if this is a regeneration
      });
      
      setAiResult(res.data.coverLetter);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate cover letter');
    } finally {
      setAiLoading(false);
    }
  };

  // ❓ AI Interview Q&A Generator (Fixed "New Questions" + Profile Integration)
  const generateInterviewQA = async () => {
    if (!application?.jobDescription) {
      setError('Please add a job description first to generate interview questions');
      return;
    }

    setAiLoading(true);
    setAiType('interview-qa');
    setError('');
    setExpandedQ({});
    setActiveFilter('All');

    try {
      // ✅ Collect existing questions to avoid duplicates
      const existingQuestions = aiResult && aiType === 'interview-qa' 
        ? aiResult.map(q => q.question) 
        : [];

      // ✅ Build personalized context
      const profileContext = userProfile ? {
        fullName: userProfile.fullName,
        jobTitle: userProfile.jobTitle,
        skills: userProfile.skills,
        experience: userProfile.experience
      } : {};

      const res = await api.post('/ai/interview-qa', {
        companyName: application.companyName,
        jobRole: application.jobRole,
        jobDescription: application.jobDescription,
        profile: profileContext, // ✅ Send profile to backend
        existingQuestions: existingQuestions, // ✅ Send existing questions to avoid repeats
        regenerate: existingQuestions.length > 0 // ✅ Tell backend this is a "new set" request
      });
      
      setAiResult(res.data.questions);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate interview questions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this application?')) return;
    try {
      await api.delete(`/applications/${id}`);
      navigate('/applications');
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete application');
    }
  };

  const toggleQuestion = (index) => {
    setExpandedQ(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const expandAllQuestions = () => {
    if (!Array.isArray(aiResult)) return;
    const allExpanded = aiResult.every((_, i) => expandedQ[i]);
    if (allExpanded) {
      setExpandedQ({});
    } else {
      const all = {};
      aiResult.forEach((_, i) => { all[i] = true; });
      setExpandedQ(all);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCoverLetter = () => {
    if (!aiResult || aiType !== 'cover-letter') return;
    const blob = new Blob([aiResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cover_Letter_${application.companyName}_${application.jobRole}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get filtered questions
  const getFilteredQuestions = () => {
    if (!Array.isArray(aiResult)) return [];
    if (activeFilter === 'All') return aiResult;
    return aiResult.filter(q => q.category === activeFilter);
  };

  // Get unique categories from questions
  const getCategories = () => {
    if (!Array.isArray(aiResult)) return [];
    const cats = [...new Set(aiResult.map(q => q.category).filter(Boolean))];
    return ['All', ...cats];
  };

  // Difficulty badge colors
  const difficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'hard': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Category icon
  const categoryIcon = (cat) => {
    switch (cat) {
      case 'Technical': return '💻';
      case 'System Design': return '🏗️';
      case 'Behavioral': return '🤝';
      case 'Company-Specific': return '🏢';
      case 'HR': return '📋';
      default: return '❓';
    }
  };

  // Category badge color
  const categoryColor = (cat) => {
    switch (cat) {
      case 'Technical': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'System Design': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Behavioral': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Company-Specific': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'HR': return 'bg-pink-50 text-pink-700 border-pink-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-400"></div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="text-center py-20">
        <p className="text-rose-600 text-lg">{error}</p>
        <Link to="/applications" className="text-brand-600 hover:underline mt-4 inline-block">
          ← Back to Applications
        </Link>
      </div>
    );
  }

  const statusColors = {
    'Applied': 'bg-brand-100 text-brand-700',
    'Interview Scheduled': 'bg-blue-100 text-blue-700',
    'HR Round': 'bg-purple-100 text-purple-700',
    'Offer Received': 'bg-amber-100 text-amber-700',
    'Rejected': 'bg-rose-100 text-rose-700',
    'Withdrawn': 'bg-gray-100 text-gray-600',
  };

  const filteredQuestions = getFilteredQuestions();
  const categories = getCategories();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => navigate('/applications')}
            className="text-gray-400 hover:text-brand-600 transition mb-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-serif text-gray-900">
            {application?.companyName}
          </h1>
          <p className="text-gray-600">{application?.jobRole}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/applications/${id}/edit`}
            className="px-4 py-2 bg-brand-50 text-brand-700 rounded-full hover:bg-brand-100 transition font-medium"
          >
            ✏️ Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition font-medium"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Application Details Card */}
      <div className="bg-surface-card p-6 rounded-3xl shadow-soft border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[application?.status]}`}>
              {application?.status}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Date Applied</h3>
            <p className="text-gray-900">{new Date(application?.dateApplied).toLocaleDateString()}</p>
          </div>
          {application?.followUpDate && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Follow-up Date</h3>
              <p className="text-gray-900">{new Date(application?.followUpDate).toLocaleDateString()}</p>
            </div>
          )}
          {application?.location && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
              <p className="text-gray-900">{application.location}</p>
            </div>
          )}
          {application?.ctc && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">CTC / Package</h3>
              <p className="text-gray-900">{application.ctc}</p>
            </div>
          )}
          {application?.applicationLink && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Application Link</h3>
              <a
                href={application.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline break-all"
              >
                {application.applicationLink}
              </a>
            </div>
          )}
          {application?.jobDescription && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Job Description</h3>
              <div className="bg-gray-50 p-4 rounded-2xl text-gray-700 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {application.jobDescription}
              </div>
            </div>
          )}
          {application?.notes && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{application.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ✨ AI Features Section */}
      {application?.jobDescription && (
        <div className="bg-gradient-to-br from-brand-50 to-emerald-50 p-6 rounded-3xl border border-brand-100">
          <h2 className="text-xl font-serif text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-2xl">✨</span> AI Assistant
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Generate personalized content powered by Gemini AI — tailored to {application.companyName}'s requirements
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={generateCoverLetter}
              disabled={aiLoading}
              className="p-5 bg-white rounded-2xl shadow-sm hover:shadow-hover transition-all text-left group disabled:opacity-50 border border-transparent hover:border-brand-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl group-hover:scale-110 transition-transform">✍️</span>
                <h3 className="font-semibold text-gray-900">Generate Cover Letter</h3>
              </div>
              <p className="text-sm text-gray-600">
                Create a professional, tailored cover letter for {application.companyName}
              </p>
            </button>

            <button
              onClick={generateInterviewQA}
              disabled={aiLoading}
              className="p-5 bg-white rounded-2xl shadow-sm hover:shadow-hover transition-all text-left group disabled:opacity-50 border border-transparent hover:border-brand-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl group-hover:scale-110 transition-transform">🎯</span>
                <h3 className="font-semibold text-gray-900">Interview Prep Kit</h3>
              </div>
              <p className="text-sm text-gray-600">
                10 unique questions with answers — regenerate for fresh ones each time!
              </p>
            </button>
          </div>

          {/* AI Loading State */}
          {aiLoading && (
            <div className="flex flex-col items-center justify-center py-10 bg-white/60 rounded-2xl backdrop-blur-sm">
              <div className="relative mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-100 border-t-brand-500"></div>
                <span className="absolute inset-0 flex items-center justify-center text-lg">
                  {aiType === 'cover-letter' ? '✍️' : '🎯'}
                </span>
              </div>
              <p className="text-gray-700 font-medium">
                {aiType === 'cover-letter' ? 'Crafting your professional cover letter...' : 'Generating personalized interview questions...'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Analyzing job description & company context
              </p>
            </div>
          )}

          {/* AI Error */}
          {error && aiResult === null && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
              {error}
            </div>
          )}

          {/* ========== COVER LETTER RESULT ========== */}
          {aiResult && aiType === 'cover-letter' && (
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
              {/* Header Bar */}
              <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white text-xl">✍️</span>
                  <div>
                    <h3 className="font-semibold text-white">Professional Cover Letter</h3>
                    <p className="text-brand-100 text-xs">
                      For {application.companyName} — {application.jobRole}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(aiResult)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition flex items-center gap-1.5 backdrop-blur-sm"
                  >
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                  <button
                    onClick={handleDownloadCoverLetter}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition flex items-center gap-1.5 backdrop-blur-sm"
                  >
                    📥 Download
                  </button>
                </div>
              </div>

              {/* Letter Body - Professional formatting */}
              <div className="p-8 md:p-10">
                <div className="max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontSize: '15px', lineHeight: '1.8' }}>
                  {aiResult}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span>⚡</span> Generated by Shortlisted AI — Review and personalize before sending
                </p>
                <button
                  onClick={generateCoverLetter}
                  disabled={aiLoading}
                  className="px-4 py-2 text-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition font-medium disabled:opacity-50"
                >
                  🔄 Regenerate
                </button>
              </div>
            </div>
          )}

          {/* ========== INTERVIEW Q&A RESULT ========== */}
          {aiResult && aiType === 'interview-qa' && (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-white text-xl">🎯</span>
                      <div>
                        <h3 className="font-semibold text-white">
                          Interview Prep Kit — {application.companyName}
                        </h3>
                        <p className="text-blue-100 text-xs">
                          {Array.isArray(aiResult) ? aiResult.length : 0} questions tailored to {application.jobRole}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={expandAllQuestions}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition backdrop-blur-sm"
                      >
                        {Array.isArray(aiResult) && aiResult.every((_, i) => expandedQ[i])
                          ? '🔼 Collapse All'
                          : '🔽 Expand All'}
                      </button>
                      <button
                        onClick={generateInterviewQA}
                        disabled={aiLoading}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition backdrop-blur-sm disabled:opacity-50"
                      >
                        🔄 New Questions
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Filter Tabs */}
                {categories.length > 1 && (
                  <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 bg-gray-50/50">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveFilter(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${activeFilter === cat
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                      >
                        {cat !== 'All' && <span className="mr-1">{categoryIcon(cat)}</span>}
                        {cat}
                        {cat === 'All'
                          ? ` (${Array.isArray(aiResult) ? aiResult.length : 0})`
                          : ` (${Array.isArray(aiResult) ? aiResult.filter(q => q.category === cat).length : 0})`
                        }
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {Array.isArray(filteredQuestions) && filteredQuestions.length > 0 ? (
                  filteredQuestions.map((qa, index) => {
                    const realIndex = Array.isArray(aiResult) ? aiResult.indexOf(qa) : index;
                    const isExpanded = expandedQ[realIndex];

                    return (
                      <div
                        key={realIndex}
                        className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden hover:shadow-hover transition-shadow"
                      >
                        {/* Question Header */}
                        <button
                          onClick={() => toggleQuestion(realIndex)}
                          className="w-full text-left p-5 flex items-start gap-4 group"
                        >
                          {/* Question Number */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {realIndex + 1}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges Row */}
                            <div className="flex flex-wrap gap-2 mb-2">
                              {qa.category && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${categoryColor(qa.category)}`}>
                                  {categoryIcon(qa.category)} {qa.category}
                                </span>
                              )}
                              {qa.difficulty && (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${difficultyColor(qa.difficulty)}`}>
                                  {qa.difficulty}
                                </span>
                              )}
                            </div>

                            {/* Question Text */}
                            <p className="font-medium text-gray-900 leading-relaxed group-hover:text-blue-700 transition-colors">
                              {qa.question}
                            </p>
                          </div>

                          {/* Expand/Collapse Arrow */}
                          <div className={`flex-shrink-0 mt-1 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Answer (Expandable) */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="px-5 pb-5 pl-17">
                            <div className="ml-12 p-4 bg-gradient-to-r from-brand-50 to-emerald-50 rounded-xl border-l-4 border-brand-400">
                              <div className="flex items-start gap-2">
                                <span className="text-brand-500 mt-0.5 flex-shrink-0">💡</span>
                                <div>
                                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
                                    Suggested Answer
                                  </p>
                                  <p className="text-gray-700 text-sm leading-relaxed">
                                    {qa.answer}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No questions found for this filter.</p>
                  </div>
                )}
              </div>

              {/* Footer Tips */}
              <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Placement Prep Tips</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Click <strong>"New Questions"</strong> to get a fresh set of 10 randomized questions each time</li>
                      <li>• Practice answering without looking at the suggested answer first</li>
                      <li>• Use the <strong>STAR method</strong> (Situation, Task, Action, Result) for behavioral questions</li>
                      <li>• For system design, always start with requirements → high-level design → deep dive</li>
                      <li>• Research {application.companyName}'s recent news and products before your interview</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* AI Attribution */}
              <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                <span>⚡</span> Questions generated by Gemini AI based on {application.companyName}'s job description — Each generation is unique
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reminder if no job description */}
      {!application?.jobDescription && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <p className="text-amber-800 text-sm">
            💡 <strong>Pro Tip:</strong> Add a job description to unlock AI features like cover letter generation and interview prep!
          </p>
          <Link
            to={`/applications/${id}/edit`}
            className="text-amber-700 hover:underline text-sm mt-2 inline-block"
          >
            Edit application to add job description →
          </Link>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetail;