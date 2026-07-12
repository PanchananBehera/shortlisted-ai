import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from '../MobileBottomNav';
import SidebarDrawer from '../SidebarDrawer';

const Navbar = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Desktop Nav Items (Hidden on Mobile)
  const desktopNavItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Interview', path: '/mock-interview' },
    { name: 'History', path: '/history' },
    { name: 'PacoBoard', path: '/paco-board' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop Navbar */}
      <header className="hidden md:flex items-center justify-between px-8 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-10">
          <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Shortlisted AI</span>
          </div>
          
          <nav className="flex items-center gap-1">
            {desktopNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.path)
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition text-xl">
            {isDark ? '☀️' : '🌙'}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-500/20">
            {user?.name?.[0] || 'U'}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <button onClick={() => setDrawerOpen(true)} className="p-2 -ml-2 text-gray-700 dark:text-gray-300 text-xl">
          ☰
        </button>
        
        <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-gray-900 dark:text-white text-lg">Shortlisted AI</span>
        </div>

        <button onClick={toggleTheme} className="p-2 text-gray-700 dark:text-gray-300 text-xl">
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Mobile Components */}
      <SidebarDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <MobileBottomNav />
    </>
  );
};

export default Navbar;