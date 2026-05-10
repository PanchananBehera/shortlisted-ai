// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      const { token, ...userData } = res.data;
      login(token, userData);
      navigate('/dashboard');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full">
        
        {/* Card Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8 sm:p-10 border border-gray-200/50 dark:border-slate-800 transition-colors">
          
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center mb-4 group">
              <div className="w-14 h-14 bg-green-500 dark:bg-green-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-all">
                <span className="text-2xl">🌿</span>
              </div>
            </Link>
            <h1 className="text-3xl font-serif text-gray-900 dark:text-white mb-2 transition-colors">
              Create Your Account
            </h1>
            <p className="text-gray-600 dark:text-gray-400 transition-colors">
              Start tracking your placement journey today
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm text-center transition-colors">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Full Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Chintu"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="you@university.edu"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength="8"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500 transition-colors">Minimum 8 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200/50 dark:border-slate-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-slate-600 text-green-600 dark:text-green-400 focus:ring-green-500 bg-gray-50 dark:bg-slate-800"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                I agree to the{' '}
                <a href="#" className="text-green-600 dark:text-green-400 hover:underline transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-green-600 dark:text-green-400 hover:underline transition-colors">Privacy Policy</a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 dark:bg-green-600 text-white py-3 px-4 rounded-full font-semibold hover:bg-green-600 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-900 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider & Login Link */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/50 dark:border-slate-800 transition-colors"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 transition-colors">
                  Already have an account?
                </span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link to="/login" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold transition-colors">
                Sign in instead →
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-500 transition-colors">
          Built for tech aspirants • Free forever • No credit card required
        </p>
      </div>
    </div>
  );
};

export default Register;