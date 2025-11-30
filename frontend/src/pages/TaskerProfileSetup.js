import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { taskersAPI, categoriesAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { CheckCircle, DollarSign } from 'lucide-react';

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
  });

  useEffect(() => {
    fetchCategories();
    // Check if profile already setup
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

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('bio', profileData.bio);
      formData.append('hourly_rate', parseFloat(profileData.hourly_rate));
      formData.append('service_categories', JSON.stringify(profileData.service_categories));
      formData.append('is_available', profileData.is_available);

      await taskersAPI.updateProfile(formData);
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
      <div className=\"min-h-screen\">
        <Navbar />
        <div className=\"flex items-center justify-center h-96\">
          <div className=\"text-xl\">{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen\">
      <Navbar />
      <div className=\"max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        {/* Header */}
        <div className=\"fancy-card p-8 mb-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center animate-fadeIn\">
          <h1 className=\"text-4xl font-bold mb-4\" data-testid=\"profile-setup-title\">
            {language === 'en' ? 'Complete Your Profile' : 'Complétez votre profil'}
          </h1>
          <p className=\"text-xl text-orange-100\">
            {language === 'en' \n              ? 'Set up your services and start earning!' \n              : 'Configurez vos services et commencez à gagner!'}\n          </p>\n        </div>\n\n        <form onSubmit={handleSubmit} className=\"space-y-8\">\n          {/* Bio */}\n          <div className=\"fancy-card p-8 animate-fadeIn\">\n            <h2 className=\"text-2xl font-bold gradient-text mb-4\">\n              📝 {language === 'en' ? 'About You' : 'À propos de vous'}\n            </h2>\n            <textarea\n              rows=\"4\"\n              value={profileData.bio}\n              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}\n              className=\"fancy-input\"\n              placeholder={language === 'en' \n                ? 'Tell clients about your experience and skills...'\n                : 'Parlez aux clients de votre expérience et compétences...'}\n              data-testid=\"bio-input\"\n            />\n          </div>\n\n          {/* Hourly Rate */}\n          <div className=\"fancy-card p-8 animate-fadeIn\" style={{ animationDelay: '0.1s' }}>\n            <h2 className=\"text-2xl font-bold gradient-text mb-4\">\n              💰 {language === 'en' ? 'Your Hourly Rate' : 'Votre tarif horaire'}\n            </h2>\n            <div className=\"relative\">\n              <DollarSign className=\"absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400\" />\n              <input\n                type=\"number\"\n                required\n                min=\"1000\"\n                step=\"500\"\n                value={profileData.hourly_rate}\n                onChange={(e) => setProfileData({ ...profileData, hourly_rate: e.target.value })}\n                className=\"fancy-input pl-14 text-2xl font-bold text-orange-600\"\n                placeholder=\"15000\"\n                data-testid=\"hourly-rate-input\"\n              />\n              <span className=\"absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold\">\n                CFA/hr\n              </span>\n            </div>\n            <p className=\"text-sm text-gray-500 mt-2\">\n              {language === 'en' \n                ? 'Typical rates: 5,000 - 50,000 CFA/hr depending on service'\n                : 'Tarifs typiques: 5 000 - 50 000 CFA/hr selon le service'}\n            </p>\n          </div>\n\n          {/* Services */}\n          <div className=\"fancy-card p-8 animate-fadeIn\" style={{ animationDelay: '0.2s' }}>\n            <h2 className=\"text-2xl font-bold gradient-text mb-4\">\n              🔧 {language === 'en' ? 'Services You Offer' : 'Services que vous offrez'}\n            </h2>\n            <p className=\"text-gray-600 mb-6\">\n              {language === 'en' \n                ? 'Select all services you can provide (choose at least one)'\n                : 'Sélectionnez tous les services que vous pouvez fournir (au moins un)'}\n            </p>\n            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n              {categories.map((category) => (\n                <button\n                  key={category.id}\n                  type=\"button\"\n                  onClick={() => toggleCategory(category.id)}\n                  className={`p-4 rounded-xl border-2 transition text-left ${\n                    profileData.service_categories.includes(category.id)\n                      ? 'border-orange-600 bg-orange-50'\n                      : 'border-gray-200 hover:border-gray-300'\n                  }`}\n                  data-testid={`category-${category.id}`}\n                >\n                  <div className=\"flex items-center space-x-3\">\n                    <span className=\"text-3xl\">{category.icon}</span>\n                    <div className=\"flex-1\">\n                      <p className=\"font-semibold text-gray-900\">\n                        {language === 'en' ? category.name_en : category.name_fr}\n                      </p>\n                    </div>\n                    {profileData.service_categories.includes(category.id) && (\n                      <CheckCircle className=\"w-6 h-6 text-orange-600\" />\n                    )}\n                  </div>\n                </button>\n              ))}\n            </div>\n          </div>\n\n          {/* Languages */}\n          <div className=\"fancy-card p-8 animate-fadeIn\" style={{ animationDelay: '0.3s' }}>\n            <h2 className=\"text-2xl font-bold gradient-text mb-4\">\n              🗣️ {language === 'en' ? 'Languages Spoken' : 'Langues parlées'}\n            </h2>\n            <div className=\"flex space-x-4\">\n              <button\n                type=\"button\"\n                onClick={() => toggleLanguage('fr')}\n                className={`px-6 py-3 rounded-xl font-semibold transition ${\n                  profileData.languages_spoken.includes('fr')\n                    ? 'bg-orange-600 text-white'\n                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'\n                }`}\n              >\n                🇫🇷 Français\n              </button>\n              <button\n                type=\"button\"\n                onClick={() => toggleLanguage('en')}\n                className={`px-6 py-3 rounded-xl font-semibold transition ${\n                  profileData.languages_spoken.includes('en')\n                    ? 'bg-orange-600 text-white'\n                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'\n                }`}\n              >\n                🇬🇧 English\n              </button>\n            </div>\n          </div>\n\n          {/* Submit */}\n          <button\n            type=\"submit\"\n            disabled={submitting}\n            className=\"w-full btn-primary text-lg py-4 disabled:opacity-50\"\n            data-testid=\"submit-profile-button\"\n          >\n            {submitting ? t('loading') : `✨ ${language === 'en' ? 'Save & Start Earning' : 'Enregistrer et commencer'}`}\n          </button>\n        </form>\n      </div>\n    </div>\n  );\n};\n\nexport default TaskerProfileSetup;\n"}]