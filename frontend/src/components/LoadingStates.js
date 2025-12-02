import React from 'react';

// Skeleton Loader Components
export const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden">
    <div className="animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem' }}>
          {[...Array(cols)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="px-6 py-4 border-b border-gray-100">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem' }}>
            {[...Array(cols)].map((_, colIdx) => (
              <div key={colIdx} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonProfile = () => (
  <div className="bg-white rounded-xl shadow-md p-8 animate-pulse">
    <div className="flex items-center space-x-6 mb-6">
      <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
      <div className="flex-1 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

export const SpinnerLoader = ({ size = 'md', color = 'orange' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    orange: 'border-emerald-600',
    blue: 'border-blue-600',
    green: 'border-green-600',
    white: 'border-white'
  };

  return (
    <div className={`${sizes[size]} border-4 ${colors[color]} border-t-transparent rounded-full animate-spin`}></div>
  );
};

export const FullPageLoader = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
    <div className="text-center">
      <SpinnerLoader size="xl" />
      {message && <p className="mt-4 text-gray-600 font-medium">{message}</p>}
    </div>
  </div>
);

export const InlineLoader = ({ message }) => (
  <div className="flex items-center justify-center space-x-3 py-8">
    <SpinnerLoader size="md" />
    {message && <span className="text-gray-600">{message}</span>}
  </div>
);
