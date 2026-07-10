import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from '../MobileBottomNav';
import SidebarDrawer from '../SidebarDrawer';

const Navbar = ({ isDark, toggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const desktopNavItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Applications', path: '/applications' },
    { name: 'Profile', path: '/profile' },
    { name: 'Resume Analyzer', path: '/resume-analyzer' },
    { name: 'ATS Check', path: '/ats-check' },
    { name: 'Mock Interview', path: '/mock-interview' },
    { name: 'History', path: '/history' },
    { name: 'About', path: '/about' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'PacoBoard', path: '/paco-board' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop Navbar */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Shortlisted AI</span>
          </button>
          
          <nav className="flex items-center gap-1">
            {desktopNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
            {isDark ? '☀️' : '🌙'}
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Hi, {user?.name?.split(' ')[0]}</span>
          <button onClick={logout} className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            Logout
          </button>
        </div>
      </header>

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