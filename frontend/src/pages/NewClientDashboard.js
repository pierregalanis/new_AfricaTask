import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import LiveGPSTracker from '../components/LiveGPSTracker';
import { Search, Calendar, Briefcase, Clock, MessageCircle, Navigation, Star, ChevronDown, ChevronUp } from 'lucide-react';

const NewClientDashboard = () => {
  const { language, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedBooking, setExpandedBooking] = useState(null); // Track which booking's GPS is expanded
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await tasksAPI.getAll({ client_id: user?.id });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(language === 'en' ? 'Failed to load bookings' : 'Échec du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const statusMap = {
      assigned: language === 'en' ? 'Confirmed' : 'Confirmé',
      in_progress: language === 'en' ? 'In Progress' : 'En cours',
      completed: language === 'en' ? 'Completed' : 'Terminé',
      cancelled: language === 'en' ? 'Cancelled' : 'Annulé',
    };
    return statusMap[status] || status;
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'upcoming') return ['assigned', 'in_progress'].includes(booking.status);
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
        {/* Header */}
        <div className="fancy-card p-8 mb-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2" data-testid="client-dashboard-title">
                {language === 'en' ? '👋 Welcome back, ' : '👋 Bon retour, '}{user?.full_name}!
              </h1>
              <p className="text-orange-100 text-lg">
                {language === 'en' ? 'Manage your bookings' : 'Gérez vos réservations'}
              </p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-sm opacity-90">{language === 'en' ? 'Total Bookings' : 'Total'}</span>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-sm opacity-90">{language === 'en' ? 'Upcoming' : 'À venir'}</span>
                  <p className="text-2xl font-bold">
                    {bookings.filter(b => ['assigned', 'in_progress'].includes(b.status)).length}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/services')}
              className="btn-primary bg-white text-orange-600 hover:bg-gray-50 shadow-2xl"
              data-testid="browse-services-button"
            >
              <Search className="w-5 h-5 inline mr-2" />
              <span>{language === 'en' ? 'Book a Service' : 'Réserver un service'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'all'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
            data-testid="filter-all"
          >
            {language === 'en' ? 'All' : 'Tous'}
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'upcoming'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
            data-testid="filter-upcoming"
          >
            {language === 'en' ? 'Upcoming' : 'À venir'}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'completed'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
            data-testid="filter-completed"
          >
            {language === 'en' ? 'Completed' : 'Terminés'}
          </button>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="fancy-card text-center py-16 animate-fadeIn">
            <div className="inline-block p-6 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mb-6">
              <Briefcase className="w-16 h-16 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {language === 'en' ? 'No bookings yet!' : 'Aucune réservation encore!'}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === 'en' 
                ? 'Browse services and book your first tasker!' 
                : 'Parcourez les services et réservez votre premier tasker!'}
            </p>
            <button
              onClick={() => navigate('/services')}
              className="btn-primary"
            >
              <Search className="w-5 h-5 inline mr-2" />
              {language === 'en' ? 'Browse Services' : 'Parcourir les services'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => (
              <div
                key={booking.id}
                className="fancy-card p-6 hover-glow animate-fadeIn cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/tasks/${booking.id}`)}
                data-testid={`booking-card-${booking.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{booking.title}</h3>
                      <span className={`badge ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{booking.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.task_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{booking.duration_hours}h</span>
                      </div>
                      <div className="flex items-center space-x-2 font-semibold text-orange-600">
                        <span>{booking.total_cost} CFA</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {['assigned', 'in_progress'].includes(booking.status) && (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${booking.id}`);
                        }}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        <MessageCircle className="w-4 h-4 inline mr-1" />
                        {language === 'en' ? 'Chat' : 'Discuter'}
                      </button>
                      {booking.status === 'in_progress' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBooking(expandedBooking === booking.id ? null : booking.id);
                          }}
                          className="btn-success px-4 py-2 text-sm flex items-center justify-center"
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          {language === 'en' ? 'Live Track' : 'Suivi en direct'}
                          {expandedBooking === booking.id ? 
                            <ChevronUp className="w-4 h-4 ml-1" /> : 
                            <ChevronDown className="w-4 h-4 ml-1" />
                          }
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* GPS Tracker - Expandable Section */}
                {booking.status === 'in_progress' && expandedBooking === booking.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 animate-fadeIn">
                    <LiveGPSTracker
                      taskId={booking.id}
                      jobLocation={{
                        latitude: booking.latitude,
                        longitude: booking.longitude,
                        address: booking.address || booking.city
                      }}
                      taskerName={booking.tasker_name || 'Tasker'}
                      language={language}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewClientDashboard;
