import React from 'react';

const FancyButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon = null,
  loading = false
}) => {
  const variants = {
    primary: {
      base: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      hover: 'hover:from-emerald-600 hover:to-teal-700',
      shadow: 'shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70',
      glow: '0 0 20px rgba(16, 185, 129, 0.4)'
    },
    secondary: {
      base: 'bg-gradient-to-r from-gray-700 to-gray-800',
      hover: 'hover:from-gray-600 hover:to-gray-700',
      shadow: 'shadow-lg shadow-gray-500/30 hover:shadow-gray-500/50',
      glow: '0 0 15px rgba(107, 114, 128, 0.3)'
    },
    danger: {
      base: 'bg-gradient-to-r from-red-500 to-red-600',
      hover: 'hover:from-red-600 hover:to-red-700',
      shadow: 'shadow-lg shadow-red-500/50 hover:shadow-red-500/70',
      glow: '0 0 20px rgba(239, 68, 68, 0.4)'
    },
    glass: {
      base: 'bg-white/10 backdrop-blur-lg border border-emerald-500/30',
      hover: 'hover:bg-white/20 hover:border-emerald-500/50',
      shadow: 'shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40',
      glow: '0 0 15px rgba(16, 185, 129, 0.3)'
    }
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const currentVariant = variants[variant];
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden
        ${currentVariant.base}
        ${currentVariant.hover}
        ${currentVariant.shadow}
        ${sizes[size]}
        text-white font-semibold rounded-xl
        transform transition-all duration-300
        hover:scale-105 hover:-translate-y-0.5
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        group
        ${className}
      `}
      style={{
        boxShadow: disabled ? 'none' : undefined
      }}
    >
      {/* Shimmer effect */}
      <div 
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
        }}
      />
      
      {/* Glow on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
        style={{ background: currentVariant.glow }}
      />
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : icon}
        {children}
      </span>
    </button>
  );
};

export default FancyButton;
