import React, { useState, useEffect } from 'react';
import { Shield, Star, Award, CheckCircle, Zap, FileCheck } from 'lucide-react';
import axios from 'axios';

const BadgeDisplay = ({ taskerId, showTooltip = true }) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchBadges();
  }, [taskerId]);

  const fetchBadges = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/badges/tasker/${taskerId}`);
      setBadges(response.data);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (icon) => {
    const iconMap = {
      '✓': <CheckCircle className="w-full h-full" />,
      '⭐': <Star className="w-full h-full" />,
      '🏆': <Award className="w-full h-full" />,
      '💯': <Shield className="w-full h-full" />,
      '⚡': <Zap className="w-full h-full" />,
      '📜': <FileCheck className="w-full h-full" />
    };
    return iconMap[icon] || <Shield className="w-full h-full" />;
  };

  const getColorClasses = (color) => {
    const colorMap = {
      emerald: 'bg-emerald-500 dark:bg-emerald-600 text-white',
      yellow: 'bg-yellow-500 dark:bg-yellow-600 text-white',
      teal: 'bg-teal-500 dark:bg-teal-600 text-white',
      blue: 'bg-blue-500 dark:bg-blue-600 text-white',
      purple: 'bg-purple-500 dark:bg-purple-600 text-white'
    };
    return colorMap[color] || colorMap.emerald;
  };

  if (loading || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, index) => (
        <div
          key={index}
          className="group relative"
        >
          {/* Badge */}
          <div
            className={`
              ${getColorClasses(badge.color)}
              w-8 h-8 rounded-full
              flex items-center justify-center
              shadow-lg
              transition-all duration-300
              hover:scale-110
              cursor-help
            `}
            style={{
              boxShadow: `0 0 20px ${badge.color === 'emerald' ? 'rgba(16, 185, 129, 0.4)' : 
                                      badge.color === 'yellow' ? 'rgba(234, 179, 8, 0.4)' : 
                                      badge.color === 'teal' ? 'rgba(20, 184, 166, 0.4)' : 
                                      badge.color === 'blue' ? 'rgba(59, 130, 246, 0.4)' : 
                                      'rgba(168, 85, 247, 0.4)'}`
            }}
          >
            {getBadgeIcon(badge.icon)}
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div className="
              absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
              opacity-0 group-hover:opacity-100
              pointer-events-none
              transition-all duration-300
              z-50
            ">
              <div className="glass-card px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {badge.name_en}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {badge.description_en}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BadgeDisplay;
