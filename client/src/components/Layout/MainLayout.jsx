// src/components/Layout/MainLayout.jsx
import React from 'react';
import Navbar from './Navbar';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;