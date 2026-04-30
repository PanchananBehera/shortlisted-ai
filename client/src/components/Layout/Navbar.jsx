import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 🧹 Dev-only: Clear localStorage for testing auth flows
  const handleClearData = () => {
    if (window.confirm('Clear all local data? This will log you out.')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  return (
    <nav className="bg-surface-card shadow-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🌿</span>
            <span className="font-serif text-xl font-semibold text-brand-800">
              Shortlisted AI
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 hover:text-brand-600 transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/applications" 
                  className="text-gray-600 hover:text-brand-600 transition-colors font-medium"
                >
                  Applications
                </Link>
                <Link 
                  to="/profile" 
                  className="text-gray-600 hover:text-brand-600 transition-colors font-medium"
                >
                  Profile
                </Link>
                <Link 
                  to="/resume-analyzer" 
                  className="text-gray-600 hover:text-brand-600 transition-colors font-medium"
                >
                  Resume Analyzer
                </Link>
                
                {/* User Name Display */}
                <span className="text-sm text-gray-500 hidden md:inline">
                  Hi, {user?.name?.split(' ')[0]}
                </span>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full hover:bg-brand-200 transition-colors font-medium"
                >
                  Logout
                </button>

                {/* 🧹 Dev-Only: Clear Data Button */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={handleClearData}
                    className="text-xs text-gray-400 hover:text-rose-500 transition px-2 py-1 rounded"
                    title="Clear localStorage (Dev Only)"
                  >
                    🧹
                  </button>
                )}
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-brand-600 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-brand-400 text-white px-6 py-2 rounded-full hover:bg-brand-500 transition-colors font-medium shadow-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;