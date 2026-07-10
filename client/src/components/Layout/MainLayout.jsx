// src/components/Layout/MainLayout.jsx
import React from 'react';
import Navbar from './Navbar';

const MainLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      {/* ✅ REMOVED min-h-screen to avoid conflict with App.jsx padding */}
      {/* ✅ Added pt-4 on mobile to account for mobile header height */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pt-4 md:pt-8">
        {children}
      </main>
    </>
  );
};

export default MainLayout;