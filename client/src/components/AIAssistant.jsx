// client/src/components/AIAssistant.jsx - Button UI Restored
import React, { useState } from 'react';
import api from '../utils/axios';

const AIAssistant = ({ application }) => {
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const generateCoverLetter = async () => {
    if (!application) {
      setError('Please select an application first');
      return;
    }

    const companyName = application.companyName || application.company || '';
    const position = application.position || application.role || application.jobRole || application.title || '';
    const jobDescription = application.jobDescription || application.description || '';

    if (!companyName || !position) {
      setError('Missing company name or position. Please check the application data.');
      return;
    }

    setLoadingCoverLetter(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/ai/cover-letter', {
        companyName,
        position,
        jobRole: position,
        jobDescription,
      });

      if (response.data.success) {
        setCoverLetter(response.data.coverLetter);
        setSuccessMessage('✅ Cover letter generated successfully!');
      } else {
        setError(response.data.error || 'Failed to generate cover letter.');
      }
    } catch (err) {
      console.error('Cover Letter Error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to generate cover letter. Please try again.');
    } finally {
      setLoadingCoverLetter(false);
    }
  };

  const generateInterviewQuestions = async () => {
    if (!application) {
      setError('Please select an application first');
      return;
    }

    const companyName = application.companyName || application.company || '';
    const position = application.position || application.role || application.jobRole || application.title || '';
    const jobDescription = application.jobDescription || application.description || '';

    if (!companyName || !position) {
      setError('Missing company name or position. Please check the application data.');
      return;
    }

    setLoadingQuestions(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/ai/interview-qa', {
        companyName,
        position,
        jobRole: position,
        jobDescription,
      });

      if (response.data.success) {
        setInterviewQuestions(response.data.questions || []);
        setSuccessMessage('✅ Interview questions generated successfully!');
      } else {
        setError(response.data.error || 'Failed to generate interview questions.');
      }
    } catch (err) {
      console.error('Interview Questions Error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to generate interview questions. Please try again.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('📋 Copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-serif text-gray-900 dark:text-white transition-colors">✨ AI Assistant</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors">
          Generate personalized content powered by Gemini AI — tailored to{' '}
          {(application?.companyName || application?.company || 'the company')}'s requirements
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm text-center transition-colors">
          {error}
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm text-center transition-colors">
          {successMessage}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Generate Cover Letter Card */}
        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200/50 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✍️</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
              Generate Cover Letter
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors">
            Create a professional, tailored cover letter for{' '}
            {(application?.companyName || application?.company || 'the company')}
          </p>
          
          {/* ✅ UPDATED BUTTON STYLE */}
          <button
            onClick={generateCoverLetter}
            disabled={loadingCoverLetter || loadingQuestions}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 text-white rounded-full font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loadingCoverLetter ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              '✍️ Generate Cover Letter'
            )}
          </button>

          {coverLetter && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 max-h-96 overflow-y-auto font-sans leading-relaxed transition-colors">
                {coverLetter}
              </pre>
              <button
                onClick={() => copyToClipboard(coverLetter)}
                className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline font-medium transition-colors"
              >
                📋 Copy to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* Interview Prep Kit Card */}
        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200/50 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
              Interview Prep Kit
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors">
            10 unique questions with answers — regenerate for fresh ones each time!
          </p>
          
          {/* ✅ UPDATED BUTTON STYLE */}
          <button
            onClick={generateInterviewQuestions}
            disabled={loadingQuestions || loadingCoverLetter}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 text-white rounded-full font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loadingQuestions ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              '🎯 Generate Questions'
            )}
          </button>

          {interviewQuestions.length > 0 && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {interviewQuestions.map((q, i) => (
                <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <p className="font-medium text-gray-900 dark:text-white text-sm mb-2 transition-colors">
                    Q{i + 1}: {q.question}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 transition-colors">Answer:</span> {q.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;