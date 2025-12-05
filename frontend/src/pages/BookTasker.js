import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { usersAPI, tasksAPI, categoriesAPI } from '../api/client';
import { toast } from 'react-toastify';
import axios from 'axios';
import Navbar from '../components/Navbar';
import LocationPickerGoogle from '../components/LocationPickerGoogle';
import TaskerReviews from '../components/TaskerReviews';
import { Calendar, Clock, DollarSign, MapPin, ArrowLeft, User, Star, Navigation } from 'lucide-react';

const BookTasker = () => {
  const { taskerId } = useParams();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  const subcategoryParam = searchParams.get('subcategory');
  const { language, user } = useAuth();
  const [tasker, setTasker] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskerStats, setTaskerStats] = useState(null);
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  const [bookingData, setBookingData] = useState({
    title: '',
    description: '',
    task_date: '',
    duration_hours: 2,
    address: user?.address || '',
    city: user?.city || '',
    latitude: user?.latitude || null,
    longitude: user?.longitude || null,
    special_instructions: '',
  });

  useEffect(() => {
    fetchTasker();
    if (categoryId) {
      fetchCategory();
    }
  }, [taskerId]);

  const fetchTasker = async () => {
    try {
      const response = await usersAPI.getById(taskerId);
      setTasker(response.data);
      
      // Fetch real-time stats
      try {
        const API_URL = process.env.REACT_APP_BACKEND_URL;
        const token = localStorage.getItem('token');
        
        const statsResponse = await axios.get(
          `${API_URL}/api/reviews/tasker/${taskerId}/rating`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTaskerStats(statsResponse.data);
      } catch (statsError) {
        console.error('Error fetching tasker stats:', statsError);
      }
    } catch (error) {
      console.error('Error fetching tasker:', error);
      toast.error(language === 'en' ? 'Failed to load tasker' : 'Échec du chargement du tasker');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategory = async () => {
    try {
      const response = await categoriesAPI.getById(categoryId);
      setCategory(response.data);
      // Auto-fill title
      setBookingData(prev => ({
        ...prev,
        title: language === 'en' ? response.data.name_en : response.data.name_fr
      }));
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  // Get the service-specific pricing
  const getServicePricing = () => {
    const services = tasker?.tasker_profile?.services || [];
    
    const matchingService = subcategoryParam 
      ? services.find(s => typeof s === 'object' && s.subcategory === subcategoryParam)
      : categoryId 
        ? services.find(s => typeof s === 'object' && s.category === categoryId)
        : services.find(s => typeof s === 'object');
    
    return {
      pricingType: matchingService?.pricing_type || 'hourly',
      hourlyRate: matchingService?.hourly_rate || tasker?.tasker_profile?.hourly_rate || 0,
      fixedPrice: matchingService?.fixed_price || 0
    };
  };

  const calculateTotalCost = () => {
    const pricing = getServicePricing();
    if (pricing.pricingType === 'fixed') {
      return Number(pricing.fixedPrice || 0).toFixed(0);
    }
    return (bookingData.duration_hours * Number(pricing.hourlyRate || 0)).toFixed(0);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDistanceToTasker = () => {
    if (!bookingData.latitude || !bookingData.longitude || !tasker?.latitude || !tasker?.longitude) {
      return null;
    }
    return calculateDistance(
      tasker.latitude,
      tasker.longitude,
      bookingData.latitude,
      bookingData.longitude
    );
  };

  const canTaskerReach = () => {
    const distance = getDistanceToTasker();
    if (distance === null) return true; // Allow if distance not calculated yet
    const maxDistance = tasker?.tasker_profile?.max_travel_distance || 50;
    return distance <= maxDistance;
  };

  const handleLocationChange = (position) => {
    setBookingData(prev => ({
      ...prev,
      latitude: position.lat,
      longitude: position.lng,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate location
    if (!bookingData.latitude || !bookingData.longitude) {
      toast.error(
        language === 'en' 
          ? 'Please mark the job location on the map' 
          : 'Veuillez marquer l\'emplacement du travail sur la carte'
      );
      return;
    }

    // Check if tasker can reach
    if (!canTaskerReach()) {
      const distance = getDistanceToTasker();
      const maxDistance = tasker?.tasker_profile?.max_travel_distance || 50;
      toast.error(
        language === 'en'
          ? `This location is ${distance.toFixed(1)} km away. This tasker only travels up to ${maxDistance} km.`
          : `Cet emplacement est à ${distance.toFixed(1)} km. Ce tasker ne se déplace que jusqu'à ${maxDistance} km.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const pricing = getServicePricing();
      
      const taskData = {
        ...bookingData,
        category_id: categoryId,
        tasker_id: taskerId,
        pricing_type: pricing.pricingType,
        hourly_rate: pricing.hourlyRate,
        fixed_price: pricing.fixedPrice,
        task_date: new Date(bookingData.task_date).toISOString(),
      };

      const response = await tasksAPI.create(taskData);
      // Navigate immediately to confirmation page (no toast needed - confirmation page shows success)
      navigate(`/booking-confirmation/${response.data.id}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.detail || (language === 'en' ? 'Failed to book' : 'Échec de la réservation'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!tasker) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{language === 'en' ? 'Tasker not found' : 'Tasker non trouvé'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('back')}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Booking Form */}
          <div className="lg:col-span-2">
            <div className="fancy-card p-8 animate-fadeIn">
              <h1 className="text-3xl font-bold gradient-text mb-6" data-testid="book-tasker-title">
                {language === 'en' ? 'Book Your Service' : 'Réserver votre service'}
              </h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🏷️ {language === 'en' ? 'Service Title' : 'Titre du service'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingData.title}
                    onChange={(e) => setBookingData({ ...bookingData, title: e.target.value })}
                    className="fancy-input"
                    placeholder={category ? (language === 'en' ? category.name_en : category.name_fr) : ''}
                    data-testid="booking-title-input"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📝 {t('description')}
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={bookingData.description}
                    onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                    className="fancy-input"
                    placeholder={language === 'en' ? 'Describe what you need done...' : 'Décrivez ce dont vous avez besoin...'}
                    data-testid="booking-description-input"
                  />
                </div>

                {/* Date & Time */}
                <div className={`grid grid-cols-1 ${getServicePricing().pricingType === 'hourly' ? 'md:grid-cols-2' : ''} gap-4`}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📅 {language === 'en' ? 'Date & Time' : 'Date & Heure'}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={bookingData.task_date}
                      onChange={(e) => setBookingData({ ...bookingData, task_date: e.target.value })}
                      className="fancy-input"
                      data-testid="booking-date-input"
                    />
                  </div>

                  {/* Duration - Only show for hourly pricing */}
                  {getServicePricing().pricingType === 'hourly' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        ⏱️ {language === 'en' ? 'Duration (hours)' : 'Durée (heures)'}
                      </label>
                      <select
                        value={bookingData.duration_hours}
                        onChange={(e) => setBookingData({ ...bookingData, duration_hours: parseFloat(e.target.value) })}
                        className="fancy-input"
                        data-testid="booking-duration-select"
                      >
                        <option value="0.5">30 min</option>
                        <option value="1">1 {language === 'en' ? 'hour' : 'heure'}</option>
                        <option value="1.5">1.5 {language === 'en' ? 'hours' : 'heures'}</option>
                        <option value="2">2 {language === 'en' ? 'hours' : 'heures'}</option>
                        <option value="3">3 {language === 'en' ? 'hours' : 'heures'}</option>
                        <option value="4">4 {language === 'en' ? 'hours' : 'heures'}</option>
                        <option value="5">5 {language === 'en' ? 'hours' : 'heures'}</option>
                        <option value="6">6 {language === 'en' ? 'hours' : 'heures'}</option>
                        <option value="8">8 {language === 'en' ? 'hours' : 'heures'}</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📍 {t('city')}
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingData.city}
                      onChange={(e) => setBookingData({ ...bookingData, city: e.target.value })}
                      className="fancy-input"
                      data-testid="booking-city-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🏠 {t('address')}
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingData.address}
                      onChange={(e) => setBookingData({ ...bookingData, address: e.target.value })}
                      className="fancy-input"
                      data-testid="booking-address-input"
                    />
                  </div>
                </div>

                {/* Job Location Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📍 {language === 'en' ? 'Exact Job Location' : 'Emplacement exact du travail'}
                  </label>
                  <LocationPicker
                    country={user?.country || 'ivory_coast'}
                    initialPosition={bookingData.latitude ? { lat: bookingData.latitude, lng: bookingData.longitude } : null}
                    onLocationChange={handleLocationChange}
                    height="300px"
                    label={
                      language === 'en' 
                        ? 'Click on the map to mark where the job will be done' 
                        : 'Cliquez sur la carte pour marquer où le travail sera effectué'
                    }
                  />
                  
                  {/* Distance and Reachability Info */}
                  {bookingData.latitude && bookingData.longitude && tasker?.latitude && tasker?.longitude && (
                    <div className="mt-4">
                      {canTaskerReach() ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <Navigation className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-semibold text-green-800">
                                ✅ {language === 'en' ? 'Tasker can reach this location!' : 'Le tasker peut atteindre cet emplacement!'}
                              </p>
                              <p className="text-sm text-green-600 mt-1">
                                {language === 'en' 
                                  ? `Distance: ${getDistanceToTasker()?.toFixed(1)} km (within ${tasker?.tasker_profile?.max_travel_distance || 50} km range)` 
                                  : `Distance: ${getDistanceToTasker()?.toFixed(1)} km (dans un rayon de ${tasker?.tasker_profile?.max_travel_distance || 50} km)`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <Navigation className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="font-semibold text-red-800">
                                ⚠️ {language === 'en' ? 'Location too far!' : 'Emplacement trop éloigné!'}
                              </p>
                              <p className="text-sm text-red-600 mt-1">
                                {language === 'en' 
                                  ? `Distance: ${getDistanceToTasker()?.toFixed(1)} km (tasker only travels up to ${tasker?.tasker_profile?.max_travel_distance || 50} km)` 
                                  : `Distance: ${getDistanceToTasker()?.toFixed(1)} km (le tasker ne se déplace que jusqu'à ${tasker?.tasker_profile?.max_travel_distance || 50} km)`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    💬 {language === 'en' ? 'Special Instructions (Optional)' : 'Instructions spéciales (Facultatif)'}
                  </label>
                  <textarea
                    rows="3"
                    value={bookingData.special_instructions}
                    onChange={(e) => setBookingData({ ...bookingData, special_instructions: e.target.value })}
                    className="fancy-input"
                    placeholder={language === 'en' ? 'Any special requirements or notes...' : 'Exigences spéciales ou notes...'}
                    data-testid="booking-instructions-input"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary text-lg py-4 disabled:opacity-50"
                  data-testid="confirm-booking-button"
                >
                  {submitting ? t('loading') : `✨ ${language === 'en' ? 'Confirm Booking' : 'Confirmer la réservation'}`}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar - Tasker Info & Price */}
          <div className="lg:col-span-1">
            <div className="fancy-card p-6 sticky top-8 animate-fadeIn">
              {/* Tasker Info */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {tasker.full_name?.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{tasker.full_name}</h3>
                <div className="flex items-center justify-center space-x-1 mt-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {taskerStats?.average_rating?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    ({taskerStats?.total_reviews || 0})
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {taskerStats?.total_completed_tasks || 0} {language === 'en' ? 'tasks completed' : 'tâches terminées'}
                </p>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {language === 'en' ? 'Price Details' : 'Détails du prix'}
                </h4>
                
                {(() => {
                  const pricing = getServicePricing();
                  return (
                    <>
                      {pricing.pricingType === 'fixed' ? (
                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Pricing Type' : 'Type de tarif'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{language === 'en' ? 'Fixed Price' : 'Prix fixe'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Service Price' : 'Prix du service'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{Number(pricing.fixedPrice || 0).toLocaleString()} CFA</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Hourly rate' : 'Tarif horaire'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{Number(pricing.hourlyRate || 0).toLocaleString()} CFA/hr</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Duration' : 'Durée'}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{bookingData.duration_hours}h</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{language === 'en' ? 'Total' : 'Total'}</span>
                    <span className="text-3xl font-bold text-emerald-600">{calculateTotalCost().toLocaleString()} CFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="fancy-card p-8 animate-fadeIn">
            <TaskerReviews taskerId={taskerId} language={language} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookTasker;
