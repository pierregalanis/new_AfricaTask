import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { usersAPI, tasksAPI, categoriesAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { Calendar, Clock, DollarSign, MapPin, ArrowLeft, User, Star } from 'lucide-react';

const BookTasker = () => {
  const { taskerId } = useParams();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  const { language, user } = useAuth();
  const [tasker, setTasker] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  const [bookingData, setBookingData] = useState({
    title: '',
    description: '',
    task_date: '',
    duration_hours: 2,
    address: user?.address || '',
    city: user?.city || '',
    latitude: user?.latitude || 5.345317,
    longitude: user?.longitude || -4.024429,
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

  const calculateTotalCost = () => {
    return (bookingData.duration_hours * (tasker?.tasker_profile?.hourly_rate || 0)).toFixed(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const taskData = {
        ...bookingData,
        category_id: categoryId,
        tasker_id: taskerId,
        hourly_rate: tasker.tasker_profile.hourly_rate,
        task_date: new Date(bookingData.task_date).toISOString(),
      };

      const response = await tasksAPI.create(taskData);
      toast.success('✅ ' + (language === 'en' ? 'Booking confirmed!' : 'Réservation confirmée!'));
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
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {tasker.full_name?.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{tasker.full_name}</h3>
                <div className="flex items-center justify-center space-x-1 mt-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">
                    {tasker.tasker_profile?.average_rating?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ({tasker.tasker_profile?.total_reviews || 0})
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {tasker.tasker_profile?.completed_tasks || 0} {language === 'en' ? 'tasks completed' : 'tâches terminées'}
                </p>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  {language === 'en' ? 'Price Details' : 'Détails du prix'}
                </h4>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{language === 'en' ? 'Hourly rate' : 'Tarif horaire'}</span>
                    <span className="font-semibold">{tasker.tasker_profile?.hourly_rate || 0} CFA/hr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{language === 'en' ? 'Duration' : 'Durée'}</span>
                    <span className="font-semibold">{bookingData.duration_hours}h</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">{language === 'en' ? 'Total' : 'Total'}</span>
                    <span className="text-3xl font-bold text-orange-600">{calculateTotalCost()} CFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookTasker;
