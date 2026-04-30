import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

const ResumeAnalyzer = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, DOCX, or TXT file');
        return;
      }
      
      // Validate file size (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a resume file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('targetRole', targetRole);

      const res = await api.post('/resume/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Color for the score circle
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-serif text-gray-900">✨ Shortlisted AI Resume Analyzer</h1>
        <p className="text-gray-500 mt-2">Upload your resume & get instant ATS feedback</p>
      </div>

      {/* Upload Card */}
      <div className="bg-surface-card p-6 rounded-3xl shadow-soft border border-gray-100">
        <form onSubmit={handleAnalyze} className="space-y-6">
          
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Resume (PDF, DOCX, or TXT)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">PDF, DOCX, or TXT (MAX. 5MB)</p>
                </div>
              </label>
            </div>
            
            {/* Selected File Display */}
            {fileName && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-900">{fileName}</p>
                  <p className="text-xs text-emerald-600">Ready to analyze</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); setFileName(''); }}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Target Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Role</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option>Software Engineer</option>
              <option>Full Stack Developer</option>
              <option>Data Analyst</option>
              <option>DevOps Engineer</option>
              <option>Product Manager</option>
              <option>Other</option>
            </select>
          </div>

          {/* Analyze Button */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-4 bg-brand-400 text-white rounded-full font-semibold hover:bg-brand-500 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing your resume...
              </span>
            ) : (
              '🚀 Analyze Resume'
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-center">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Score Header */}
          <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100 flex flex-col md:flex-row items-center gap-6">
            {/* Circle Score */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                <circle 
                  cx="64" cy="64" r="56" 
                  stroke="currentColor" 
                  strokeWidth="12" 
                  fill="none" 
                  strokeDasharray="351.86"
                  strokeDashoffset={351.86 - (351.86 * result.score) / 100}
                  className={`${getScoreColor(result.score)} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(result.score)}`}>{result.score}</span>
                <span className="text-xs text-gray-400 uppercase font-semibold">ATS Score</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-900">Resume Analysis for {targetRole}</h2>
              <p className="text-gray-600 mt-2">
                {result.score >= 80 
                  ? "Excellent! Your resume is well-optimized for this role." 
                  : "Your resume needs some improvements to match this role."}
              </p>
            </div>
          </div>

          {/* Feedback Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Strengths */}
            {result.strengths && (
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <h3 className="text-lg font-bold text-emerald-800 mb-4">💪 Strengths</h3>
                <ul className="space-y-3">
                  {result.strengths.map((item, i) => (
                    <li key={i} className="flex gap-3 text-emerald-700 text-sm">
                      <span className="mt-1">✅</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses / Missing */}
            {result.weaknesses && (
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                <h3 className="text-lg font-bold text-amber-800 mb-4">⚠️ Areas to Improve</h3>
                <ul className="space-y-3">
                  {result.weaknesses.map((item, i) => (
                    <li key={i} className="flex gap-3 text-amber-700 text-sm">
                      <span className="mt-1">⚡</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {result.missingSkills?.map((skill, i) => (
                    <li key={`skill-${i}`} className="flex gap-3 text-amber-700 text-sm">
                      <span className="mt-1">🔍</span>
                      <span>Missing keyword: <strong>{skill}</strong></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actionable Tips */}
          {result.improvements && (
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <h3 className="text-lg font-bold text-blue-800 mb-4">💡 Suggested Actions</h3>
              <ul className="space-y-3">
                {result.improvements.map((item, i) => (
                  <li key={i} className="flex gap-3 text-blue-700 text-sm">
                    <span className="mt-1"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Retry */}
          <div className="text-center pt-4">
             <button
               onClick={() => { setResult(null); setFile(null); setFileName(''); }}
               className="text-brand-600 hover:underline font-medium"
             >
               Analyze another resume →
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;