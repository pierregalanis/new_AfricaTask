import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 overflow-hidden group"
      style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' 
          : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
      }}
      aria-label="Toggle theme"
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDarkMode
            ? 'radial-gradient(circle at center, rgba(16, 185, 129, 0.4) 0%, transparent 70%)'
            : 'radial-gradient(circle at center, rgba(251, 191, 36, 0.4) 0%, transparent 70%)'
        }}
      />
      
      {/* Sliding circle */}
      <div
        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isDarkMode ? 'left-0.5' : 'left-7'
        } group-hover:scale-110`}
        style={{
          boxShadow: isDarkMode 
            ? '0 0 10px rgba(16, 185, 129, 0.5)' 
            : '0 0 10px rgba(251, 191, 36, 0.5)'
        }}
      >
        {isDarkMode ? (
          <Moon className="w-4 h-4 text-emerald-600" />
        ) : (
          <Sun className="w-4 h-4 text-amber-600" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
