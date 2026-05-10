// src/components/Layout/Navbar.jsx
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDarkMode } = useDarkMode();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ Helper: Returns active/inactive classes based on current path
  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-1 ${
      isActive 
        ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-green-50 dark:bg-green-900/20' 
        : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
    } transition-colors`;
  };

  // ✅ Helper for mobile nav (shorter version)
  const getMobileClass = (path) => {
    const isActive = location.pathname === path;
    return `px-3 py-1.5 text-xs font-medium rounded-lg ${
      isActive 
        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' 
        : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800'
    } transition-colors`;
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-gray-200/50 dark:border-slate-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-xl">🌿</span>
            </div>
            <span className="font-serif font-bold text-xl text-gray-900 dark:text-white transition-colors">
              Shortlisted AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/dashboard" className={getLinkClass('/dashboard')}>
              📊 Dashboard
            </Link>
            <Link to="/applications" className={getLinkClass('/applications')}>
              📋 Applications
            </Link>
            <Link to="/profile" className={getLinkClass('/profile')}>
              👤 Profile
            </Link>
            <Link to="/resume-analyzer" className={getLinkClass('/resume-analyzer')}>
              ✨ Resume Analyzer
            </Link>
            <Link to="/ats-checker" className={getLinkClass('/ats-checker')}>
              🔍 ATS Check
            </Link>
            <Link to="/history" className={getLinkClass('/history')}>
              📈 History
            </Link>
            {/* ✅ NEW: About Link */}
            <Link to="/about" className={getLinkClass('/about')}>
              🌿About
            </Link>
          </div>

          {/* User Menu + Dark Mode Toggle */}
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block transition-colors">
                Hi, {user.name?.split(' ')[0]}
              </span>
            )}
            
            {/* 🌙 Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-600 dark:text-gray-400"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? (
                // ☀️ Sun icon (switch to light)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              ) : (
                // 🌙 Moon icon (switch to dark)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              )}
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200/50 dark:border-slate-800 px-4 py-3 transition-colors">
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard" className={getMobileClass('/dashboard')}>📊</Link>
          <Link to="/applications" className={getMobileClass('/applications')}>📋</Link>
          <Link to="/profile" className={getMobileClass('/profile')}>👤</Link>
          <Link to="/resume-analyzer" className={getMobileClass('/resume-analyzer')}>✨</Link>
          <Link to="/ats-checker" className={getMobileClass('/ats-checker')}>🔍</Link>
          <Link to="/history" className={getMobileClass('/history')}>📈</Link>
          {/* ✅ NEW: Mobile About Link */}
          <Link to="/about" className={getMobileClass('/about')}>🌿</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;