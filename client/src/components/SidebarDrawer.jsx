import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, SearchCheck, Briefcase, BarChart3, Info, Bug, Sun, Moon, LogOut } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext'; // ✅ Import Theme Context

const drawerItems = [
  { name: 'Resume Analyzer', path: '/resume-analyzer', icon: FileText },
  { name: 'ATS Check', path: '/ats-check', icon: SearchCheck },
  { name: 'Applications', path: '/applications', icon: Briefcase },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'About Us', path: '/about', icon: Info },
  { name: 'Bug Reports', path: '/errors', icon: Bug },
];

const SidebarDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useContext(ThemeContext);

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 z-50 md:hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
              <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon size={20} className="text-gray-500 dark:text-gray-400" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer (Theme & Logout) */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                {isDark ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-blue-500" />}
                <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button
                onClick={() => { /* logout logic */; onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidebarDrawer;