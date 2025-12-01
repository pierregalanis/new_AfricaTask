import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const FavoriteButton = ({ taskerId, language = 'en', size = 'md' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFavorite();
  }, [taskerId]);

  const checkFavorite = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/favorites/check/${taskerId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setIsFavorite(response.data.is_favorite);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      if (isFavorite) {
        await axios.delete(
          `${process.env.REACT_APP_BACKEND_URL}/api/favorites/${taskerId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        setIsFavorite(false);
        toast.success(language === 'en' ? 'Removed from favorites' : 'Retiré des favoris');
      } else {
        const formData = new FormData();
        formData.append('tasker_id', taskerId);
        
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/favorites`,
          formData,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        setIsFavorite(true);
        toast.success(language === 'en' ? 'Added to favorites' : 'Ajouté aux favoris');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(
        error.response?.data?.detail ||
        (language === 'en' ? 'Failed to update favorites' : 'Échec de la mise à jour')
      );
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`${sizes[size]} rounded-full flex items-center justify-center transition-all duration-200 ${
        isFavorite
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} shadow-md hover:shadow-lg`}
      title={isFavorite 
        ? (language === 'en' ? 'Remove from favorites' : 'Retirer des favoris')
        : (language === 'en' ? 'Add to favorites' : 'Ajouter aux favoris')
      }
    >
      <Heart 
        className={`${iconSizes[size]} ${isFavorite ? 'fill-current' : ''} transition-transform ${loading ? 'animate-pulse' : 'hover:scale-110'}`} 
      />
    </button>
  );
};

export default FavoriteButton;
