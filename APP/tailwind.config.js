/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dark palette
        'dark-bg': '#0A0F1E',
        'dark-surface': '#111827',
        'dark-card': 'rgba(255,255,255,0.04)',
        'dark-border': 'rgba(255,255,255,0.08)',
        // Light palette
        'light-bg': '#F8FAFC',
        'light-surface': '#FFFFFF',
        'light-card': 'rgba(0,0,0,0.03)',
        'light-border': 'rgba(0,0,0,0.08)',
        // Accent
        accent: '#6366F1',
        'accent-light': 'rgba(99,102,241,0.15)',
        // Brand colors
        primary: '#6366F1',
        secondary: '#8B5CF6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
