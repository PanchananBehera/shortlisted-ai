// src/pages/AboutUs.jsx
import React from 'react';

const AboutUs = () => {
  // 🔧 EDIT THESE WITH YOUR ACTUAL DETAILS
  const contactDetails = [
    { icon: '📧', label: 'Email', value: 'beherapanchanan933@gmail.com', link: 'mailto:beherapanchanan933@gmail.com' },
    { icon: 'ℹ️', label: 'LinkedIn', value: 'linkedin.com/in/%20panchanan-behera-678959291', link: 'https://linkedin.com/in/%20panchanan-behera-678959291' },
    { icon: '💻', label: 'GitHub', value: 'github.com/PanchananBehera', link: 'https://github.com/PanchananBehera' },
    { icon: '📞', label: 'Contact', value: '+91 84558 10080', link: 'tel:+918455810080' }
  ];

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-slate-950 transition-colors duration-300">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 transform hover:scale-105 transition-transform duration-300">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4">About Shortlisted AI</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            The intelligent placement companion built to help engineering students track applications, 
            optimize resumes, and ace interviews — all powered by AI.
          </p>
        </div>
      </section>

      {/* Mission / Why It Exists */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors">
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-4">🎯 Why We Built This</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            The placement process is overwhelming, disorganized, and often leaves students guessing. 
            Shortlisted AI was created to bring clarity, automation, and confidence to every step of your job search journey. 
            Built by a student, for students.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 transition-colors">
              <span className="text-3xl mb-3 block">✨</span>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">AI-Powered</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Smart resume optimization & tailored cover letters</p>
            </div>
            <div className="text-center p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 transition-colors">
              <span className="text-3xl mb-3 block">📊</span>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Data-Driven</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track progress with visual analytics & insights</p>
            </div>
            <div className="text-center p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 transition-colors">
              <span className="text-3xl mb-3 block">🎓</span>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Student-First</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Designed for modern placement workflows</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Social Details */}
      <section className="py-12 px-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-8 text-center">📬 Connect With Me</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {contactDetails.map((item, index) => (
              <a 
                key={index}
                href={item.link || '#'}
                target={item.link ? '_blank' : undefined}
                rel={item.link ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all group"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{item.label}</p>
                  <p className="text-gray-900 dark:text-white font-medium truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {item.value}
                  </p>
                </div>
                {item.link && (
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;