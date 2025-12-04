import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TaskerReviews from '../components/TaskerReviews';
import { Star, MapPin, Briefcase, Clock, Award, ArrowLeft, Heart } from 'lucide-react';
import { toast } from 'react-toastify';

const TaskerProfile = () => {
  const { taskerId } = useParams();
  const navigate = useNavigate();
  const { language, user } = useAuth();
  const [tasker, setTasker] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const t = (key) => translations[language][key] || key;

  useEffect(() => {
    if (taskerId) {
      fetchTaskerDetails();
      fetchTaskerStats();
      checkIfFavorite();
    }
  }, [taskerId, user]);

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

  const checkIfFavorite = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/favorites`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const favorites = response.data.favorites || [];
      setIsFavorite(favorites.some(fav => fav.tasker_id === taskerId));
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user?.id) {
      toast.error(language === 'en' ? 'Please login to add favorites' : 'Veuillez vous connecter pour ajouter des favoris');
      return;
    }

    setFavoritesLoading(true);
    try {
      if (isFavorite) {
        await axios.delete(
          `${process.env.REACT_APP_BACKEND_URL}/api/favorites/${taskerId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setIsFavorite(false);
        toast.success(language === 'en' ? 'Removed from favorites' : 'Retiré des favoris');
      } else {
        // Use FormData for POST request
        const formData = new FormData();
        formData.append('tasker_id', taskerId);
        
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/favorites`,
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setIsFavorite(true);
        toast.success(language === 'en' ? 'Added to favorites!' : 'Ajouté aux favoris !');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(language === 'en' ? 'Failed to update favorites' : 'Échec de la mise à jour des favoris');
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleBookNow = () => {
    // Open service selection modal
    setShowServiceModal(true);
  };

  const handleServiceSelect = (service) => {
    // Navigate to booking page with selected service
    let bookUrl = `/book-tasker/${taskerId}`;
    if (typeof service === 'object' && service.category) {
      bookUrl += `?category=${service.category}`;
      if (service.subcategory) {
        bookUrl += `&subcategory=${service.subcategory}`;
      }
    } else if (typeof service === 'string') {
      // Old format - just service name
      bookUrl += `?category=${service}`;
    }
    navigate(bookUrl);
    setShowServiceModal(false);
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
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{tasker.city}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {/* Favorites Button */}
                <button
                  onClick={toggleFavorite}
                  disabled={favoritesLoading}
                  className={`p-3 rounded-lg transition-all ${
                    isFavorite
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  } ${favoritesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isFavorite 
                    ? (language === 'en' ? 'Remove from favorites' : 'Retirer des favoris')
                    : (language === 'en' ? 'Add to favorites' : 'Ajouter aux favoris')}
                >
                  <Heart 
                    className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`}
                  />
                </button>

                {/* Book Now Button */}
                <button
                  onClick={handleBookNow}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 transition-all shadow-md"
                >
                  {language === 'en' ? 'Book Now' : 'Réserver maintenant'}
                </button>
              </div>
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

        {/* Services with Pricing */}
        {profile.services && profile.services.length > 0 && (
          <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {language === 'en' ? 'Services Offered' : 'Services proposés'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.services.map((service, idx) => {
                if (typeof service === 'string') {
                  // Old format - just service name
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800"
                    >
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                        {service}
                      </span>
                    </div>
                  );
                } else if (service.category && service.subcategory) {
                  // New format - show with pricing
                  const servicePricingType = service.pricing_type || 'hourly';
                  const serviceRate = service.hourly_rate || 0;
                  const serviceFixed = service.fixed_price || 0;
                  
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                          {service.category} → {service.subcategory}
                        </span>
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {servicePricingType === 'fixed' ? (
                          <span>{serviceFixed.toLocaleString()} CFA ({language === 'en' ? 'Fixed' : 'Fixe'})</span>
                        ) : (
                          <span>{serviceRate.toLocaleString()} CFA/hr</span>
                        )}
                      </div>
                      {service.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {service.bio}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
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

      {/* Service Selection Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'en' ? 'Select a Service' : 'Sélectionner un service'}
              </h2>
              <button
                onClick={() => setShowServiceModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <span className="text-2xl text-gray-600 dark:text-gray-400">×</span>
              </button>
            </div>

            {/* Services List */}
            {profile.services && profile.services.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {profile.services.map((service, idx) => {
                  const isNewFormat = typeof service === 'object' && service.category;
                  const displayName = isNewFormat 
                    ? `${service.category} → ${service.subcategory}`
                    : service;
                  
                  const pricingInfo = isNewFormat && service.pricing_type === 'fixed'
                    ? `${service.fixed_price?.toLocaleString()} CFA (${language === 'en' ? 'Fixed' : 'Fixe'})`
                    : isNewFormat && service.hourly_rate
                    ? `${service.hourly_rate?.toLocaleString()} CFA/hr`
                    : '';

                  return (
                    <button
                      key={idx}
                      onClick={() => handleServiceSelect(service)}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border-2 border-transparent hover:border-emerald-500 rounded-xl transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {displayName}
                          </p>
                          {isNewFormat && service.bio && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {service.bio}
                            </p>
                          )}
                        </div>
                        {pricingInfo && (
                          <div className="ml-4 text-right">
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                              {pricingInfo}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {language === 'en' ? 'No services available' : 'Aucun service disponible'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskerProfile;
