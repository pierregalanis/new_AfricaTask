import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const FavoriteButton = ({ taskerId, size = 'md' }) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  useEffect(() => {
    checkFavoriteStatus();
  }, [taskerId]);

  const checkFavoriteStatus = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/favorites/check/${taskerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsFavorite(response.data.is_favorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async (e) => {
    e.stopPropagation(); // Prevent parent click events
    
    if (!user) {
      toast.error('Please login to add favorites');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(
          `${API_URL}/api/favorites/${taskerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const formData = new FormData();
        formData.append('tasker_id', taskerId);
        
        await axios.post(
          `${API_URL}/api/favorites`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(error.response?.data?.detail || 'Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'client') return null;

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`
        ${sizes[size]}
        rounded-full
        flex items-center justify-center
        transition-all duration-300
        ${isFavorite 
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
          : 'bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-emerald-500/30 text-gray-600 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-500'
        }
        hover:scale-110
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        group
      `}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`
          ${iconSizes[size]}
          transition-all duration-300
          ${isFavorite ? 'fill-current' : 'group-hover:fill-current'}
        `}
      />
    </button>
  );
};

export default FavoriteButton;
