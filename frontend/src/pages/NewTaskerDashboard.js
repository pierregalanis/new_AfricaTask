import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { Calendar, Clock, MapPin, DollarSign, Settings, CheckCircle, XCircle } from 'lucide-react';

const NewTaskerDashboard = () => {
  const { language, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    // Check if profile is setup
    if (!user?.tasker_profile?.hourly_rate || user.tasker_profile.hourly_rate === 0) {
      navigate('/tasker/setup');
      return;
    }
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await tasksAPI.getAll({ assigned_tasker_id: user?.id });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(language === 'en' ? 'Failed to load bookings' : 'Échec du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (taskId) => {
    try {
      await tasksAPI.acceptTask(taskId);
      toast.success('✅ ' + (language === 'en' ? 'Booking accepted!' : 'Réservation acceptée!'));
      fetchBookings();
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error(language === 'en' ? 'Failed to accept' : "Échec de l'acceptation");
    }
  };

  const handleRejectBooking = async (taskId) => {
    try {
      await tasksAPI.rejectTask(taskId);
      toast.success(language === 'en' ? 'Booking rejected' : 'Réservation refusée');
      fetchBookings();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error(language === 'en' ? 'Failed to reject' : "Échec du refus");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
    };\n    return colors[status] || 'bg-gray-100 text-gray-800';\n  };\n\n  const filteredBookings = bookings.filter(booking => {\n    if (filter === 'pending') return booking.status === 'assigned';\n    if (filter === 'active') return booking.status === 'in_progress';\n    if (filter === 'completed') return booking.status === 'completed';\n    return true;\n  });\n\n  if (loading) {\n    return (\n      <div className=\"min-h-screen\">\n        <Navbar />\n        <div className=\"flex items-center justify-center h-96\">\n          <div className=\"text-xl\">{t('loading')}</div>\n        </div>\n      </div>\n    );\n  }\n\n  return (\n    <div className=\"min-h-screen\">\n      <Navbar />\n      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">\n        {/* Header */}\n        <div className=\"fancy-card p-8 mb-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white animate-fadeIn\">\n          <div className=\"flex justify-between items-center\">\n            <div className=\"flex-1\">\n              <h1 className=\"text-4xl font-bold mb-2\" data-testid=\"tasker-dashboard-title\">\n                {language === 'en' ? '👨‍🔧 Welcome, ' : '👨‍🔧 Bienvenue, '}{user?.full_name}!\n              </h1>\n              <p className=\"text-purple-100 text-lg\">\n                {language === 'en' ? 'Manage your bookings' : 'Gérez vos réservations'}\n              </p>\n              <div className=\"mt-4 flex items-center space-x-4\">\n                <div className=\"bg-white/20 backdrop-blur px-4 py-2 rounded-lg\">\n                  <span className=\"text-sm opacity-90\">{language === 'en' ? 'Hourly Rate' : 'Tarif'}</span>\n                  <p className=\"text-2xl font-bold\">{user?.tasker_profile?.hourly_rate || 0} CFA/hr</p>\n                </div>\n                <div className=\"bg-white/20 backdrop-blur px-4 py-2 rounded-lg\">\n                  <span className=\"text-sm opacity-90\">{language === 'en' ? 'Completed' : 'Terminé'}</span>\n                  <p className=\"text-2xl font-bold\">{user?.tasker_profile?.completed_tasks || 0}</p>\n                </div>\n                <div className=\"bg-white/20 backdrop-blur px-4 py-2 rounded-lg\">\n                  <span className=\"text-sm opacity-90\">{language === 'en' ? 'Rating' : 'Note'}</span>\n                  <p className=\"text-2xl font-bold\">⭐ {user?.tasker_profile?.average_rating?.toFixed(1) || '0.0'}</p>\n                </div>\n              </div>\n            </div>\n            <button\n              onClick={() => navigate('/tasker/setup')}\n              className=\"btn-primary bg-white text-purple-600 hover:bg-gray-50 shadow-2xl\"\n              data-testid=\"edit-profile-button\"\n            >\n              <Settings className=\"w-5 h-5 inline mr-2\" />\n              <span>{language === 'en' ? 'Edit Profile' : 'Modifier le profil'}</span>\n            </button>\n          </div>\n        </div>\n\n        {/* Filters */}\n        <div className=\"mb-6 flex space-x-3\">\n          <button\n            onClick={() => setFilter('pending')}\n            className={`px-6 py-3 rounded-xl font-semibold transition ${\n              filter === 'pending'\n                ? 'bg-purple-600 text-white shadow-lg'\n                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'\n            }`}\n            data-testid=\"filter-pending\"\n          >\n            {language === 'en' ? 'Pending' : 'En attente'}\n          </button>\n          <button\n            onClick={() => setFilter('active')}\n            className={`px-6 py-3 rounded-xl font-semibold transition ${\n              filter === 'active'\n                ? 'bg-purple-600 text-white shadow-lg'\n                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'\n            }`}\n            data-testid=\"filter-active\"\n          >\n            {language === 'en' ? 'Active' : 'Actif'}\n          </button>\n          <button\n            onClick={() => setFilter('completed')}\n            className={`px-6 py-3 rounded-xl font-semibold transition ${\n              filter === 'completed'\n                ? 'bg-purple-600 text-white shadow-lg'\n                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'\n            }`}\n            data-testid=\"filter-completed\"\n          >\n            {language === 'en' ? 'Completed' : 'Terminé'}\n          </button>\n        </div>\n\n        {/* Bookings List */}\n        {filteredBookings.length === 0 ? (\n          <div className=\"fancy-card text-center py-16 animate-fadeIn\">\n            <div className=\"inline-block p-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full mb-6\">\n              <Calendar className=\"w-16 h-16 text-purple-600\" />\n            </div>\n            <h3 className=\"text-2xl font-bold text-gray-900 mb-2\">\n              {language === 'en' ? 'No bookings yet!' : 'Aucune réservation encore!'}\n            </h3>\n            <p className=\"text-gray-600\">\n              {language === 'en' \n                ? 'Clients will find you when they need your services!' \n                : 'Les clients vous trouveront quand ils auront besoin de vos services!'}\n            </p>\n          </div>\n        ) : (\n          <div className=\"space-y-4\">\n            {filteredBookings.map((booking, index) => (\n              <div\n                key={booking.id}\n                className=\"fancy-card p-6 hover-glow animate-fadeIn\"\n                style={{ animationDelay: `${index * 0.05}s` }}\n                data-testid={`booking-card-${booking.id}`}\n              >\n                <div className=\"flex flex-col md:flex-row md:items-center gap-6\">\n                  {/* Info */}\n                  <div className=\"flex-1\">\n                    <div className=\"flex items-center space-x-3 mb-3\">\n                      <h3 className=\"text-xl font-bold text-gray-900\">{booking.title}</h3>\n                      <span className={`badge ${getStatusColor(booking.status)}`}>\n                        {booking.status}\n                      </span>\n                    </div>\n                    \n                    <p className=\"text-gray-600 text-sm mb-3\">{booking.description}</p>\n                    \n                    <div className=\"grid grid-cols-1 md:grid-cols-4 gap-3 text-sm\">\n                      <div className=\"flex items-center space-x-2 text-gray-600\">\n                        <Calendar className=\"w-4 h-4\" />\n                        <span>{new Date(booking.task_date).toLocaleDateString()}</span>\n                      </div>\n                      <div className=\"flex items-center space-x-2 text-gray-600\">\n                        <Clock className=\"w-4 h-4\" />\n                        <span>{booking.duration_hours}h</span>\n                      </div>\n                      <div className=\"flex items-center space-x-2 text-gray-600\">\n                        <MapPin className=\"w-4 h-4\" />\n                        <span>{booking.city}</span>\n                      </div>\n                      <div className=\"flex items-center space-x-2 font-semibold text-purple-600\">\n                        <DollarSign className=\"w-4 h-4\" />\n                        <span>{booking.total_cost} CFA</span>\n                      </div>\n                    </div>\n                  </div>\n\n                  {/* Actions */}\n                  {booking.status === 'assigned' && (\n                    <div className=\"flex flex-col space-y-2\">\n                      <button\n                        onClick={() => handleAcceptBooking(booking.id)}\n                        className=\"btn-success px-6 py-3 text-sm flex items-center justify-center space-x-2\"\n                        data-testid={`accept-button-${booking.id}`}\n                      >\n                        <CheckCircle className=\"w-4 h-4\" />\n                        <span>{language === 'en' ? 'Accept' : 'Accepter'}</span>\n                      </button>\n                      <button\n                        onClick={() => handleRejectBooking(booking.id)}\n                        className=\"px-6 py-3 border-2 border-red-600 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition flex items-center justify-center space-x-2\"\n                        data-testid={`reject-button-${booking.id}`}\n                      >\n                        <XCircle className=\"w-4 h-4\" />\n                        <span>{language === 'en' ? 'Decline' : 'Refuser'}</span>\n                      </button>\n                    </div>\n                  )}\n                  {booking.status === 'in_progress' && (\n                    <button\n                      onClick={() => navigate(`/tasks/${booking.id}`)}\n                      className=\"btn-primary px-6 py-3\"\n                    >\n                      {language === 'en' ? 'View Details' : 'Voir détails'}\n                    </button>\n                  )}\n                </div>\n              </div>\n            ))}\n          </div>\n        )}\n      </div>\n    </div>\n  );\n};\n\nexport default NewTaskerDashboard;\n"}]