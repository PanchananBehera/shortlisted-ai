// src/pages/ResumeAnalyzer.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';

const ResumeAnalyzer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [includePhoto, setIncludePhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Email state
  const [emailLoading, setEmailLoading] = useState(false);

  // ✅ PDF/File Validation Helper
  const validateFile = (file) => {
    const errors = [];
    
    // Check if file exists
    if (!file) {
      errors.push('Please select a file first');
      return errors;
    }
    
    // Check file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const validExts = ['pdf', 'docx', 'txt'];
    const fileType = file.type.toLowerCase();
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(fileType) && !validExts.includes(fileExt)) {
      errors.push('Only PDF, DOCX, and TXT files are supported.');
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      errors.push('File size must be under 5MB. Please compress your PDF.');
    }
    
    // Check if PDF is text-based (not scanned image)
    // Note: This is a best-effort check; actual validation happens on backend
    if (fileExt === 'pdf' && file.size < 10 * 1024) {
      errors.push('PDF appears to be empty or image-based. Please use a text-based PDF.');
    }
    
    return errors;
  };

  const handlePhotoChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setProfilePhoto(selectedFile);
      setPhotoPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      const validationErrors = validateFile(selectedFile);
      
      if (validationErrors.length > 0) {
        setError(validationErrors.join(' '));
        setFile(null);
        setFileName('');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  // Fetch analysis history
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/ai/history');
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Could not load analysis history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    // Final validation before upload
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      return;
    }
    
    if (!file) {
      setError('Please select a PDF resume file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setActiveTab('overview');

    try {
      const formData = new FormData();
      formData.append('resume', file); // Must match backend upload.single('resume')
      formData.append('targetRole', targetRole);
      formData.append('jobDescription', jobDescription);

      const res = await api.post('/ai/analyze-resume', formData, {
        onUploadProgress: (progressEvent) => {
          // Optional: Show upload progress
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload: ${percentCompleted}%`);
        }
      });
      
      if (res.data.success) {
        setResult(res.data);
        fetchHistory(); // Refresh history after successful analysis
      } else {
        throw new Error(res.data.error || 'Analysis failed');
      }
      
    } catch (err) {
      console.error('Analysis error:', err);
      
      // User-friendly error messages
      if (err.response?.status === 413) {
        setError('File is too large. Please compress your PDF to under 5MB.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || err.response?.data?.message || 'Invalid file. Please upload a valid PDF.');
      } else if (err.response?.status === 401) {
        setError('Please log in to analyze your resume');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Resume WITH PDF Attachment
  const handleEmailResume = async () => {
    if (!user?.email) {
      alert('Please log in to send email.');
      return;
    }

    if (!result?.correctedResume) {
      alert('No resume content to send.');
      return;
    }

    if (!window.confirm(`Send optimized resume + ATS Report PDF to ${user.email}?`)) return;

    setEmailLoading(true);
    try {
      await api.post('/ai/email-resume', {
        email: user.email,
        targetRole: targetRole,
        correctedResume: result.correctedResume,
        score: result.score,
        atsScore: result.atsCheck?.overallScore || 0,
        strengths: result.strengths,
        atsCheck: result.atsCheck,
        roadmap: result.roadmap
      });
      alert('✅ Resume + ATS Report sent successfully! Check your inbox.');
    } catch (err) {
      console.error('Email error:', err);
      alert('❌ Failed to send email. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Export ATS Report PDF
  const handleExportATSReport = async () => {
    if (!result?.atsCheck) {
      alert('No ATS data available to export.');
      return;
    }

    try {
      const res = await api.post('/ai/export-ats-report', {
        targetRole: targetRole,
        score: result.score,
        atsCheck: result.atsCheck,
        roadmap: result.roadmap
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ATS_Report_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('✅ ATS Report downloaded successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      alert('❌ Failed to generate PDF report.');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      case 'Important': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('📋 Optimized resume copied to clipboard!');
  };

  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let headerY = 20;

      if (includePhoto && profilePhoto) {
        try {
          const reader = new FileReader();
          const base64Image = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(profilePhoto);
          });
          doc.addImage(base64Image, 'JPEG', pageWidth - 35, 10, 25, 25);
          headerY = 40;
        } catch (photoErr) {
          console.warn('Photo embedding skipped:', photoErr);
        }
      }

      doc.setFillColor(34, 197, 94);
      doc.rect(0, headerY, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('PROFESSIONAL RESUME', pageWidth / 2, headerY + 25, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Target Role: ${targetRole}`, pageWidth / 2, headerY + 33, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      let yPosition = headerY + 50;
      const lines = doc.splitTextToSize(result.correctedResume, pageWidth - (margin * 2));
      const lineHeight = 6;

      lines.forEach((line) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by Shortlisted AI • Page ${i} of ${pageCount}`, pageWidth / 2, 285, { align: 'center' });
      }

      const outputFileName = `Optimized_Resume_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(outputFileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Failed to generate PDF. Please try copying the text instead.');
    }
  };

  // Download corrected resume from history
  const downloadCorrectedResume = (correctedResume, targetRole, createdAt) => {
    const blob = new Blob([correctedResume], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Resume_${targetRole}_${new Date(createdAt).toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Load preloaded analysis from History page
  useEffect(() => {
    const preloaded = location.state?.preloadedAnalysis;
    
    if (preloaded && preloaded._id) {
      setResult(prev => ({
        ...prev,
        ...preloaded,
        atsCheck: preloaded.atsCheck || {
          overallScore: 0,
          keywordMatch: { score: 0, matchedKeywords: [], missingKeywords: [] },
          formatting: { 
            hasTables: false, 
            hasGraphics: false, 
            hasColumns: false, 
            usesStandardHeadings: true, 
            fontCompatibility: 'Good', 
            issues: [] 
          },
          recommendations: []
        },
        roadmap: Array.isArray(preloaded.roadmap) ? preloaded.roadmap : [],
        issues: Array.isArray(preloaded.issues) ? preloaded.issues : []
      }));
      
      setTargetRole(preloaded.targetRole || 'Software Engineer');
      setActiveTab('overview');
      navigate('/resume-analyzer', { replace: true, state: {} });
    }
  }, [location, navigate]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-12 px-4 bg-[#fafaf8] dark:bg-slate-950 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-serif text-gray-900 dark:text-white transition-colors">✨ Shortlisted AI Resume Optimizer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">Fix errors, get a professional version & your personalized growth roadmap</p>
      </div>

      {/* Upload Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
        <form onSubmit={handleAnalyze} className="space-y-6">
          
          {/* Job Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Target Job Description (Optional but recommended)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here for precise keyword matching..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 min-h-[100px] text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 transition-colors">Helps AI match your resume to exact job requirements</p>
          </div>

          {/* File Upload - PDF, DOCX, TXT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Upload Resume (PDF, DOCX, TXT)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200/50 dark:border-slate-700 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-10 h-10 mb-3 text-gray-400 dark:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 transition-colors">PDF, DOCX, or TXT (MAX. 5MB)</p>
                </div>
              </label>
            </div>
            
            {/* Selected File Display */}
            {fileName && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 transition-colors">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 truncate transition-colors">{fileName}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 transition-colors">
                    {(file?.size / 1024).toFixed(1)} KB • Ready to analyze
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setFile(null); setFileName(''); setError(''); }} 
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Helper Text */}
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <span>💡</span>
                <span>
                  <strong>Tip:</strong> Export your resume as PDF from Word/Google Docs for best results. 
                  Scanned/image PDFs may not be readable by our AI.
                </span>
              </p>
            </div>
          </div>

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

          {/* Profile Photo (Optional & ATS-Safe) */}
          <div className="space-y-3 pt-2 border-t border-gray-200/50 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Profile Photo</label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includePhoto} 
                  onChange={(e) => setIncludePhoto(e.target.checked)} 
                  className="rounded text-green-600 dark:text-green-400 focus:ring-green-500 w-4 h-4 bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600" 
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Include in PDF</span>
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-200/50 dark:border-slate-700 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 bg-gray-50 dark:bg-slate-800 transition overflow-hidden relative group">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setProfilePhoto(null); setPhotoPreview(''); }}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] text-center px-1 transition-colors">Add Photo</span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight transition-colors">
                ATS-safe top-right placement.<br/>
                Toggle off for strict ATS submissions.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 transition-colors">
              <p className="font-medium">⚠️ {error}</p>
              {error.includes('PDF') && (
                <p className="text-sm mt-2">
                  <strong>Need help?</strong> Convert your file to PDF using:
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>Google Docs: File → Download → PDF</li>
                    <li>Microsoft Word: File → Save As → PDF</li>
                    <li>Online: ilovepdf.com or smallpdf.com</li>
                  </ul>
                </p>
              )}
            </div>
          )}

          {/* Analyze Button */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-4 bg-green-500 dark:bg-green-600 text-white rounded-full font-semibold hover:bg-green-600 dark:hover:bg-green-500 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing & optimizing...
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Analyze & Optimize Resume</span>
              </>
            )}
          </button>
          
          {/* Loading Progress */}
          {loading && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>🔍 Extracting text from PDF...</p>
              <p className="text-xs mt-1">This may take 10-30 seconds depending on file size</p>
            </div>
          )}
        </form>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200/50 dark:border-slate-800 pb-1 overflow-x-auto transition-colors">
            {[
              { id: 'overview', label: '📊 Analysis Overview' },
              { id: 'fixed', label: '✨ Professional Version' },
              { id: 'roadmap', label: '🗺️ Learning Roadmap' },
              { id: 'history', label: '🕒 History' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium rounded-t-lg transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                } transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Container */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/50 dark:border-slate-800 min-h-[450px] transition-colors">
            
            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Score Header */}
                <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl transition-colors">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="#e5e7eb" className="dark:stroke-slate-700" strokeWidth="12" fill="none" />
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
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold transition-colors">Overall Score</span>
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white transition-colors">Resume Analysis for {targetRole}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">
                      {result.score >= 80 
                        ? "Excellent! Your resume is well-optimized for this role." 
                        : "Your resume needs improvements to match this role."}
                    </p>
                  </div>
                  
                  {/* Export ATS Report Button */}
                  <button
                    onClick={handleExportATSReport}
                    className="px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition flex items-center gap-2"
                  >
                    📄 Export ATS Report
                  </button>
                </div>

                {/* Feedback Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.strengths?.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/30 p-5 rounded-xl border border-green-200 dark:border-green-800 transition-colors">
                      <h3 className="text-lg font-serif font-bold text-green-700 dark:text-green-300 mb-3 transition-colors">💪 Strengths</h3>
                      <ul className="space-y-2">
                        {result.strengths.map((item, i) => (
                          <li key={i} className="flex gap-2 text-green-700 dark:text-green-300 text-sm transition-colors">
                            <span className="mt-0.5">✅</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(result.weaknesses?.length > 0 || result.missingSkills?.length > 0) && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-5 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors">
                      <h3 className="text-lg font-serif font-bold text-amber-700 dark:text-amber-300 mb-3 transition-colors">⚠️ Areas to Improve</h3>
                      <ul className="space-y-2">
                        {result.weaknesses?.map((item, i) => (
                          <li key={i} className="flex gap-2 text-amber-700 dark:text-amber-300 text-sm transition-colors">
                            <span className="mt-0.5">⚡</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        {result.missingSkills?.map((skill, i) => (
                          <li key={`skill-${i}`} className="flex gap-2 text-amber-700 dark:text-amber-300 text-sm transition-colors">
                            <span className="mt-0.5">🔍</span>
                            <span>Missing keyword: <strong>{skill}</strong></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Issues with Severity */}
                {result.issues?.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200/50 dark:border-slate-800 transition-colors">
                    <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-3 transition-colors">🔍 Detected Issues</h3>
                    <div className="space-y-3">
                      {result.issues.map((issue, i) => (
                        <div key={i} className={`p-3 rounded-lg border-l-4 ${
                          issue.severity === 'High' ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-400 dark:border-rose-700' : 
                          issue.severity === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-700' : 
                          'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-700'
                        } transition-colors`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 transition-colors">{issue.type}</span>
                              <p className="mt-1 text-gray-900 dark:text-white text-sm transition-colors">{issue.description}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              issue.severity === 'High' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300' : 
                              issue.severity === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' : 
                              'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                            } transition-colors`}>
                              {issue.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Tips */}
                {result.improvements?.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors">
                    <h3 className="text-lg font-serif font-bold text-blue-700 dark:text-blue-300 mb-3 transition-colors">💡 Quick Fixes</h3>
                    <ul className="space-y-2">
                      {result.improvements.map((item, i) => (
                        <li key={i} className="flex gap-2 text-blue-700 dark:text-blue-300 text-sm transition-colors">
                          <span className="mt-0.5">✨</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ===== FIXED RESUME TAB ===== */}
            {activeTab === 'fixed' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white transition-colors">✨ Your Optimized Resume</h3>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(result.correctedResume)} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200/50 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition text-green-600 dark:text-green-400">📋 Copy</button>
                    
                    {/* EMAIL BUTTON */}
                    <button 
                      onClick={handleEmailResume} 
                      disabled={emailLoading || !user}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition disabled:opacity-50"
                      title={user ? 'Send to your email' : 'Login to email'}
                    >
                      {emailLoading ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </span>
                      ) : '📧 Email'}
                    </button>

                    <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 dark:bg-green-600 text-white rounded-xl hover:bg-green-600 dark:hover:bg-green-500 transition shadow-sm">📥 Download PDF</button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 -mt-2 transition-colors">This version fixes grammar, strengthens action verbs, quantifies achievements, and optimizes for ATS.</p>
                <pre className="whitespace-pre-wrap font-sans text-sm bg-gray-50 dark:bg-slate-800 p-5 rounded-xl border border-gray-200/50 dark:border-slate-700 max-h-[550px] overflow-y-auto leading-relaxed text-gray-900 dark:text-white transition-colors">
                  {result.correctedResume}
                </pre>
              </div>
            )}

            {/* ===== ROADMAP TAB ===== */}
            {activeTab === 'roadmap' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white transition-colors">🗺️ Your 90-Day Growth Roadmap</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors">Follow this plan to close skill gaps and avoid past mistakes</p>
                </div>
                {result.roadmap?.length > 0 ? (
                  <div className="space-y-4">
                    {result.roadmap.map((step, i) => (
                      <div key={i} className="p-5 border border-gray-200/50 dark:border-slate-800 rounded-xl hover:shadow-md transition bg-gray-50 dark:bg-slate-800">
                        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                          <h4 className="font-serif font-bold text-green-600 dark:text-green-400 text-lg transition-colors">{step.skill}</h4>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getPriorityBadge(step.priority)}`}>
                            {step.priority} Priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 transition-colors">{step.actionStep}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-white dark:bg-slate-900 border border-gray-200/50 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 text-gray-700 dark:text-gray-300 transition-colors">⏱️ {step.timeEstimate}</span>
                          {step.resources?.map((res, j) => (
                            <span key={j} className="text-xs bg-white dark:bg-slate-900 border border-gray-200/50 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 text-gray-700 dark:text-gray-300 transition-colors">📚 {res}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 transition-colors">
                    <p>No roadmap generated. Try analyzing with a more detailed resume.</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== HISTORY TAB ===== */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white transition-colors">🕒 Analysis History</h3>
                  <button 
                    onClick={fetchHistory}
                    className="text-sm text-green-600 dark:text-green-400 hover:underline transition-colors flex items-center gap-1"
                  >
                    🔄 Refresh
                  </button>
                </div>
                
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div 
                        key={item._id}
                        className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200/50 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => {
                          setResult(item);
                          setActiveTab('overview');
                          setTargetRole(item.targetRole);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white transition-colors">{item.targetRole}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
                              {new Date(item.createdAt).toLocaleDateString()} • Score: 
                              <span className={`font-bold ${
                                item.score >= 80 ? 'text-green-600 dark:text-green-400' : 
                                item.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 
                                'text-rose-600 dark:text-rose-400'
                              }`}> {item.score}/100</span>
                            </p>
                            {item.fileName && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">📄 {item.fileName}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {item.atsCheck?.overallScore && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ATS: {item.atsCheck.overallScore}/100
                              </p>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadCorrectedResume(item.correctedResume, item.targetRole, item.createdAt);
                              }}
                              className="mt-2 text-xs text-green-600 dark:text-green-400 hover:underline"
                            >
                              📥 Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 transition-colors">
                    <p>No analysis history yet</p>
                    <p className="text-sm mt-1">Your saved analyses will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Retry Button */}
          <div className="text-center pt-4">
            <button
              onClick={() => { 
                setResult(null); 
                setFile(null); 
                setFileName(''); 
                setJobDescription('');
                setProfilePhoto(null);
                setPhotoPreview('');
                setIncludePhoto(false);
                setActiveTab('overview'); 
              }}
              className="text-green-600 dark:text-green-400 hover:underline font-medium transition-colors"
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