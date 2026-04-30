import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import ApplicationDetail from './pages/ApplicationDetail';

// ✅ Import real pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ApplicationsList from './pages/ApplicationsList';
import ApplicationForm from './pages/ApplicationForm';
import Profile from './pages/Profile';
import ResumeAnalyzer from './pages/ResumeAnalyzer';

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Applications Module */}
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationsList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications/:id/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ApplicationDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Profile Route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Resume Analyzer Route */}
          <Route
            path="/resume-analyzer"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ResumeAnalyzer />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;