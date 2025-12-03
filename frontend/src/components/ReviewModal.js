import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ReviewModal = ({ isOpen, onClose, task, taskerName, onReviewSuccess, language = 'en' }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(language === 'en' ? 'Please select a rating' : 'Veuillez sélectionner une note');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews`,
        {
          task_id: task.id,
          rating: rating,
          comment: comment.trim() || null
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success(language === 'en' ? '✅ Review submitted!' : '✅ Avis soumis!');
      onReviewSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMsg = error.response?.data?.detail || 
        (language === 'en' ? 'Failed to submit review' : 'Échec de la soumission de l\'avis');
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800/70 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-purple-600 to-emerald-500">
          <h2 className="text-xl font-bold text-white">
            {language === 'en' ? 'Leave a Review' : 'Laisser un avis'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Task Info */}
          <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {language === 'en' ? 'Task:' : 'Tâche:'}
            </p>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{task.title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {language === 'en' ? 'Tasker:' : 'Prestataire:'} <span className="font-medium text-gray-900 dark:text-white">{taskerName}</span>
            </p>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'Rate your experience' : 'Évaluez votre expérience'} *
            </label>
            <div className="flex items-center space-x-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                  disabled={submitting}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-base font-semibold text-gray-700 dark:text-gray-300">
                  {rating} {language === 'en' ? 'star' : 'étoile'}{rating > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'Your feedback (optional)' : 'Votre commentaire (optionnel)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder={
                language === 'en'
                  ? 'Share details about your experience...'
                  : 'Partagez les détails de votre expérience...'
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {comment.length} / 500
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              {language === 'en'
                ? '✓ Reviews cannot be edited after submission.'
                : '✓ Les avis ne peuvent pas être modifiés.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t bg-gray-50 dark:bg-gray-950 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:bg-gray-800 transition"
            disabled={submitting}
          >
            {language === 'en' ? 'Cancel' : 'Annuler'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting
              ? (language === 'en' ? 'Submitting...' : 'Envoi...')
              : (language === 'en' ? 'Submit Review' : 'Soumettre l\'avis')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
