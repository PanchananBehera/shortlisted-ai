// client/tailwind.config.js - ESM FORMAT ✅
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#6366f1',
          500: '#4f46e5',
          600: '#4338ca',
        },
        surface: {
          light: '#f8fafc',
          card: '#ffffff',
          dark: '#0f172a',
          cardDark: '#1e293b',
        }
      },
      boxShadow: {
        soft: '0 2px 12px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}