import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { translations } from '../utils/translations';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TaskerPortfolio from '../components/TaskerPortfolio';
import { Plus, X, Save, Briefcase } from 'lucide-react';
import { toast } from 'react-toastify';

const TaskerServicesManagement = () => {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [taskerProfile, setTaskerProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');
  const [maxTravelDistance, setMaxTravelDistance] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const t = (key) => translations[language][key] || key;

  useEffect(() => {
    if (user?.role !== 'tasker') {
      navigate('/');
      return;
    }
    fetchTaskerProfile();
    fetchCategories();
  }, [user]);

  const fetchTaskerProfile = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`
      );
      console.log('Fetched user profile:', response.data);
      
      const profile = response.data.tasker_profile || {};
      console.log('Tasker profile:', profile);
      console.log('Services in profile:', profile.services);
      
      setTaskerProfile(profile);
      setServices(profile.services || []);
      setHourlyRate(profile.hourly_rate || '');
      setBio(profile.bio || '');
      setMaxTravelDistance(profile.max_travel_distance || '');
      setIsAvailable(profile.is_available !== undefined ? profile.is_available : true);
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/categories`
      );
      setAvailableCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddService = (serviceName = null) => {
    const serviceToAdd = serviceName || newService.trim();
    if (serviceToAdd && !services.includes(serviceToAdd)) {
      setServices([...services, serviceToAdd]);
      setNewService('');
      setShowSuggestions(false);
      setFilteredServices([]);
    }
  };

  const handleServiceInputChange = (value) => {
    setNewService(value);
    
    if (value.trim().length > 0) {
      // Filter available services based on input
      const allServices = availableCategories.map(cat => 
        language === 'en' ? cat.name_en : cat.name_fr
      );
      
      const filtered = allServices.filter(service => 
        service.toLowerCase().includes(value.toLowerCase()) &&
        !services.includes(service)
      );
      
      setFilteredServices(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredServices([]);
      setShowSuggestions(false);
    }
  };

  const handleRemoveService = (serviceToRemove) => {
    setServices(services.filter(s => s !== serviceToRemove));
  };

  const handleSave = async () => {
    if (services.length === 0) {
      toast.error(language === 'en' ? 'Please add at least one service' : 'Veuillez ajouter au moins un service');
      return;
    }

    if (!hourlyRate || hourlyRate <= 0) {
      toast.error(language === 'en' ? 'Please set a valid hourly rate' : 'Veuillez définir un tarif horaire valide');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('services', JSON.stringify(services));
      formData.append('hourly_rate', hourlyRate);
      formData.append('bio', bio);
      formData.append('max_travel_distance', maxTravelDistance || 10);
      formData.append('is_available', isAvailable);

      console.log('Saving services:', services);
      console.log('FormData services:', formData.get('services'));
      
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/taskers/profile`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Save response:', response.data);
      
      toast.success(language === 'en' ? 'Profile updated successfully!' : 'Profil mis à jour avec succès!');
      
      // Refresh the profile data instead of navigating away
      await fetchTaskerProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === 'en' ? 'Failed to update profile' : 'Échec de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card">
          <div className="flex items-center space-x-3 mb-6">
            <Briefcase className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {language === 'en' ? 'Manage Your Services' : 'Gérer vos services'}
            </h1>
          </div>

          {/* Services Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {language === 'en' ? 'Services You Offer' : 'Services que vous proposez'}
            </h2>
            
            {/* Current Services */}
            <div className="flex flex-wrap gap-2 mb-4">
              {services.map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-700"
                >
                  <span className="font-medium">{service}</span>
                  <button
                    onClick={() => handleRemoveService(service)}
                    className="hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  {language === 'en' ? 'No services added yet' : 'Aucun service ajouté'}
                </p>
              )}
            </div>

            {/* Add New Service */}
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => handleServiceInputChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddService()}
                  onFocus={() => newService && setShowSuggestions(filteredServices.length > 0)}
                  placeholder={language === 'en' ? 'Enter service name...' : 'Nom du service...'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && filteredServices.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800/70 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredServices.map((service, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddService(service)}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-gray-700 dark:text-gray-300 hover:text-emerald-700 transition-colors"
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleAddService()}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>{language === 'en' ? 'Add' : 'Ajouter'}</span>
              </button>
            </div>

            {/* Popular Services */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {language === 'en' ? 'Popular services:' : 'Services populaires:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableCategories.slice(0, 5).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const serviceName = language === 'en' ? cat.name_en : cat.name_fr;
                      if (!services.includes(serviceName)) {
                        setServices([...services, serviceName]);
                      }
                    }}
                    className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full text-gray-700"
                  >
                    {language === 'en' ? cat.name_en : cat.name_fr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'Hourly Rate (CFA)' : 'Tarif horaire (CFA)'}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="5000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'Bio / Description' : 'Bio / Description'}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder={language === 'en' 
                ? 'Tell clients about your experience and expertise...' 
                : 'Parlez aux clients de votre expérience et de votre expertise...'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Travel Distance */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'Maximum Travel Distance (km)' : 'Distance maximale de déplacement (km)'}
            </label>
            <input
              type="number"
              value={maxTravelDistance}
              onChange={(e) => setMaxTravelDistance(e.target.value)}
              placeholder="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Availability Toggle */}
          <div className="mb-8 bg-gray-50 dark:bg-gray-950 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {language === 'en' ? 'Availability Status' : 'Statut de disponibilité'}
                </h3>
                <p className="text-sm text-gray-600">
                  {language === 'en' 
                    ? 'Toggle your availability to accept or pause new bookings' 
                    : 'Basculez votre disponibilité pour accepter ou mettre en pause les nouvelles réservations'}
                </p>
              </div>
              <button
                onClick={() => setIsAvailable(!isAvailable)}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isAvailable ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isAvailable ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isAvailable 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {isAvailable 
                  ? (language === 'en' ? '✓ Available for bookings' : '✓ Disponible pour les réservations')
                  : (language === 'en' ? '⏸ Not accepting bookings' : '⏸ N\'accepte pas de réservations')}
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? t('loading') : (language === 'en' ? 'Save Changes' : 'Enregistrer')}</span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-950"
            >
              {language === 'en' ? 'Cancel' : 'Annuler'}
            </button>
          </div>
        </div>

        {/* Portfolio Gallery */}
        <div className="mt-8">
          <TaskerPortfolio 
            portfolio={taskerProfile?.portfolio_images || []}
            onUpdate={fetchTaskerProfile}
            language={language}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskerServicesManagement;
