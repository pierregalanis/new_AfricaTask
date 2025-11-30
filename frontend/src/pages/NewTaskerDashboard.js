import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import JobTimer from '../components/JobTimer';
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

  const handleCompleteTask = async (taskId) => {
    try {
      // Stop GPS tracking if active
      if (trackingStates[taskId]?.isTracking) {
        await stopGPSTracking(taskId);
      }
      
      // Mark task as completed
      await tasksAPI.completeTask(taskId);
      toast.success('✅ ' + (language === 'en' ? 'Task completed!' : 'Tâche terminée!'));
      fetchBookings();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(language === 'en' ? 'Failed to complete task' : "Échec de la finalisation");
    }
  };

  const handleConfirmCashPayment = async (taskId) => {
    try {
      await tasksAPI.markPaidCash(taskId);
      toast.success('✅ ' + (language === 'en' ? 'Cash payment confirmed!' : 'Paiement en espèces confirmé!'));
      fetchBookings();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error(language === 'en' ? 'Failed to confirm payment' : 'Échec de la confirmation du paiement');
    }
  };

  const startGPSTracking = async (taskId) => {
    if (!navigator.geolocation) {
      toast.error(language === 'en' ? 'Geolocation not supported' : 'Géolocalisation non prise en charge');
      return;
    }

    try {
      // Start tracking on backend
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/start-tracking`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Send initial location
          await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/update-location`,
            { latitude, longitude },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          // Watch position and update every 10 seconds
          const watchId = navigator.geolocation.watchPosition(
            (pos) => {
              // Position updates handled by interval below
            },
            (error) => {
              console.error('Geolocation error:', error);
              if (error.code === error.PERMISSION_DENIED) {
                toast.error(
                  language === 'en' 
                    ? 'Location permission denied. Please enable it in browser settings.' 
                    : 'Permission de localisation refusée. Veuillez l\'activer dans les paramètres du navigateur.'
                );
                stopGPSTracking(taskId);
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );

          // Set up interval to send updates every 10 seconds
          const intervalId = setInterval(async () => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  await axios.post(
                    `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/update-location`,
                    {
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                      },
                    }
                  );
                } catch (err) {
                  console.error('Error updating location:', err);
                }
              },
              (err) => console.error('Error getting position:', err),
              { enableHighAccuracy: true }
            );
          }, 10000); // 10 seconds

          // Save tracking state
          setTrackingStates(prev => ({
            ...prev,
            [taskId]: { isTracking: true, watchId }
          }));
          locationIntervalsRef.current[taskId] = intervalId;

          toast.success('🚗 ' + (language === 'en' ? 'GPS tracking started!' : 'Suivi GPS démarré!'));
        },
        (error) => {
          console.error('Error getting initial position:', error);
          let errorMessage = language === 'en' ? 'Failed to get location' : 'Échec de la géolocalisation';
          
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = language === 'en' 
              ? 'Please allow location access to start GPS tracking' 
              : 'Veuillez autoriser l\'accès à la localisation pour démarrer le suivi GPS';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = language === 'en' 
              ? 'Location unavailable. Please check your GPS/WiFi.' 
              : 'Localisation indisponible. Vérifiez votre GPS/WiFi.';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = language === 'en' 
              ? 'Location request timed out. Please try again.' 
              : 'Délai d\'attente dépassé. Veuillez réessayer.';
          }
          
          toast.error(errorMessage);
          
          // Stop tracking on backend if we couldn't get initial location
          axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/stop-tracking`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          ).catch(err => console.error('Error stopping tracking:', err));
        },
        { enableHighAccuracy: true }
      );
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error(language === 'en' ? 'Failed to start tracking' : 'Échec du démarrage du suivi');
    }
  };

  const stopGPSTracking = async (taskId) => {
    try {
      // Stop tracking on backend
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/stop-tracking`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Stop watching position
      const trackingState = trackingStates[taskId];
      if (trackingState?.watchId) {
        navigator.geolocation.clearWatch(trackingState.watchId);
      }

      // Clear interval
      if (locationIntervalsRef.current[taskId]) {
        clearInterval(locationIntervalsRef.current[taskId]);
        delete locationIntervalsRef.current[taskId];
      }

      // Update state
      setTrackingStates(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });

      toast.success(language === 'en' ? 'GPS tracking stopped' : 'Suivi GPS arrêté');
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast.error(language === 'en' ? 'Failed to stop tracking' : 'Échec de l\'arrêt du suivi');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals
      Object.values(locationIntervalsRef.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
      // Clear all watch positions
      Object.values(trackingStates).forEach(state => {
        if (state.watchId) {
          navigator.geolocation.clearWatch(state.watchId);
        }
      });
    };
  }, []);

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
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'completed' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
            data-testid="filter-completed"
          >
            {language === 'en' ? 'Completed' : 'Terminé'}
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
                  {booking.status === 'in_progress' && (
                    <div className="space-y-3">
                      {/* Job Timer */}
                      <JobTimer taskId={booking.id} language={language} />
                      
                      {/* GPS Controls */}
                      <div className="flex flex-col space-y-2">
                        {trackingStates[booking.id]?.isTracking ? (
                          <div>
                            <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center space-x-2 text-green-700">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold">
                                  {language === 'en' ? 'GPS Active' : 'GPS Actif'}
                                </span>
                              </div>
                              <p className="text-xs text-green-600 mt-1">
                                {language === 'en' ? 'Client can see your location' : 'Le client peut voir votre position'}
                              </p>
                            </div>
                            <button
                              onClick={() => stopGPSTracking(booking.id)}
                              className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition flex items-center justify-center space-x-2"
                              data-testid={`stop-tracking-button-${booking.id}`}
                            >
                              <NavigationOff className="w-5 h-5" />
                              <span>{language === 'en' ? 'Stop GPS' : 'Arrêter GPS'}</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startGPSTracking(booking.id)}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2 shadow-lg"
                            data-testid={`start-tracking-button-${booking.id}`}
                          >
                            <Navigation className="w-5 h-5" />
                            <span>{language === 'en' ? 'Start En Route' : 'Démarrer En route'}</span>
                          </button>
                        )}
                      </div>
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
