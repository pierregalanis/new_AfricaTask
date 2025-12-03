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
  const [services, setServices] = useState([]); // Array of { category, subcategory } objects
  const [newService, setNewService] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');
  const [maxTravelDistance, setMaxTravelDistance] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedService, setExpandedService] = useState(null); // Track which service settings are expanded
  const [serviceSettings, setServiceSettings] = useState({}); // Store settings for each service: { serviceKey: { rate, bio, distance } }

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
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/me`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      console.log('Fetched user profile:', response.data);
      
      const userData = response.data;
      const profile = userData.tasker_profile || {};
      
      console.log('User data:', userData);
      console.log('Tasker profile:', profile);
      console.log('Services from tasker_profile:', profile.services);
      
      setTaskerProfile(profile);
      
      // Services are stored inside tasker_profile
      const servicesArray = profile.services || [];
      setServices(servicesArray);
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

  const handleAddService = () => {
    if (!selectedCategory) {
      toast.error(language === 'en' ? 'Please select a category' : 'Veuillez sélectionner une catégorie');
      return;
    }
    
    if (!selectedSubcategory) {
      toast.error(language === 'en' ? 'Please select a subcategory' : 'Veuillez sélectionner une sous-catégorie');
      return;
    }
    
    const serviceKey = `${selectedCategory.name_en}:${selectedSubcategory}`;
    
    // Check if this exact service already exists
    const alreadyExists = services.some(s => 
      `${s.category}:${s.subcategory}` === serviceKey
    );
    
    if (alreadyExists) {
      toast.error(language === 'en' ? 'Service already added' : 'Service déjà ajouté');
      return;
    }
    
    setServices([...services, {
      category: selectedCategory.name_en,
      subcategory: selectedSubcategory
    }]);
    
    setSelectedCategory(null);
    setSelectedSubcategory('');
    setShowCategoryModal(false);
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

  const getServiceKey = (service) => {
    return `${service.category}:${service.subcategory}`;
  };

  const handleRemoveService = (serviceToRemove) => {
    const serviceKey = getServiceKey(serviceToRemove);
    setServices(services.filter(s => getServiceKey(s) !== serviceKey));
    // Remove settings for this service
    const newSettings = { ...serviceSettings };
    delete newSettings[serviceKey];
    setServiceSettings(newSettings);
  };

  const toggleServiceExpansion = (service) => {
    const serviceKey = getServiceKey(service);
    if (expandedService === serviceKey) {
      setExpandedService(null);
    } else {
      setExpandedService(serviceKey);
    }
  };

  const updateServiceSetting = (service, field, value) => {
    const serviceKey = getServiceKey(service);
    setServiceSettings(prev => ({
      ...prev,
      [serviceKey]: {
        ...prev[serviceKey],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (services.length === 0) {
      toast.error(language === 'en' ? 'Please add at least one service' : 'Veuillez ajouter au moins un service');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('services', JSON.stringify(services));
      // Save service settings as JSON
      formData.append('service_settings', JSON.stringify(serviceSettings));
      // Use default values for global fields (kept for backward compatibility)
      formData.append('hourly_rate', hourlyRate || 0);
      formData.append('bio', bio || '');
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
            
            {/* Current Services with Individual Settings */}
            <div className="space-y-3 mb-4">
              {services.map((service, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
                >
                  {/* Service Header - Clickable to expand */}
                  <div
                    onClick={() => toggleServiceExpansion(service)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-sm font-medium">
                        {service}
                      </div>
                      {serviceSettings[service] && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {serviceSettings[service].rate ? `${serviceSettings[service].rate} CFA/hr` : 'No rate set'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {expandedService === service ? (language === 'en' ? 'Collapse' : 'Réduire') : (language === 'en' ? 'Edit Settings' : 'Modifier')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveService(service);
                        }}
                        className="hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-1 transition-colors"
                        title={language === 'en' ? 'Remove' : 'Supprimer'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Settings Section */}
                  {expandedService === service && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
                      {/* Hourly Rate for this service */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {language === 'en' ? 'Hourly Rate (CFA)' : 'Tarif horaire (CFA)'}
                        </label>
                        <input
                          type="number"
                          value={serviceSettings[service]?.rate || ''}
                          onChange={(e) => updateServiceSetting(service, 'rate', e.target.value)}
                          placeholder="5000"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Bio for this service */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {language === 'en' ? 'Description for this service' : 'Description pour ce service'}
                        </label>
                        <textarea
                          value={serviceSettings[service]?.bio || ''}
                          onChange={(e) => updateServiceSetting(service, 'bio', e.target.value)}
                          rows={3}
                          placeholder={language === 'en' ? 'Describe your expertise in this service...' : 'Décrivez votre expertise dans ce service...'}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>

                      {/* Travel Distance for this service */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {language === 'en' ? 'Max Travel Distance (km)' : 'Distance maximale (km)'}
                        </label>
                        <input
                          type="number"
                          value={serviceSettings[service]?.distance || ''}
                          onChange={(e) => updateServiceSetting(service, 'distance', e.target.value)}
                          placeholder="10"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>
                    </div>
                  )}
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
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
                    className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300"
                  >
                    {language === 'en' ? cat.name_en : cat.name_fr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info box explaining per-service settings */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>{language === 'en' ? 'Note:' : 'Remarque:'}</strong>{' '}
              {language === 'en' 
                ? 'Click on each service above to set individual hourly rates, descriptions, and travel distances for that specific service.' 
                : 'Cliquez sur chaque service ci-dessus pour définir les tarifs horaires, descriptions et distances de déplacement individuels pour ce service spécifique.'}
            </p>
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
