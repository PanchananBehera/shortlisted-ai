/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 🎨 COLOR PALETTE (Inspired by the Serenity App)
      colors: {
        brand: {
          50: '#F4F9F4',  // Very light background
          100: '#E8F5E9', // Light green tint
          200: '#A5D6A7', // Soft accent
          300: '#81C784',
          400: '#66BB6A', // Primary Button Color
          500: '#4CAF50', // Hover state
          600: '#43A047', // Active state
          700: '#388E3C',
          800: '#2E7D32', // Dark text/elements
          900: '#1B5E20',
        },
        surface: {
          light: '#FAFAF8', // The creamy background color
          card: '#FFFFFF',  // White card background
        }
      },
      
      // 🔤 TYPOGRAPHY
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'], // Body text
        serif: ['"Playfair Display"', 'serif'],       // Elegant headings
      },

      //  UI SHAPES
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem', // For that pill/card shape
      },

      // ️ SOFT SHADOWS
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.04)',
        'hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}