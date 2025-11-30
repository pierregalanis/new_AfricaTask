import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import axios from 'axios';

const TaskerRating = ({ taskerId, showDetails = false, language = 'en' }) => {
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskerId) {
      fetchRating();
    }
  }, [taskerId]);

  const fetchRating = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/tasker/${taskerId}/rating`
      );
      setRating(response.data);
    } catch (error) {
      console.error('Error fetching rating:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-1 text-gray-400">
        <Star className="w-4 h-4" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  if (!rating || rating.total_reviews === 0) {
    return (
      <div className="flex items-center space-x-1 text-gray-400">
        <Star className="w-4 h-4" />
        <span className="text-sm">
          {language === 'en' ? 'No reviews yet' : 'Aucun avis'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold text-gray-900">{rating.average_rating}</span>
      </div>
      
      <span className="text-sm text-gray-600">
        ({rating.total_reviews} {language === 'en' ? 'review' : 'avis'}{rating.total_reviews > 1 ? 's' : ''})
      </span>
      
      {showDetails && (
        <span className="text-sm text-gray-500">
          • {rating.total_completed_tasks} {language === 'en' ? 'completed' : 'terminé'}{rating.total_completed_tasks > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

export default TaskerRating;
