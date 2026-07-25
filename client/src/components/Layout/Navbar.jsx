import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Desktop Navigation Items
  const desktopNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Applications', path: '/applications', icon: '📋' },
    { name: 'Profile', path: '/profile', icon: '' },
    { name: 'Resume Analyzer', path: '/resume-analyzer', icon: '✨' },
    { name: 'ATS Check', path: '/ats-checker', icon: '🔍' },
    { name: 'Mock Interview', path: '/mock-interview', icon: '🎭' },
    { name: 'History', path: '/history', icon: '📈' },
    { name: 'About', path: '/about', icon: '🌿' },
  ];

  // Mobile Bottom Tab Items (Main 5)
  const mobileTabItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Interview', path: '/mock-interview', icon: '🎭' },
    { name: 'History', path: '/history', icon: '📁' },
    { name: 'PacoBoard', path: '/paco-board', icon: '🏆' },
    { name: 'Profile', path: '/profile', icon: '' },
  ];

  // Drawer Menu Items (Secondary)
  const drawerItems = [
    { name: 'Applications', path: '/applications', icon: '📋' },
    { name: 'Resume Analyzer', path: '/resume-analyzer', icon: '' },
    { name: 'ATS Check', path: '/ats-checker', icon: '🔍' },
    { name: 'Analytics', path: '/analytics', icon: '' },
    { name: 'About Us', path: '/about', icon: '️' },
    { name: 'Bug Reports', path: '/errors', icon: '' },
  ];

  const isActive = (path) => location.pathname === path;

  // Desktop Link Class
  const getLinkClass = (path) => {
    const active = isActive(path);
    return `px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-1 ${
      active 
        ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-green-50 dark:bg-green-900/20' 
        : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
    }`;
  };

  return (
    <>
      {/* ===== DESKTOP NAVBAR (Unchanged) ===== */}
      <nav className="hidden md:block bg-white dark:bg-slate-900 border-b border-gray-200/50 dark:border-slate-800 sticky top-0 z-40 transition-colors">
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
            <div className="flex items-center gap-1">
              {desktopNavItems.map((item) => (
                <Link key={item.path} to={item.path} className={getLinkClass(item.path)}>
                  {item.icon} {item.name}
                </Link>
              ))}
              
              {/* Admin Links */}
              {user?.isAdmin && (
                <>
                  <Link to="/admin/analytics" className={getLinkClass('/admin/analytics')}>
                    🧠 Analytics
                  </Link>
                  <Link to="/admin/errors" className={getLinkClass('/admin/errors')}>
                    🐛 Errors
                  </Link>
                </>
              )}
            </div>

            {/* User Menu + Dark Mode */}
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden lg:block">
                  Hi, {(user.fullName || user.name)?.split(' ')[0]}
                </span>
              )}
              
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-600 dark:text-gray-400"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              
              {/* ✅ Logout Button with Door Emoji */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition flex items-center gap-1"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MOBILE HEADER (Different from Desktop) ===== */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
        {/* Hamburger Menu Button */}
        <button 
          onClick={() => setDrawerOpen(true)} 
          className="p-2 -ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <span className="text-2xl">☰</span>
        </button>
        
        {/* Logo */}
        <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-gray-900 dark:text-white text-lg">Shortlisted AI</span>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="p-2 text-gray-700 dark:text-gray-300"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 z-50 pb-safe">
        <div className="flex justify-around items-center h-16 px-1">
          {mobileTabItems.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                  active 
                    ? 'text-green-600 dark:text-green-400 scale-105' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.name}</span>
                {active && <div className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===== MOBILE SLIDE-OUT DRAWER ===== */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 z-50 md:hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
                <button 
                  onClick={() => setDrawerOpen(false)} 
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  
                </button>
              </div>

              {/* Drawer Items */}
              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {drawerItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setDrawerOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </button>
                ))}
                
                {/* Admin Items */}
                {user?.isAdmin && (
                  <>
                    <div className="border-t border-gray-200 dark:border-slate-800 my-2" />
                    <button
                      onClick={() => {
                        navigate('/admin/analytics');
                        setDrawerOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                      <span className="text-lg">📊</span>
                      <span className="font-medium">Analytics</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/admin/errors');
                        setDrawerOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                      <span className="text-lg"></span>
                      <span className="font-medium">Bug Reports</span>
                    </button>
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => {
                    toggleTheme();
                    setDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                  <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                {/* ✅ Logout Button with Door Emoji (Mobile) */}
                <button
                  onClick={() => {
                    handleLogout();
                    setDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <span className="text-lg">🚪</span>
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;