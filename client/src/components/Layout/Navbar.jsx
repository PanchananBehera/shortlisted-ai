import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from '../MobileBottomNav';
import SidebarDrawer from '../SidebarDrawer';

const Navbar = ({ isDark, toggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getLinkClass = (path) => {
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
    }`;
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <Link to="/dashboard" className="flex items-center gap-2 mr-8">
                <span className="text-2xl">🌿</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
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
                <Link to="/mock-interview" className={getLinkClass('/mock-interview')}>
                  🎭 Mock Interview
                </Link>
                <Link to="/history" className={getLinkClass('/history')}>
                  📈 History
                </Link>
                <Link to="/about" className={getLinkClass('/about')}>
                  🌿 About
                </Link>
                {user?.isAdmin && (
                  <Link to="/admin/analytics" className={getLinkClass('/admin/analytics')}>
                    📊 Analytics
                  </Link>
                )}
                <Link to="/paco-board" className={getLinkClass('/paco-board')}>
                  🏁 PacoBoard
                </Link>
                {user?.isAdmin && (
                  <Link to="/admin/errors" className={getLinkClass('/admin/errors')}>
                    🐛 Errors
                  </Link>
                )}
              </div>
            </div>

            {/* User Menu + Dark Mode Toggle */}
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block transition-colors">
                  Hi, {(user.fullName || user.name)?.split(' ')[0]}
                </span>
              )}
              
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-600 dark:text-gray-400"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                  </svg>
                )}
              </button>
              
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <button onClick={() => setDrawerOpen(true)} className="p-2 text-gray-700 dark:text-gray-300">
          ☰
        </button>
        
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-gray-900 dark:text-white">Shortlisted AI</span>
        </button>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 text-gray-700 dark:text-gray-300">
            {isDark ? '☀️' : '🌙'}
          </button>
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]}
          </div>
        </div>
      </header>

      {/* Mobile Components */}
      <SidebarDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} toggleTheme={toggleTheme} isDark={isDark} />
      <MobileBottomNav />
    </>
  );
};

export default Navbar;