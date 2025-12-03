import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Star, MessageCircle, User, Calendar, ArrowLeft } from 'lucide-react';
import { translations } from '../utils/translations';

const TaskerReviewsPage = () => {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/tasker/${user.id}`
      );
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/tasker/${user.id}/rating`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white dark:from-gray-950 dark:to-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tasker/dashboard')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{language === 'en' ? 'Back to Dashboard' : 'Retour au tableau de bord'}</span>
        </button>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-4">
            {language === 'en' ? 'My Reviews' : 'Mes Avis'}
          </h1>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                <span className="text-sm text-emerald-100 uppercase tracking-wide">
                  {language === 'en' ? 'Rating' : 'Note'}
                </span>
              </div>
              <p className="text-3xl font-bold">
                {stats?.average_rating?.toFixed(1) || '0.0'}
              </p>
            </div>

            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MessageCircle className="w-5 h-5 text-emerald-200" />
                <span className="text-sm text-emerald-100 uppercase tracking-wide">
                  {language === 'en' ? 'Reviews' : 'Avis'}
                </span>
              </div>
              <p className="text-3xl font-bold">
                {stats?.total_reviews || 0}
              </p>
            </div>

            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5 text-emerald-200" />
                <span className="text-sm text-emerald-100 uppercase tracking-wide">
                  {language === 'en' ? 'Tasks' : 'Tâches'}
                </span>
              </div>
              <p className="text-3xl font-bold">
                {stats?.total_completed_tasks || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-lg">
              <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {language === 'en' ? 'No Reviews Yet' : 'Aucun avis pour le moment'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' 
                  ? 'Complete more tasks to receive reviews from clients!' 
                  : 'Complétez plus de tâches pour recevoir des avis des clients!'}
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition"
              >
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {review.client_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {review.client_name || (language === 'en' ? 'Anonymous Client' : 'Client Anonyme')}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Star Rating */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Comment */}
                {review.comment && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      "{review.comment}"
                    </p>
                  </div>
                )}

                {/* Task Info */}
                {review.task_title && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'en' ? 'Task: ' : 'Tâche: '}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {review.task_title}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskerReviewsPage;
