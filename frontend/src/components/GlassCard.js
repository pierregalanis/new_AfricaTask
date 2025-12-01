import React from 'react';

const GlassCard = ({ 
  children, 
  className = '', 
  hover = true,
  glow = false,
  gradient = false 
}) => {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-6
        backdrop-blur-xl border
        transition-all duration-500
        ${hover ? 'hover:scale-[1.02] hover:shadow-2xl' : ''}
        ${className}
      `}
      style={{
        background: gradient
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)'
          : 'rgba(31, 41, 55, 0.6)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
        boxShadow: glow
          ? '0 0 30px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Animated gradient overlay on hover */}
      {hover && (
        <div 
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(16, 185, 129, 0.15) 0%, transparent 50%)'
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
