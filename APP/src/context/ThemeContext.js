import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark(prev => !prev);

  // Colour tokens for both modes — consumed by all screens
  const colors = isDark ? {
    bg: '#0A0F1E',
    surface: '#111827',
    card: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    text: '#F9FAFB',
    muted: '#6B7280',
    sub: '#9CA3AF',
    inputBg: '#1F2937',
    accent: '#6366F1',
    accentLight: 'rgba(99,102,241,0.15)',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
    gradBg: ['#0A0F1E', '#0D1321'],
    gradBrand: ['#1E3A8A', '#1E40AF', '#111827'],
  } : {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    card: 'rgba(0,0,0,0.03)',
    border: 'rgba(0,0,0,0.08)',
    text: '#111827',
    muted: '#6B7280',
    sub: '#9CA3AF',
    inputBg: '#F3F4F6',
    accent: '#6366F1',
    accentLight: 'rgba(99,102,241,0.10)',
    green: '#059669',
    amber: '#D97706',
    red: '#DC2626',
    blue: '#2563EB',
    purple: '#7C3AED',
    pink: '#DB2777',
    gradBg: ['#EEF2FF', '#F8FAFC'],
    gradBrand: ['#3B82F6', '#1E40AF', '#1E3A8A'],
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
