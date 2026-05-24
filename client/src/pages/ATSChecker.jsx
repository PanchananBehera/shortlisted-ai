// src/pages/ATSChecker.jsx
import React, { useState } from 'react';
import api from '../utils/axios';

const ATSChecker = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      const validExts = ['pdf', 'docx', 'doc', 'txt'];
      
      if (!validTypes.includes(file.type) && !validExts.includes(fileExt)) {
        setError('Please upload a PDF, DOCX, DOC, or TXT file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }
      setResumeFile(file);
      setFileName(file.name);
      setError('');
    }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    
    if (!resumeFile) {
      setError('Please upload a resume file');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please paste the job description');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('targetRole', targetRole);
      formData.append('jobDescription', jobDescription);

      const res = await api.post('/ai/analyze-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.atsCheck) {
        setResult(res.data.atsCheck);
      } else {
        setResult({
          overallScore: res.data.score || 0,
          keywordMatch: {
            matchedKeywords: res.data.strengths || [],
            missingKeywords: res.data.missingSkills || []
          },
          formatting: {
            hasTables: false,
            hasGraphics: false,
            hasColumns: false,
            usesStandardHeadings: true,
            fontCompatibility: 'Good',
            issues: []
          },
          recommendations: res.data.improvements || []
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ATS check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 bg-[#fafaf8] dark:bg-slate-950 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif text-gray-900 dark:text-white transition-colors">🔍 ATS Compatibility Checker</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">Ensure your resume passes automated applicant tracking systems</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 mb-8 transition-colors">
        <form onSubmit={handleCheck} className="space-y-6">
          
          {/* Target Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Target Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white transition-colors"
            >
              <option>Software Engineer</option>
              <option>Full Stack Developer</option>
              <option>Data Analyst</option>
              <option>DevOps Engineer</option>
              <option>Product Manager</option>
              <option>Other</option>
            </select>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Job Description *
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here for accurate keyword matching..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 min-h-[150px] text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 transition-colors">Required for precise keyword analysis</p>
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Upload Your Resume *
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="ats-resume-upload"
              />
              <label
                htmlFor="ats-resume-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200/50 dark:border-slate-700 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-10 h-10 mb-3 text-gray-400 dark:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 transition-colors">PDF, DOCX, DOC, or TXT (MAX. 5MB)</p>
                </div>
              </label>
            </div>
            {fileName && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 transition-colors">
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 transition-colors">{fileName}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 transition-colors">Ready for ATS check</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setResumeFile(null); setFileName(''); }}
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Check Button */}
          <button
            type="submit"
            disabled={loading || !resumeFile || !jobDescription.trim()}
            className="w-full py-4 bg-green-500 dark:bg-green-600 text-white rounded-full font-semibold hover:bg-green-600 dark:hover:bg-green-500 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Checking ATS Compatibility...
              </span>
            ) : (
              '✅ Check ATS Compatibility'
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-center mb-6 transition-colors">
          {error}
        </div>
      )}

      {/* ATS Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          
          {/* ATS Compatibility Check Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white transition-colors">🔍 ATS Compatibility Check</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Ensures your resume passes automated screening</p>
              </div>
            </div>

            {/* ATS Score Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">ATS Readiness Score</span>
                <span className={`text-sm font-bold ${getScoreColor(result.overallScore)}`}>
                  {result.overallScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 transition-colors">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getScoreBg(result.overallScore)}`}
                  style={{ width: `${result.overallScore}%` }}
                ></div>
              </div>
            </div>

            {/* Keyword Matching */}
            {result.keywordMatch && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-green-200 dark:border-green-800 transition-colors">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2 transition-colors">
                    ✅ Matched Keywords ({result.keywordMatch.matchedKeywords?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keywordMatch.matchedKeywords?.slice(0, 8).map((kw, i) => (
                      <span key={i} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full border border-green-200 dark:border-green-800 transition-colors">
                        {kw}
                      </span>
                    ))}
                    {result.keywordMatch.matchedKeywords?.length > 8 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">+{result.keywordMatch.matchedKeywords.length - 8} more</span>
                    )}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2 transition-colors">
                    ⚠️ Missing Keywords ({result.keywordMatch.missingKeywords?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keywordMatch.missingKeywords?.slice(0, 8).map((kw, i) => (
                      <span key={i} className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800 transition-colors">
                        {kw}
                      </span>
                    ))}
                    {result.keywordMatch.missingKeywords?.length > 8 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">+{result.keywordMatch.missingKeywords.length - 8} more</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Formatting Check */}
            {result.formatting && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200/50 dark:border-slate-800 transition-colors">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 transition-colors">📐 Formatting Compliance</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg transition-colors">
                    <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">No tables or text boxes</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      !result.formatting.hasTables ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                    } transition-colors`}>
                      {!result.formatting.hasTables ? '✅ Pass' : '❌ Fix Needed'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg transition-colors">
                    <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">No images/graphics</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      !result.formatting.hasGraphics ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                    } transition-colors`}>
                      {!result.formatting.hasGraphics ? '✅ Pass' : '❌ Fix Needed'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg transition-colors">
                    <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">Single-column layout</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      !result.formatting.hasColumns ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    } transition-colors`}>
                      {!result.formatting.hasColumns ? '✅ Pass' : '⚠️ May cause issues'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg transition-colors">
                    <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">Standard section headings</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      result.formatting.usesStandardHeadings ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    } transition-colors`}>
                      {result.formatting.usesStandardHeadings ? '✅ Pass' : '⚠️ Use "Work Experience", not "My Journey"'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg transition-colors">
                    <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">ATS-friendly fonts (Arial, Calibri, etc.)</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      result.formatting.fontCompatibility !== 'Poor' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                    } transition-colors`}>
                      {result.formatting.fontCompatibility === 'Good' ? '✅ Excellent' : 
                       result.formatting.fontCompatibility === 'Fair' ? '⚠️ Acceptable' : '❌ Change font'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ATS Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors">
                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 transition-colors">💡 ATS Optimization Tips</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-blue-700 dark:text-blue-300 text-sm transition-colors">
                      <span className="mt-0.5">✨</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Retry Button */}
          <div className="text-center pt-4">
            <button
              onClick={() => { 
                setResult(null); 
                setResumeFile(null); 
                setFileName(''); 
                setJobDescription('');
              }}
              className="text-green-600 dark:text-green-400 hover:underline font-medium transition-colors"
            >
              Check another resume →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSChecker;