import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Video, FolderKanban, Trophy, User } from 'lucide-react'; // ✅ Professional Icons

const tabs = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Interview', path: '/mock-interview', icon: Video },
  { name: 'History', path: '/history', icon: FolderKanban },
  { name: 'PacoBoard', path: '/paco-board', icon: Trophy },
  { name: 'Profile', path: '/profile', icon: User },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 md:hidden z-50 pb-safe">
      <div className="flex justify-around items-center h-16 px-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 ${
                isActive 
                  ? 'text-emerald-600 dark:text-emerald-400 scale-105' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">{tab.name}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;