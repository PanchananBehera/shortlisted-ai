import React, { useState } from 'react';
import api from '../utils/axios';

const AIAssistant = ({ application }) => {
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [error, setError] = useState('');

  // Generate Cover Letter
  const generateCoverLetter = async () => {
    if (!application) {
      setError('Please select an application first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/ai/generate-cover-letter', {
        companyName: application.companyName,
        position: application.position,
        jobDescription: application.jobDescription || ''
      });

      if (response.data.success) {
        setCoverLetter(response.data.coverLetter);
      }
    } catch (err) {
      console.error('Cover Letter Error:', err);
      setError('Failed to generate cover letter. Please try again.');
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

    try {
      const response = await api.post('/ai/generate-interview-questions', {
        companyName: application.companyName,
        position: application.position,
        jobDescription: application.jobDescription || ''
      });

      if (response.data.success) {
        setInterviewQuestions(response.data.questions);
      }
    } catch (err) {
      console.error('Interview Questions Error:', err);
      setError('Failed to generate interview questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800">
      <div className="mb-6">
        <h2 className="text-2xl font-serif text-gray-900 dark:text-white">✨ AI Assistant</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generate personalized content powered by Gemini AI — tailored to {application?.companyName || 'TCS'}'s requirements
        </p>
      </div>

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
            className="w-full py-3 bg-green-500 dark:bg-green-600 text-white rounded-xl font-medium hover:bg-green-600 dark:hover:bg-green-500 transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Cover Letter'}
          </button>

          {coverLetter && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {coverLetter}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(coverLetter)}
                className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline"
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
            className="w-full py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-600 dark:hover:bg-blue-500 transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Questions'}
          </button>

          {interviewQuestions.length > 0 && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {interviewQuestions.map((q, i) => (
                <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                  <p className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                    Q{i + 1}: {q.question}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Answer:</span> {q.answer}
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