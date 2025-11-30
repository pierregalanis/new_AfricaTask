import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { taskersAPI, categoriesAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import LocationPicker from '../components/LocationPicker';
import { CheckCircle, DollarSign, MapPin, Navigation } from 'lucide-react';

const TaskerProfileSetup = () => {
  const { language, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  const [profileData, setProfileData] = useState({
    bio: '',
    hourly_rate: '',
    service_categories: [],
    languages_spoken: ['fr'],
    is_available: true,
    max_travel_distance: 20,
    latitude: user?.latitude || null,
    longitude: user?.longitude || null,
  });

  useEffect(() => {
    fetchCategories();
    if (user?.tasker_profile?.hourly_rate > 0) {
      navigate('/tasker/dashboard');
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setProfileData(prev => ({
      ...prev,
      service_categories: prev.service_categories.includes(categoryId)
        ? prev.service_categories.filter(id => id !== categoryId)
        : [...prev.service_categories, categoryId]
    }));
  };

  const toggleLanguage = (lang) => {
    setProfileData(prev => ({
      ...prev,
      languages_spoken: prev.languages_spoken.includes(lang)
        ? prev.languages_spoken.filter(l => l !== lang)
        : [...prev.languages_spoken, lang]
    }));
  };

  const handleLocationChange = (position) => {
    setProfileData(prev => ({
      ...prev,
      latitude: position.lat,
      longitude: position.lng,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (profileData.service_categories.length === 0) {
      toast.error(language === 'en' ? 'Please select at least one service' : 'Veuillez sélectionner au moins un service');
      return;
    }

    if (!profileData.hourly_rate || parseFloat(profileData.hourly_rate) <= 0) {
      toast.error(language === 'en' ? 'Please set your hourly rate' : 'Veuillez définir votre tarif horaire');
      return;
    }

    if (!profileData.latitude || !profileData.longitude) {
      toast.error(
        language === 'en' 
          ? 'Please set your service location on the map' 
          : 'Veuillez définir votre emplacement de service sur la carte'
      );
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('bio', profileData.bio);
      formData.append('hourly_rate', parseFloat(profileData.hourly_rate));
      formData.append('service_categories', JSON.stringify(profileData.service_categories));
      formData.append('is_available', profileData.is_available);
      formData.append('max_travel_distance', parseFloat(profileData.max_travel_distance));

      await taskersAPI.updateProfile(formData);
      
      // Also update user location
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/location`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: profileData.latitude,
          longitude: profileData.longitude,
        }),
      });
      
      toast.success('✅ ' + (language === 'en' ? 'Profile setup complete!' : 'Profil configuré!'));
      navigate('/tasker/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === 'en' ? 'Failed to update profile' : 'Échec de la mise à jour');
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="fancy-card p-8 mb-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center animate-fadeIn">
          <h1 className="text-4xl font-bold mb-4" data-testid="profile-setup-title">
            {language === 'en' ? 'Complete Your Profile' : 'Complétez votre profil'}
          </h1>
          <p className="text-xl text-orange-100">
            {language === 'en' ? 'Set up your services and start earning!' : 'Configurez vos services et commencez à gagner!'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="fancy-card p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold gradient-text mb-4">
              📝 {language === 'en' ? 'About You' : 'À propos de vous'}
            </h2>
            <textarea
              rows="4"
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              className="fancy-input"
              placeholder={language === 'en' ? 'Tell clients about your experience...' : 'Parlez aux clients de votre expérience...'}
              data-testid="bio-input"
            />
          </div>

          <div className="fancy-card p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold gradient-text mb-4">
              💰 {language === 'en' ? 'Your Hourly Rate' : 'Votre tarif horaire'}
            </h2>
            <div className="relative">
              <input
                type="number"
                required
                min="1000"
                step="500"
                value={profileData.hourly_rate}
                onChange={(e) => setProfileData({ ...profileData, hourly_rate: e.target.value })}
                className="fancy-input text-2xl font-bold text-orange-600"
                placeholder="15000"
                data-testid="hourly-rate-input"
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                CFA/hr
              </span>
            </div>
          </div>

          <div className="fancy-card p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold gradient-text mb-4">
              🔧 {language === 'en' ? 'Services You Offer' : 'Services que vous offrez'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    profileData.service_categories.includes(category.id)
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`category-${category.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{category.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {language === 'en' ? category.name_en : category.name_fr}
                      </p>
                    </div>
                    {profileData.service_categories.includes(category.id) && (
                      <CheckCircle className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Service Location */}
          <div className="fancy-card p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold gradient-text mb-4">
              📍 {language === 'en' ? 'Your Service Location' : 'Votre emplacement de service'}
            </h2>
            <p className="text-gray-600 mb-4">
              {language === 'en' 
                ? 'Mark where you are based or where you provide your services' 
                : 'Indiquez où vous êtes basé ou où vous fournissez vos services'}
            </p>
            <LocationPicker
              country={user?.country || 'ivory_coast'}
              initialPosition={profileData.latitude ? { lat: profileData.latitude, lng: profileData.longitude } : null}
              onLocationChange={handleLocationChange}
              height="350px"
              label={
                language === 'en' 
                  ? 'Click on the map to set your service location' 
                  : 'Cliquez sur la carte pour définir votre emplacement'
              }
            />
          </div>

          {/* Max Travel Distance */}
          <div className="fancy-card p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold gradient-text mb-4">
              🚗 {language === 'en' ? 'Maximum Travel Distance' : 'Distance maximale de déplacement'}
            </h2>
            <p className="text-gray-600 mb-4">
              {language === 'en' 
                ? 'How far are you willing to travel for a job?' 
                : 'Jusqu\'où êtes-vous prêt à vous déplacer pour un travail?'}
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-orange-600">
                  {profileData.max_travel_distance} km
                </span>
                <Navigation className="w-8 h-8 text-orange-500" />
              </div>
              
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={profileData.max_travel_distance}
                onChange={(e) => setProfileData({ ...profileData, max_travel_distance: e.target.value })}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>5 km</span>
                <span>25 km</span>
                <span>50 km</span>
                <span>75 km</span>
                <span>100 km</span>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 {language === 'en' 
                    ? `Clients within ${profileData.max_travel_distance} km of your location will be able to book you.` 
                    : `Les clients situés dans un rayon de ${profileData.max_travel_distance} km de votre emplacement pourront vous réserver.`}
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary text-lg py-4 disabled:opacity-50"
            data-testid="submit-profile-button"
          >
            {submitting ? t('loading') : `✨ ${language === 'en' ? 'Save & Start Earning' : 'Enregistrer et commencer'}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskerProfileSetup;
