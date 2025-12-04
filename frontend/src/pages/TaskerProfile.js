import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TaskerReviews from '../components/TaskerReviews';
import { Star, MapPin, Briefcase, Clock, Award, ArrowLeft } from 'lucide-react';

const TaskerProfile = () => {
  const { taskerId } = useParams();
  const navigate = useNavigate();
  const { language } = useAuth();
  const [tasker, setTasker] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const t = (key) => translations[language][key] || key;

  useEffect(() => {
    if (taskerId) {
      fetchTaskerDetails();
      fetchTaskerStats();
    }
  }, [taskerId]);

  const fetchTaskerDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/${taskerId}`
      );
      setTasker(response.data);
    } catch (error) {
      console.error('Error fetching tasker:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskerStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/tasker/${taskerId}/rating`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleBookNow = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    navigate(`/book-tasker/${taskerId}${category ? `?category=${category}` : ''}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!tasker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl text-red-600">
            {language === 'en' ? 'Tasker not found' : 'Tasker non trouvé'}
          </div>
        </div>
      </div>
    );
  }

  const profile = tasker.tasker_profile || {};
  
  // Get category from URL to determine which service pricing to show
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  
  // Find matching service based on category
  const services = profile.services || [];
  const matchingService = categoryParam 
    ? services.find(s => typeof s === 'object' && s.category === categoryParam)
    : services.find(s => typeof s === 'object');
  
  // Determine pricing details
  const pricingType = matchingService?.pricing_type || 'hourly';
  const hourlyRate = matchingService?.hourly_rate || profile.hourly_rate || 0;
  const fixedPrice = matchingService?.fixed_price || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{language === 'en' ? 'Back' : 'Retour'}</span>
        </button>

        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800/70 rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {profile.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={tasker.full_name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-emerald-100"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-4xl font-bold">
                  {tasker.full_name?.charAt(0) || 'T'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {tasker.full_name}
              </h1>
              
              {/* Rating */}
              {stats && (
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-semibold text-gray-900">
                      {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '0.0'}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    ({stats.total_reviews} {language === 'en' ? 'reviews' : 'avis'})
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {stats.total_completed_tasks} {language === 'en' ? 'tasks completed' : 'tâches terminées'}
                  </span>
                </div>
              )}

              {/* Location */}
              {tasker.city && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{tasker.city}</span>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {profile.bio}
                </p>
              )}

              {/* Pricing Display */}
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-600" />
                {pricingType === 'fixed' ? (
                  <div>
                    <span className="text-2xl font-bold text-emerald-600">
                      {fixedPrice.toLocaleString()} CFA
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({language === 'en' ? 'Fixed Price' : 'Prix fixe'})
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-emerald-600">
                    {hourlyRate.toLocaleString()} CFA/hr
                  </span>
                )}
              </div>

              {/* Book Button */}
              <button
                onClick={handleBookNow}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 transition-all shadow-md"
              >
                {language === 'en' ? 'Book Now' : 'Réserver maintenant'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-md p-6 border-t-4 border-yellow-400">
              <div className="flex items-center space-x-3 mb-2">
                <Star className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'en' ? 'Average Rating' : 'Note moyenne'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '0.0'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-md p-6 border-t-4 border-green-400">
              <div className="flex items-center space-x-3 mb-2">
                <Briefcase className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'en' ? 'Completed Tasks' : 'Tâches terminées'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_completed_tasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-md p-6 border-t-4 border-blue-400">
              <div className="flex items-center space-x-3 mb-2">
                <Award className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">
                    {language === 'en' ? 'Total Reviews' : 'Avis totaux'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_reviews}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {profile.services && profile.services.length > 0 && (
          <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {language === 'en' ? 'Services Offered' : 'Services proposés'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.services.map((service, idx) => {
                let displayText = '';
                if (typeof service === 'string') {
                  // Old format - just service name
                  displayText = service;
                } else if (service.category && service.subcategory) {
                  // New format - show category → subcategory
                  displayText = `${service.category} → ${service.subcategory}`;
                }
                
                return displayText ? (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium"
                  >
                    {displayText}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Portfolio Gallery */}
        {profile.portfolio_images && profile.portfolio_images.length > 0 && (
          <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <Award className="w-6 h-6 text-emerald-600" />
              <span>{language === 'en' ? 'Portfolio' : 'Portfolio'}</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {profile.portfolio_images.map((image, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg overflow-hidden aspect-square bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${image}`, '_blank')}
                >
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}${image}`}
                    alt={`Portfolio ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-md p-8">
          <TaskerReviews taskerId={taskerId} language={language} />
        </div>
      </div>
    </div>
  );
};

export default TaskerProfile;
