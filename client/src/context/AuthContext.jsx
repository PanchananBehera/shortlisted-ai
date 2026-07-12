// src/context/AuthContext.jsx - PRODUCTION READY
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (!storedToken) {
          setLoading(false);
          return;
        }

        // Set token immediately for protected routes
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // Verify token with backend
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        
        if (res.data.success && res.data.user) {
          const freshUser = res.data.user;
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        }
      } catch (err) {
        console.warn('Auth init error:', err.message);
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ✅ Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const res = await api.post('/auth/login', { email, password });
      
      if (!res.data.success) {
        throw new Error(res.data.error || 'Login failed');
      }

      const newToken = res.data.token;
      const userData = res.data.user || res.data;
      
      // Save to localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setToken(newToken);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // ✅ Register function
  const register = async (fullName, email, password) => {
    try {
      setError(null);
      const res = await api.post('/auth/register', { fullName, email, password });
      
      if (!res.data.success) {
        throw new Error(res.data.error || 'Registration failed');
      }

      const newToken = res.data.token;
      const userData = res.data.user || res.data;
      
      // Save to localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setToken(newToken);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // ✅ Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};