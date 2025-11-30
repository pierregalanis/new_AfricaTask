import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { usersAPI, taskersAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import TaskerReviews from '../components/TaskerReviews';
import { User, Mail, Phone, MapPin, Briefcase, Star, CheckCircle } from 'lucide-react';
import axios from 'axios';

const ProfilePage = () => {
  const { user, language } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState(null);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
  });
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    if (user?.id) {
      if (user.role === 'tasker') {
        fetchTaskerStats();
      } else if (user.role === 'client') {
        fetchClientStats();
      }
    }
  }, [user]);

  const fetchTaskerStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/tasker/${user.id}/rating`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchClientStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/client/${user.id}/stats`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(profileData).forEach(key => {
        if (profileData[key]) formData.append(key, profileData[key]);
      });
      await usersAPI.updateProfile(formData);
      toast.success(language === 'en' ? 'Profile updated!' : 'Profil mis à jour!');
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === 'en' ? 'Failed to update profile' : 'Échec de la mise à jour du profil');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="profile-title">{t('myProfile')}</h1>
              <p className="text-gray-600 mt-1">
                {user?.role === 'client' ? t('client') : t('tasker')}
              </p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              data-testid="edit-profile-button"
            >
              {isEditing ? t('cancel') : t('edit')}
            </button>
          </div>

          {/* Stats Section for Taskers */}
          {user?.role === 'tasker' && stats && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-600 rounded-full p-3">
                    <Star className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">
                      {language === 'en' ? 'Average Rating' : 'Note moyenne'}
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '0.0'} ⭐
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-600 rounded-full p-3">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      {language === 'en' ? 'Tasks Completed' : 'Tâches terminées'}
                    </p>
                    <p className="text-2xl font-bold text-green-900">{stats.total_completed_tasks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-600 rounded-full p-3">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-600 font-medium">
                      {language === 'en' ? 'Total Reviews' : 'Total avis'}
                    </p>
                    <p className="text-2xl font-bold text-orange-900">{stats.total_reviews}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Section for Clients */}
          {user?.role === 'client' && stats && (
            <div className="mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200 max-w-md">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-600 rounded-full p-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      {language === 'en' ? 'Tasks Completed' : 'Tâches terminées'}
                    </p>
                    <p className="text-3xl font-bold text-green-900">{stats.total_completed_tasks || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fullName')}
                  </label>
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('phone')}
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('city')}
                  </label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('address')}
                  </label>
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
              >
                {t('save')}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('fullName')}</p>
                    <p className="text-lg font-medium">{user?.full_name}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('email')}</p>
                    <p className="text-lg font-medium">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('phone')}</p>
                    <p className="text-lg font-medium">{user?.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('city')}</p>
                    <p className="text-lg font-medium">{user?.city || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {user?.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('address')}</p>
                    <p className="text-lg font-medium">{user.address}</p>
                  </div>
                </div>
              )}

              {/* Tasker Stats */}
              {user?.role === 'tasker' && user?.tasker_profile && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-xl font-semibold mb-4">
                    {language === 'en' ? 'Tasker Statistics' : 'Statistiques du Tasker'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start space-x-3">
                      <Star className="w-5 h-5 text-yellow-500 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">{language === 'en' ? 'Average Rating' : 'Note moyenne'}</p>
                        <p className="text-2xl font-bold">{user.tasker_profile.average_rating || 0}/5</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Briefcase className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">{language === 'en' ? 'Completed Tasks' : 'Tâches terminées'}</p>
                        <p className="text-2xl font-bold">{user.tasker_profile.completed_tasks || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Star className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">{language === 'en' ? 'Total Reviews' : 'Total des avis'}</p>
                        <p className="text-2xl font-bold">{user.tasker_profile.total_reviews || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reviews Section for Taskers */}
        {user?.role === 'tasker' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="bg-white rounded-lg shadow-md p-8">
              <TaskerReviews taskerId={user.id} language={language} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
