import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { Calendar, Clock, MapPin, DollarSign, Settings, CheckCircle, XCircle, Navigation, NavigationOff } from 'lucide-react';
import axios from 'axios';

const NewTaskerDashboard = () => {
  const { language, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [trackingStates, setTrackingStates] = useState({}); // {taskId: {isTracking, watchId}}
  const locationIntervalsRef = useRef({}); // Store interval IDs for each tracking task
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    if (!user?.tasker_profile?.hourly_rate || user.tasker_profile.hourly_rate === 0) {
      navigate('/tasker/setup');
      return;
    }
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await tasksAPI.getAll();
      const filteredBookings = response.data.filter(task => task.assigned_tasker_id === user?.id);
      setBookings(filteredBookings);
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

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'pending') return booking.status === 'assigned';
    if (filter === 'active') return booking.status === 'in_progress';
    if (filter === 'completed') return booking.status === 'completed';
    return true;
  });

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="fancy-card p-8 mb-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2" data-testid="tasker-dashboard-title">
                {language === 'en' ? '👨‍🔧 Welcome, ' : '👨‍🔧 Bienvenue, '}{user?.full_name}!
              </h1>
              <p className="text-purple-100 text-lg">
                {language === 'en' ? 'Manage your bookings' : 'Gérez vos réservations'}
              </p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-sm opacity-90">{language === 'en' ? 'Hourly Rate' : 'Tarif'}</span>
                  <p className="text-2xl font-bold">{user?.tasker_profile?.hourly_rate || 0} CFA/hr</p>
                </div>
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-sm opacity-90">{language === 'en' ? 'Completed' : 'Terminé'}</span>
                  <p className="text-2xl font-bold">{user?.tasker_profile?.completed_tasks || 0}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/tasker/setup')}
              className="btn-primary bg-white text-purple-600 hover:bg-gray-50 shadow-2xl"
              data-testid="edit-profile-button"
            >
              <Settings className="w-5 h-5 inline mr-2" />
              <span>{language === 'en' ? 'Edit Profile' : 'Modifier le profil'}</span>
            </button>
          </div>
        </div>

        <div className="mb-6 flex space-x-3">
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'pending' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
            data-testid="filter-pending"
          >
            {language === 'en' ? 'Pending' : 'En attente'}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'active' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
            data-testid="filter-active"
          >
            {language === 'en' ? 'Active' : 'Actif'}
          </button>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="fancy-card text-center py-16">
            <p className="text-gray-600">
              {language === 'en' ? 'No bookings yet!' : 'Aucune réservation encore!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => (
              <div
                key={booking.id}
                className="fancy-card p-6 hover-glow animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
                data-testid={`booking-card-${booking.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{booking.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{booking.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.task_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{booking.duration_hours}h</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.city}</span>
                      </div>
                      <div className="flex items-center space-x-2 font-semibold text-purple-600">
                        <DollarSign className="w-4 h-4" />
                        <span>{booking.total_cost} CFA</span>
                      </div>
                    </div>
                  </div>
                  {booking.status === 'assigned' && (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleAcceptBooking(booking.id)}
                        className="btn-success px-6 py-3 text-sm flex items-center justify-center space-x-2"
                        data-testid={`accept-button-${booking.id}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{language === 'en' ? 'Accept' : 'Accepter'}</span>
                      </button>
                      <button
                        onClick={() => handleRejectBooking(booking.id)}
                        className="px-6 py-3 border-2 border-red-600 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition"
                        data-testid={`reject-button-${booking.id}`}
                      >
                        <XCircle className="w-4 h-4 inline mr-1" />
                        <span>{language === 'en' ? 'Decline' : 'Refuser'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewTaskerDashboard;
