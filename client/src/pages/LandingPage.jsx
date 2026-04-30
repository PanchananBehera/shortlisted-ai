import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: '✍️',
      title: 'AI Cover Letters',
      description: 'Generate professional cover letters instantly using Google Gemini AI. Just paste the job description.',
      color: 'bg-brand-100 text-brand-700',
    },
    {
      icon: '🎯',
      title: 'Interview Preparation',
      description: 'Get AI-generated interview questions and model answers tailored to your job applications.',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Visualize your placement journey with beautiful charts. Track applications, interviews, and offers.',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      icon: '📄',
      title: 'Resume Management',
      description: 'Upload and manage your resume securely. Attach to applications with Cloudinary integration.',
      color: 'bg-amber-100 text-amber-700',
    },
    {
      icon: '⏰',
      title: 'Follow-up Reminders',
      description: 'Never miss a follow-up. Set reminders for your applications and stay organized.',
      color: 'bg-rose-100 text-rose-700',
    },
    {
      icon: '🔍',
      title: 'Smart Search & Filter',
      description: 'Quickly find applications by company, role, or status. Real-time search and filtering.',
      color: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-light">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            {/* Logo/Icon */}
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 bg-brand-400 rounded-3xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">🌿</span>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-5xl lg:text-6xl font-serif text-gray-900 mb-6 leading-tight">
              Track Your Dream Job
              <span className="block text-brand-600">Journey with Shortlisted AI</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              The intelligent placement companion for engineering students. 
              Manage applications, generate AI-powered cover letters, and ace your interviews — all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="bg-brand-400 text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-brand-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="bg-brand-400 text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-brand-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/login"
                    className="bg-white text-brand-700 px-10 py-4 rounded-full text-lg font-semibold border-2 border-brand-200 hover:border-brand-400 hover:bg-brand-50 transition-all duration-300"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Trust Badge */}
            <p className="mt-8 text-sm text-gray-500">
              ✨ Built for tech aspirants • Free forever • No credit card required
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-brand-200 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-brand-300 rounded-full opacity-20 blur-2xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-gray-900 mb-4">
              Everything You Need to Land Your Dream Job
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to simplify your placement journey and boost your success rate.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-surface-light rounded-3xl p-8 hover:shadow-soft hover:shadow-brand-100/50 transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                {/* Icon */}
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3 font-serif">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 bg-surface-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">Get started in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Create Account',
                description: 'Sign up for free in less than a minute. No credit card required.',
              },
              {
                step: '2',
                title: 'Add Applications',
                description: 'Track all your job applications in one organized dashboard.',
              },
              {
                step: '3',
                title: 'Get AI Assistance',
                description: 'Generate cover letters and interview prep with AI instantly.',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-brand-400 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 font-serif">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-brand-400 to-brand-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-serif text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-brand-50 mb-10">
            Join hundreds of students who are already tracking their placements smarter.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-block bg-white text-brand-600 px-12 py-5 rounded-full text-lg font-bold hover:bg-brand-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Create Your Free Account →
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <span className="text-2xl">🌿</span>
              <span className="font-serif text-xl font-semibold text-white">
                AI Job Tracker
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Built with ❤️ for GIET University students
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>© 2026 AI Job Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;