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
      const profile = response.data.tasker_profile || {};
      setTaskerProfile(profile);
      setServices(profile.services || []);
      setHourlyRate(profile.hourly_rate || '');
      setBio(profile.bio || '');
      setMaxTravelDistance(profile.max_travel_distance || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
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

      await axios.put(
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
      navigate('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === 'en' ? 'Failed to update profile' : 'Échec de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Briefcase className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'en' ? 'Manage Your Services' : 'Gérer vos services'}
            </h1>
          </div>

          {/* Services Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {language === 'en' ? 'Services You Offer' : 'Services que vous proposez'}
            </h2>
            
            {/* Current Services */}
            <div className="flex flex-wrap gap-2 mb-4">
              {services.map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full"
                >
                  <span className="font-medium">{service}</span>
                  <button
                    onClick={() => handleRemoveService(service)}
                    className="hover:bg-orange-200 rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-gray-500 italic">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && filteredServices.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredServices.map((service, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddService(service)}
                        className="w-full text-left px-4 py-2 hover:bg-orange-50 text-gray-700 hover:text-orange-700 transition-colors"
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleAddService()}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>{language === 'en' ? 'Add' : 'Ajouter'}</span>
              </button>
            </div>

            {/* Popular Services */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
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
                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                  >
                    {language === 'en' ? cat.name_en : cat.name_fr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Hourly Rate (CFA)' : 'Tarif horaire (CFA)'}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="5000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Bio / Description' : 'Bio / Description'}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder={language === 'en' 
                ? 'Tell clients about your experience and expertise...' 
                : 'Parlez aux clients de votre expérience et de votre expertise...'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Travel Distance */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Maximum Travel Distance (km)' : 'Distance maximale de déplacement (km)'}
            </label>
            <input
              type="number"
              value={maxTravelDistance}
              onChange={(e) => setMaxTravelDistance(e.target.value)}
              placeholder="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? t('loading') : (language === 'en' ? 'Save Changes' : 'Enregistrer')}</span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
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
