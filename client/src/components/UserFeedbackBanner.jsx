// src/components/UserFeedbackBanner.jsx
// ✅ User-friendly error banner with one-click reporting
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportIssue } from '../api/report';

const UserFeedbackBanner = ({ 
  errorType, 
  errorMessage, 
  onRetry, 
  context = {} // Optional: extra debug info (file size, role, etc.)
}) => {
  const { user } = useAuth();
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // ✅ User-friendly messages mapped by error type
  const messages = {
    // File/Upload Errors
    file_too_large: {
      icon: '📎',
      title: 'File Too Large',
      description: 'Your resume file exceeds 5MB. Please compress your PDF or use a smaller file.',
      action: 'Compress PDF'
    },
    invalid_file_type: {
      icon: '📄',
      title: 'Unsupported File Type',
      description: 'We only support PDF, DOCX, and TXT files. Please convert your file and try again.',
      action: 'Convert to PDF'
    },
    empty_file: {
      icon: '🔍',
      title: 'File Appears Empty',
      description: 'Your PDF might be image-based or scanned. Please export a text-based PDF from Word/Google Docs.',
      action: 'How to Export PDF'
    },
    
    // AI/Processing Errors
    ai_timeout: {
      icon: '🤖',
      title: 'AI Taking a Break',
      description: 'Our analysis service is temporarily busy. Please wait a moment and try again.',
      action: 'Retry Now'
    },
    analysis_failed: {
      icon: '⚠️',
      title: 'Analysis Interrupted',
      description: "We couldn't complete your resume analysis. Our team has been notified automatically.",
      action: 'Try Again'
    },
    quota_exceeded: {
      icon: '⏱️',
      title: 'Daily Limit Reached',
      description: 'You\'ve reached your free analyses for today. Try again tomorrow or upgrade for unlimited access.',
      action: 'View Plans'
    },
    
    // Network/Auth Errors
    network_error: {
      icon: '📡',
      title: 'Connection Issue',
      description: 'Please check your internet connection and try again.',
      action: 'Retry'
    },
    unauthorized: {
      icon: '🔐',
      title: 'Login Required',
      description: 'Please log in to analyze your resume.',
      action: 'Go to Login'
    },
    
    // Generic Fallback
    generic: {
      icon: '😕',
      title: 'Something Went Wrong',
      description: "We're sorry! An unexpected error occurred. Our team is working on it.",
      action: 'Try Again'
    }
  };

  const msg = messages[errorType] || messages.generic;

  // ✅ Handle "Report Issue" click
  const handleReport = async () => {
    if (isReporting || reportSent) return;
    
    setIsReporting(true);
    try {
      await reportIssue({
        type: errorType,
        message: errorMessage,
        context: {
          ...context,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          path: window.location.pathname
        },
        userId: user?._id,
        userEmail: user?.email
      });
      setReportSent(true);
      setTimeout(() => setReportSent(false), 3000);
    } catch (err) {
      console.error('Failed to send error report:', err);
      // Still show success to avoid frustrating the user
      setReportSent(true);
    } finally {
      setIsReporting(false);
    }
  };

  // ✅ Handle action button click
  const handleAction = () => {
    if (msg.action === 'Retry Now' || msg.action === 'Retry' || msg.action === 'Try Again') {
      onRetry?.();
    } else if (msg.action === 'Go to Login') {
      window.location.href = '/login';
    } else if (msg.action === 'View Plans') {
      window.location.href = '/pricing';
    } else if (msg.action === 'How to Export PDF') {
      window.open('https://support.google.com/docs/answer/183965?hl=en', '_blank');
    } else if (msg.action === 'Convert to PDF') {
      window.open('https://www.ilovepdf.com/', '_blank');
    } else if (msg.action === 'Compress PDF') {
      window.open('https://www.smallpdf.com/compress-pdf', '_blank');
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-2xl flex-shrink-0">{msg.icon}</span>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
            {msg.title}
          </h4>
          <p className="text-amber-700 dark:text-amber-300 text-sm mt-1 leading-relaxed">
            {msg.description}
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={handleAction}
              className="px-3 py-1.5 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium rounded-lg hover:bg-amber-200 dark:hover:bg-amber-700 transition"
            >
              {msg.action}
            </button>
            
            {/* Report Issue Button */}
            {!reportSent ? (
              <button
                onClick={handleReport}
                disabled={isReporting}
                className="px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition flex items-center gap-1 disabled:opacity-50"
                title="Help us fix this by sending anonymous error details"
              >
                {isReporting ? (
                  <>
                    <span className="animate-spin">⏳</span> Sending...
                  </>
                ) : (
                  <>
                    🛠️ Report this issue
                  </>
                )}
              </button>
            ) : (
              <span className="px-3 py-1.5 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                ✅ Thanks! Report sent
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Optional: Technical details toggle for power users */}
      {import.meta.env?.DEV && (
        <details className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
          <summary className="text-xs text-amber-500 dark:text-amber-400 cursor-pointer hover:text-amber-700">
            🔧 Technical details (for debugging)
          </summary>
          <pre className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-[10px] overflow-x-auto text-amber-800 dark:text-amber-200">
            {JSON.stringify({ errorType, errorMessage, context }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default UserFeedbackBanner;