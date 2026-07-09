// src/App.jsx - PRODUCTION READY with PacoBoard Gamification
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// ✅ Context Providers
import { AuthProvider } from './context/AuthContext';
import { RealTimeProvider } from './context/RealTimeContext';

// ✅ Layout Components
import MainLayout from './components/Layout/MainLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';

// ✅ Page Imports
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ApplicationsList from './pages/ApplicationsList';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationDetail from './pages/ApplicationDetail';
import Profile from './pages/Profile';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import ATSChecker from './pages/ATSChecker';
import History from './pages/History';
import AboutUs from './pages/AboutUs';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import ErrorReports from './pages/ErrorReports';
import MockInterview from './pages/MockInterview';
import PacoBoard from './pages/PacoBoard'; // ✅ PacoBoard imported

function App() {
  return (
    <Router>
      <AuthProvider>
        <RealTimeProvider>
          <Routes>
            {/* ===== PUBLIC ROUTES ===== */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={
              <MainLayout>
                <AboutUs />
              </MainLayout>
            } />

            {/* ===== PROTECTED ROUTES ===== */}
            
            {/* Dashboard */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Applications Module */}
            <Route path="/applications" element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationsList />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/applications/new" element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationForm />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/applications/:id/edit" element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationForm />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/applications/:id" element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationDetail />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Profile */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* AI Tools */}
            <Route path="/resume-analyzer" element={
              <ProtectedRoute>
                <MainLayout>
                  <ResumeAnalyzer />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/ats-checker" element={
              <ProtectedRoute>
                <MainLayout>
                  <ATSChecker />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* ✅ AI Avatar Mock Interview */}
            <Route path="/mock-interview" element={
              <ProtectedRoute>
                <MainLayout>
                  <MockInterview />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* ✅ NEW: PacoBoard - Gamification & Progress */}
            <Route path="/paco-board" element={
              <ProtectedRoute>
                <MainLayout>
                  <PacoBoard />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* History */}
            <Route path="/history" element={
              <ProtectedRoute>
                <MainLayout>
                  <History />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* ===== ADMIN ROUTES ===== */}
            <Route path="/admin/analytics" element={
              <ProtectedRoute adminOnly={true}>
                <MainLayout>
                  <AdvancedAnalytics />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/errors" element={
              <ProtectedRoute adminOnly={true}>
                <MainLayout>
                  <ErrorReports />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* ===== 404 FALLBACK ===== */}
            <Route path="*" element={
              <MainLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                  <span className="text-6xl mb-4">🔍</span>
                  <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                    Page Not Found
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The page you're looking for doesn't exist or has been moved.
                  </p>
                  <a href="/" className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition">
                    ← Back to Home
                  </a>
                </div>
              </MainLayout>
            } />
          </Routes>
        </RealTimeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;