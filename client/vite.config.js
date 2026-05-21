import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached aggressively, changes rarely
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Charting library — heavy, only needed on Dashboard/History/Analytics
          'vendor-charts': ['recharts'],

          // PDF generation — very heavy, only needed on ResumeAnalyzer/ATSChecker
          'vendor-pdf': ['jspdf'],

          // Icon library — medium, used everywhere but separating helps caching
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});