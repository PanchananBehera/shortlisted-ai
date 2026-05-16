import React, { useState } from 'react';
import api from '../utils/axios';

const AIAssistant = ({ application }) => {
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Generate Cover Letter
  const generateCoverLetter = async () => {
    if (!application) {
      setError('Please select an application first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/ai/cover-letter', {
        companyName: application.companyName,
        position: application.position,
        jobDescription: application.jobDescription || ''
      });

      if (response.data.success) {
        setCoverLetter(response.data.coverLetter);
        setSuccessMessage('✅ Cover letter generated successfully!');
      }
    } catch (err) {
      console.error('Cover Letter Error:', err);
      setError(err.response?.data?.error || 'Failed to generate cover letter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate Interview Questions
  const generateInterviewQuestions = async () => {
    if (!application) {
      setError('Please select an application first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/ai/interview-qa', {
        companyName: application.companyName,
        position: application.position,
        jobDescription: application.jobDescription || ''
      });

      if (response.data.success) {
        setInterviewQuestions(response.data.questions);
        setSuccessMessage('✅ Interview questions generated successfully!');
      }
    } catch (err) {
      console.error('Interview Questions Error:', err);
      setError(err.response?.data?.error || 'Failed to generate interview questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('📋 Copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800">
      <div className="mb-6">
        <h2 className="text-2xl font-serif text-gray-900 dark:text-white">✨ AI Assistant</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generate personalized content powered by Gemini AI — tailored to {application?.companyName || 'the company'}'s requirements
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generate Cover Letter */}
        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200/50 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✍️</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Cover Letter</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Create a professional, tailored cover letter for {application?.companyName || 'the company'}
          </p>
          <button
            onClick={generateCoverLetter}
            disabled={loading || !application}
            className="w-full py-3 bg-green-500 dark:bg-green-600 text-white rounded-xl font-medium hover:bg-green-600 dark:hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Cover Letter'
            )}
          </button>

          {coverLetter && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 max-h-96 overflow-y-auto">
                {coverLetter}
              </pre>
              <button
                onClick={() => copyToClipboard(coverLetter)}
                className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
              >
                📋 Copy to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* Interview Prep Kit */}
        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200/50 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Interview Prep Kit</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            10 unique questions with answers — regenerate for fresh ones each time!
          </p>
          <button
            onClick={generateInterviewQuestions}
            disabled={loading || !application}
            className="w-full py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-600 dark:hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Questions'
            )}
          </button>

          {interviewQuestions.length > 0 && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {interviewQuestions.map((q, i) => (
                <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                  <p className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                    Q{i + 1}: {q.question}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Answer:</span> {q.answer}
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