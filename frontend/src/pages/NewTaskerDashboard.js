import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import JobTimer from '../components/JobTimer';
import ChatModal from '../components/ChatModal';
import { Calendar, Clock, MapPin, DollarSign, Settings, CheckCircle, XCircle, Navigation, NavigationOff, MessageCircle } from 'lucide-react';
import axios from 'axios';

const NewTaskerDashboard = () => {
  const { language, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [trackingStates, setTrackingStates] = useState({}); // {taskId: {isTracking, watchId}}
  const locationIntervalsRef = useRef({}); // Store interval IDs for each tracking task
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
  const [clientForChat, setClientForChat] = useState(null);
  const [stats, setStats] = useState(null); // Real-time stats
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchBookings();
    fetchTaskerStats();
  }, []);

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
        {/* Fancy Hero Header with Animation */}
        <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 shadow-2xl">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Left: Welcome Section */}
              <div className="lg:col-span-2 space-y-4">
                <div className="animate-fadeIn">
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" data-testid="tasker-dashboard-title">
                    {language === 'en' ? '👋 Welcome back, ' : '👋 Bon retour, '}
                    <span className="text-emerald-100">{user?.full_name}!</span>
                  </h1>
                  <p className="text-emerald-50 text-base md:text-lg">
                    {language === 'en' ? 'Ready to make someone\'s day better?' : 'Prêt à améliorer la journée de quelqu\'un?'}
                  </p>
                </div>

                {/* Stats Cards - Clickable */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Tasks Completed - Click to see completed tasks */}
                  <button
                    onClick={() => setFilter('completed')}
                    className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 transform hover:scale-105 transition-all duration-300 hover:bg-white/30 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-200" />
                      <span className="text-xs text-emerald-100 font-medium uppercase tracking-wide">
                        {language === 'en' ? 'Tasks' : 'Tâches'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {stats?.total_paid_tasks || 0}
                    </p>
                  </button>

                  {/* Rating - Click to see profile */}
                  <button
                    onClick={() => navigate(`/tasker-profile/${user.id}`)}
                    className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 transform hover:scale-105 transition-all duration-300 hover:bg-white/30 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs text-emerald-100 font-medium uppercase tracking-wide">
                        {language === 'en' ? 'Rating' : 'Note'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {stats?.average_rating?.toFixed(1) || '0.0'}
                    </p>
                  </button>

                  {/* Reviews - Click to scroll to reviews section */}
                  <button
                    onClick={() => {
                      const reviewsSection = document.getElementById('reviews-section');
                      if (reviewsSection) {
                        reviewsSection.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        navigate(`/tasker-profile/${user.id}`);
                      }
                    }}
                    className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 transform hover:scale-105 transition-all duration-300 hover:bg-white/30 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <MessageCircle className="w-4 h-4 text-emerald-200" />
                      <span className="text-xs text-emerald-100 font-medium uppercase tracking-wide">
                        {language === 'en' ? 'Reviews' : 'Avis'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {stats?.total_reviews || 0}
                    </p>
                  </button>

                  {/* Services - Click to manage services */}
                  <button
                    onClick={() => navigate('/tasker/services')}
                    className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 transform hover:scale-105 transition-all duration-300 hover:bg-white/30 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Settings className="w-4 h-4 text-emerald-200" />
                      <span className="text-xs text-emerald-100 font-medium uppercase tracking-wide">
                        {language === 'en' ? 'Services' : 'Services'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {user?.tasker_profile?.services?.length || 0}
                    </p>
                  </button>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate('/tasker/services')}
                  className="bg-white text-emerald-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-50 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 group"
                  data-testid="edit-profile-button"
                >
                  <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span>{language === 'en' ? 'Edit Profile & Services' : 'Modifier profil & services'}</span>
                </button>
              </div>

              {/* Right: Animated Worker Illustration */}
              <div className="hidden lg:flex justify-center items-center">
                <div className="relative w-48 h-48 animate-float">
                  {/* Worker with Animation */}
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/20">
                    <svg className="w-40 h-40" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Hard hat */}
                      <ellipse cx="100" cy="55" rx="42" ry="12" fill="#FCD34D"/>
                      <path d="M58 55 Q58 42 100 42 Q142 42 142 55 L142 72 Q142 85 100 85 Q58 85 58 72 Z" fill="#F59E0B"/>
                      
                      {/* Face */}
                      <circle cx="100" cy="100" r="30" fill="#FDE68A"/>
                      
                      {/* Eyes */}
                      <circle cx="92" cy="96" r="2.5" fill="#1F2937"/>
                      <circle cx="108" cy="96" r="2.5" fill="#1F2937"/>
                      
                      {/* Smile */}
                      <path d="M88 108 Q100 114 112 108" stroke="#1F2937" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      
                      {/* Body/Shirt */}
                      <rect x="78" y="125" width="44" height="42" rx="4" fill="#10B981"/>
                      
                      {/* Tool belt */}
                      <rect x="74" y="148" width="52" height="8" fill="#059669"/>
                      
                      {/* Left arm holding hammer - animated */}
                      <g className="animate-hammer">
                        <rect x="52" y="135" width="12" height="35" rx="6" fill="#FDE68A"/>
                        {/* Hammer */}
                        <rect x="48" y="165" width="18" height="6" fill="#6B7280" rx="2"/>
                        <rect x="54" y="158" width="6" height="12" fill="#8B4513"/>
                      </g>
                      
                      {/* Right arm */}
                      <rect x="136" y="135" width="12" height="35" rx="6" fill="#FDE68A"/>
                      
                      {/* Tools on belt */}
                      <circle cx="88" cy="152" r="3" fill="#EF4444"/>
                      <rect x="97" y="150" width="6" height="10" fill="#3B82F6" rx="1"/>
                      <circle cx="112" cy="152" r="3" fill="#FBBF24"/>
                    </svg>
                  </div>
                  
                  {/* Sparkles */}
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
                  <div className="absolute bottom-8 -left-2 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping animation-delay-1000"></div>
                  <div className="absolute top-16 -right-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  
                  {/* Work tools floating */}
                  <div className="absolute top-0 left-4 w-8 h-8 animate-bounce animation-delay-500">
                    <svg viewBox="0 0 24 24" fill="none" className="text-white/60">
                      <path d="M21 7L9 19L3.5 13.5L4.91 12.09L9 16.17L19.59 5.59L21 7Z" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex space-x-3">
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'pending' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow'
            }`}
            data-testid="filter-pending"
          >
            {language === 'en' ? 'Pending' : 'En attente'}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'active' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow'
            }`}
            data-testid="filter-active"
          >
            {language === 'en' ? 'Active' : 'Actif'}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'completed' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow'
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{booking.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{booking.description}</p>
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
                      
                      {/* Chat Button */}
                      <button
                        onClick={() => {
                          setSelectedTaskForChat(booking);
                          setClientForChat({
                            id: booking.client_id,
                            full_name: booking.client_name || 'Client'
                          });
                          setChatModalOpen(true);
                        }}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>{language === 'en' ? 'Chat with Client' : 'Discuter avec client'}</span>
                      </button>
                      
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
                        
                        {/* Complete Task Button */}
                        <button
                          onClick={() => handleCompleteTask(booking.id)}
                          className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2 shadow-lg"
                          data-testid={`complete-task-button-${booking.id}`}
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span>{language === 'en' ? 'Mark as Completed' : 'Marquer comme terminé'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {booking.status === 'completed' && (
                    <div className="space-y-3">
                      {/* Payment Status */}
                      <div className={`px-4 py-3 rounded-lg border-2 ${
                        booking.is_paid 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {booking.is_paid ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="font-semibold text-green-700">
                                {language === 'en' ? '✅ Paid' : '✅ Payé'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-5 h-5 text-yellow-600" />
                              <span className="font-semibold text-yellow-700">
                                {language === 'en' ? 'Awaiting Payment' : 'En attente de paiement'}
                              </span>
                            </>
                          )}
                        </div>
                        {booking.payment_method && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {language === 'en' ? 'Method: ' : 'Méthode: '}
                            {booking.payment_method === 'cash' ? (language === 'en' ? 'Cash' : 'Espèces') : booking.payment_method}
                          </p>
                        )}
                      </div>
                      
                      {/* Chat and Payment Buttons for Unpaid Tasks */}
                      {!booking.is_paid && (
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => {
                              setSelectedTaskForChat(booking);
                              setClientForChat({
                                id: booking.client_id,
                                full_name: booking.client_name || 'Client'
                              });
                              setChatModalOpen(true);
                            }}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>{language === 'en' ? 'Chat about Payment' : 'Discuter du paiement'}</span>
                          </button>
                          <button
                            onClick={() => handleConfirmCashPayment(booking.id)}
                            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2 shadow-lg"
                            data-testid={`confirm-payment-button-${booking.id}`}
                          >
                            <DollarSign className="w-5 h-5" />
                            <span>{language === 'en' ? 'Confirm Cash Payment' : 'Confirmer Paiement Espèces'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Chat Modal */}
      <ChatModal
        isOpen={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setSelectedTaskForChat(null);
          setClientForChat(null);
        }}
        task={selectedTaskForChat}
        currentUser={user}
        otherUser={clientForChat}
        language={language}
      />
    </div>
  );
};

export default NewTaskerDashboard;
