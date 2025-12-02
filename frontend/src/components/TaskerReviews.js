import React, { useState, useEffect } from 'react';
import { Star, Languages, User } from 'lucide-react';
import axios from 'axios';

const TaskerReviews = ({ taskerId, language = 'en' }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translatedTexts, setTranslatedTexts] = useState({});
  const [translating, setTranslating] = useState({});
  const [showTranslation, setShowTranslation] = useState({}); // Track which reviews show translation

  useEffect(() => {
    if (taskerId) {
      fetchReviews();
    }
  }, [taskerId]);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/tasker/${taskerId}`
      );
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const translateText = async (reviewId, text, targetLang) => {
    const cacheKey = `${reviewId}_${targetLang}`;
    
    // If already translated, just toggle display for THIS review only
    if (translatedTexts[cacheKey]) {
      setShowTranslation(prev => ({
        ...prev,
        [reviewId]: !prev[reviewId]
      }));
      return;
    }

    // Set translating state for THIS review only
    setTranslating(prev => ({
      ...prev,
      [reviewId]: true
    }));

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/translate`,
        {
          text: text,
          target_lang: targetLang
        }
      );

      // Store translation with unique cache key
      setTranslatedTexts(prev => ({
        ...prev,
        [cacheKey]: response.data.translated_text
      }));
      
      // Show translation for THIS review only
      setShowTranslation(prev => ({
        ...prev,
        [reviewId]: true
      }));
    } catch (error) {
      console.error('Translation error for review', reviewId, ':', error);
    } finally {
      setTranslating(prev => ({
        ...prev,
        [reviewId]: false
      }));
    }
  };

  const getDisplayText = (reviewId, originalText, currentLang) => {
    const cacheKey = `${reviewId}_${currentLang}`;
    const isShowingTranslation = showTranslation[reviewId];
    
    // Show translation only if toggle is on AND translation exists
    if (isShowingTranslation && translatedTexts[cacheKey]) {
      return translatedTexts[cacheKey];
    }
    
    return originalText;
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', options);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">
          {language === 'en' ? 'Loading reviews...' : 'Chargement des avis...'}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-950 rounded-lg">
        <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 text-lg">
          {language === 'en' ? 'No reviews yet' : 'Aucun avis pour le moment'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">
        {language === 'en' ? 'Client Reviews' : 'Avis des clients'} ({reviews.length})
      </h3>

      <div className="space-y-4">
        {reviews.map((review) => {
          const reviewId = review.id; // Backend returns 'id', not 'review_id'
          const targetLang = language === 'en' ? 'en' : 'fr';
          const displayText = getDisplayText(reviewId, review.comment, targetLang);
          const isTranslated = showTranslation[reviewId] && translatedTexts[`${reviewId}_${targetLang}`];

          return (
            <div
              key={reviewId}
              className="bg-white dark:bg-gray-800/70 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header: Rating and Date */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-2">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      {renderStars(review.rating)}
                      <span className="text-sm font-semibold text-gray-700">
                        {review.rating}.0
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                </div>

                {/* Translate Button */}
                {review.comment && (
                  <button
                    onClick={() => translateText(reviewId, review.comment, targetLang)}
                    disabled={translating[reviewId]}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title={language === 'en' ? 'Translate' : 'Traduire'}
                  >
                    <Languages className="w-4 h-4" />
                    <span>
                      {translating[reviewId]
                        ? '...'
                        : isTranslated
                        ? (language === 'en' ? 'Original' : 'Original')
                        : (language === 'en' ? 'Translate' : 'Traduire')}
                    </span>
                  </button>
                )}
              </div>

              {/* Review Comment */}
              {review.comment && (
                <div className="mt-3">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {displayText}
                  </p>
                  {isTranslated && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center space-x-1">
                      <Languages className="w-3 h-3" />
                      <span>{language === 'en' ? 'Translated' : 'Traduit'}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskerReviews;
