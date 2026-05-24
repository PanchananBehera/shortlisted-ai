import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // ✅ Show loader while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf8] dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  // ✅ Only redirect if NOT loading AND NOT authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ Admin check
  if (adminOnly && !user?.isAdmin) {
    return <Navigate to="/dashboard" state={{ message: 'Admin access required' }} replace />;
  }

  return children;
};

export default ProtectedRoute;