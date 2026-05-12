// src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: '✍️',
      title: 'AI Cover Letters',
      description: 'Generate professional cover letters instantly using Google Gemini AI.',
    },
    {
      icon: '🎯',
      title: 'Interview Preparation',
      description: 'Get AI-generated interview questions tailored to your job applications.',
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Visualize your placement journey with beautiful charts and insights.',
    },
    {
      icon: '📄',
      title: 'Resume Management',
      description: 'Upload and manage your resume securely with Cloudinary integration.',
    },
    {
      icon: '⏰',
      title: 'Follow-up Reminders',
      description: 'Never miss a follow-up. Set reminders and stay organized.',
    },
    {
      icon: '🔍',
      title: 'Smart Search & Filter',
      description: 'Quickly find applications by company, role, or status.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-slate-950 transition-colors duration-300">
      {/* Subtle Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-green-200/30 dark:bg-green-900/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-emerald-200/20 dark:bg-emerald-900/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-lime-200/20 dark:bg-lime-900/10 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section - Anthropic Style */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-500 dark:bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl">🌿</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-gray-900 dark:text-white text-center leading-[1.1] mb-6 transition-colors">
          Track Your Dream Job
          <span className="block text-green-600 dark:text-green-400 transition-colors mt-2">
            Journey with Shortlisted AI
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 text-center max-w-2xl leading-relaxed mb-10 transition-colors">
          The intelligent placement companion for engineering students. Manage applications, generate AI-powered cover letters, and ace your interviews — all in one place.
        </p>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <Link
              to="/register"
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          )}
        </div>

        {/* Trust Badge */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-500 flex items-center gap-2">
          <span>✨</span>​𝙱𝚞𝚒𝚕𝚝 𝚏𝚘𝚛 𝚝𝚎𝚌𝚑 𝚊𝚜𝚙𝚒𝚛𝚊𝚗𝚝𝚜 • 𝚏𝚛𝚎𝚎 𝚏𝚘𝚛𝚎𝚟𝚎𝚛 • 𝚗𝚘 𝚌𝚛𝚎𝚍𝚒𝚝 𝚌𝚊𝚛𝚍 𝚛𝚎𝚚𝚞𝚒𝚛𝚎𝚍
        </p>
      </section>

      {/* Features Section - Clean Grid */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-4 transition-colors">
              Everything You Need
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto transition-colors">
              Powerful features designed to simplify your placement journey.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-slate-900 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-slate-800"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 font-serif transition-colors">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Minimal */}
      <section className="relative z-10 py-24 px-4 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-12 transition-colors">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Create Account',
                description: 'Sign up for free in less than a minute.',
              },
              {
                step: '2',
                title: 'Add Applications',
                description: 'Track all your job applications in one dashboard.',
              },
              {
                step: '3',
                title: 'Get AI Assistance',
                description: 'Generate cover letters and interview prep instantly.',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-green-500 dark:bg-green-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4 shadow-md">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 font-serif transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Clean */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 dark:text-white mb-6 transition-colors">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 transition-colors">
            Join hundreds of students tracking their placements smarter.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-block bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Create Your Free Account →
            </Link>
          )}
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-slate-800 py-8 px-4 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <span className="font-serif font-semibold text-gray-900 dark:text-white transition-colors">
              Shortlisted AI
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">
          ᴄʀᴀꜰᴛᴇᴅ & ᴇɴɢɪɴᴇᴇʀᴇᴅ ʙʏ ℙᴀɴᴄʜᴀɴᴀɴ 𝔹ᴇʜᴇʀᴀ 🎨🔧
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;