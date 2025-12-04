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
      
      const userData = response.data;
      const profile = userData.tasker_profile || {};
      
      
      setTaskerProfile(profile);
      
      // Services are stored inside tasker_profile
      const servicesArray = profile.services || [];
      
      // Convert services to new format if they're in old format (strings)
      // OR load them if they're already in new format (objects)
      const formattedServices = servicesArray.map(service => {
        if (typeof service === 'string') {
          // Old format - just service name, convert to new format
          return {
            category: service,
            subcategory: 'General' // Default subcategory for old data
          };
        } else if (service.category && service.subcategory) {
          // New format with category/subcategory
          return service;
        }
        return null;
      }).filter(s => s !== null);
      
      setServices(formattedServices);
      
      // Load service settings if available
      const loadedSettings = {};
      formattedServices.forEach(service => {
        const serviceKey = `${service.category}:${service.subcategory}`;
        loadedSettings[serviceKey] = {
          pricing_type: service.pricing_type || 'hourly',
          rate: service.hourly_rate || '',
          fixed_price: service.fixed_price || '',
          bio: service.bio || '',
          distance: service.max_travel_distance || ''
        };
      });
      setServiceSettings(loadedSettings);
      
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
      // Convert services array to format backend expects with full service info
      const servicesWithSettings = services.map(service => {
        const serviceKey = getServiceKey(service);
        const settings = serviceSettings[serviceKey] || {};
        return {
          category: service.category,
          subcategory: service.subcategory,
          pricing_type: settings.pricing_type || 'hourly',
          hourly_rate: settings.pricing_type === 'hourly' ? (settings.rate || 0) : null,
          fixed_price: settings.pricing_type === 'fixed' ? (settings.fixed_price || 0) : null,
          bio: settings.bio || '',
          max_travel_distance: settings.distance || 10
        };
      });

      const formData = new FormData();
      formData.append('services', JSON.stringify(servicesWithSettings));
      formData.append('is_available', isAvailable);
      // Keep backward compatibility with old fields
      formData.append('hourly_rate', hourlyRate || 0);
      formData.append('bio', bio || '');
      formData.append('max_travel_distance', maxTravelDistance || 10);

      
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
              {services.map((service, idx) => {
                const serviceKey = getServiceKey(service);
                return (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
                  >
                    {/* Service Header - Clickable to expand */}
                    <div
                      onClick={() => toggleServiceExpansion(service)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-sm font-medium">
                            {service.category}
                          </div>
                          <span className="text-gray-400 dark:text-gray-500">→</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {service.subcategory}
                          </span>
                        </div>
                        {serviceSettings[serviceKey] && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            {serviceSettings[serviceKey].rate ? `${serviceSettings[serviceKey].rate} CFA/hr` : 'No rate set'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {expandedService === serviceKey ? (language === 'en' ? 'Collapse' : 'Réduire') : (language === 'en' ? 'Edit Settings' : 'Modifier')}
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
                    {expandedService === serviceKey && (
                      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
                        {/* Hourly Rate for this service */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {language === 'en' ? 'Hourly Rate (CFA)' : 'Tarif horaire (CFA)'}
                          </label>
                          <input
                            type="number"
                            value={serviceSettings[serviceKey]?.rate || ''}
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
                            value={serviceSettings[serviceKey]?.bio || ''}
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
                            value={serviceSettings[serviceKey]?.distance || ''}
                            onChange={(e) => updateServiceSetting(service, 'distance', e.target.value)}
                            placeholder="10"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {services.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  {language === 'en' ? 'No services added yet' : 'Aucun service ajouté'}
                </p>
              )}
            </div>

            {/* Add New Service Button */}
            <button
              onClick={() => setShowCategoryModal(true)}
              className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{language === 'en' ? 'Add New Service' : 'Ajouter un nouveau service'}</span>
            </button>

            {/* Save Button - Prominent Position */}
            {services.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all text-lg font-semibold"
                >
                  <Save className="w-6 h-6" />
                  <span>
                    {saving 
                      ? (language === 'en' ? 'Saving...' : 'Enregistrement...') 
                      : (language === 'en' ? 'Save All Changes' : 'Enregistrer toutes les modifications')}
                  </span>
                </button>
              </div>
            )}
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

      {/* Category/Subcategory Selection Modal - Side by Side Layout */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {language === 'en' ? 'Add a Service' : 'Ajouter un service'}
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setSelectedCategory(null);
                    setSelectedSubcategory('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content - Side by Side */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left: Categories */}
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-6">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                  {language === 'en' ? 'Step 1: Select Category' : 'Étape 1: Choisir une catégorie'}
                </h4>
                <div className="space-y-2">
                  {availableCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedSubcategory('');
                      }}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center space-x-3 ${
                        selectedCategory?.id === category.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <div className="text-3xl">{category.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {language === 'en' ? category.name_en : category.name_fr}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {category.subcategories.length} {language === 'en' ? 'subcategories' : 'sous-catégories'}
                        </div>
                      </div>
                      {selectedCategory?.id === category.id && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Subcategories */}
              <div className="w-1/2 overflow-y-auto p-6">
                {selectedCategory ? (
                  <>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                      {language === 'en' ? 'Step 2: Select Subcategory' : 'Étape 2: Choisir une sous-catégorie'}
                    </h4>
                    <div className="space-y-2">
                      {selectedCategory.subcategories.map((subcategory, idx) => {
                        const subcatName = language === 'en' ? subcategory.en : subcategory.fr;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedSubcategory(subcategory.en)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              selectedSubcategory === subcategory.en
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {subcatName}
                              </div>
                              {selectedSubcategory === subcategory.en && (
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div className="text-gray-400 dark:text-gray-500">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {language === 'en' 
                          ? 'Select a category to see subcategories' 
                          : 'Sélectionnez une catégorie pour voir les sous-catégories'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedCategory(null);
                  setSelectedSubcategory('');
                }}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'Annuler'}
              </button>
              <button
                onClick={handleAddService}
                disabled={!selectedCategory || !selectedSubcategory}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {language === 'en' ? 'Add Service' : 'Ajouter le service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskerServicesManagement;
