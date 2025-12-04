import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI } from '../api/client';
import { toast } from 'react-toastify';
import axios from 'axios';
import Navbar from '../components/Navbar';
import LiveGPSTracker from '../components/LiveGPSTracker';
import LiveGPSTrackerWithRoute from '../components/LiveGPSTrackerWithRoute';
import ClientJobTimer from '../components/ClientJobTimer';
import PaymentModal from '../components/PaymentModal';
import ChatModal from '../components/ChatModal';
import ReviewModal from '../components/ReviewModal';
import MarkAsPaidModal from '../components/MarkAsPaidModal';
import { SkeletonCard, SkeletonList } from '../components/LoadingStates';
import { NoBookingsFound } from '../components/EmptyStates';
import { Search, Calendar, Briefcase, Clock, MessageCircle, Navigation, Star, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';

const NewClientDashboard = () => {
  const { language, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedBooking, setExpandedBooking] = useState(null); // Track which booking's GPS is expanded
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedTaskForPayment, setSelectedTaskForPayment] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
  const [taskerForChat, setTaskerForChat] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);
  const [markAsPaidModalOpen, setMarkAsPaidModalOpen] = useState(false);
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await tasksAPI.getAll({ client_id: user?.id });
      
      // Check review status for each completed & paid task
      const bookingsWithReviewStatus = await Promise.all(
        response.data.map(async (booking) => {
          if (booking.status === 'completed' && booking.is_paid) {
            try {
              const reviewCheck = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/reviews/task/${booking.id}/can-review`,
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}
              );
              return { 
                ...booking, 
                can_review: reviewCheck.data.can_review,
                has_reviewed: !reviewCheck.data.can_review && reviewCheck.data.reason === "Already reviewed"
              };
            } catch (error) {
              console.error('Error checking review eligibility:', error);
              return { ...booking, can_review: false, has_reviewed: false };
            }
          }
          return booking;
        })
      );
      
      setBookings(bookingsWithReviewStatus);
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
      in_progress: 'bg-emerald-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const statusMap = {
      assigned: language === 'en' ? 'Pending Acceptance' : 'En attente d\'acceptation',
      in_progress: language === 'en' ? 'Accepted - In Progress' : 'Accepté - En cours',
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
        <div className="fancy-card p-8 mb-8 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2" data-testid="client-dashboard-title">
                {language === 'en' ? '👋 Welcome back, ' : '👋 Bon retour, '}{user?.full_name}!
              </h1>
              <p className="text-emerald-100 text-lg">
                {language === 'en' ? 'Manage your bookings' : 'Gérez vos réservations'}
              </p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="bg-white/20 dark:bg-gray-800/50 backdrop-blur px-4 py-2 rounded-lg border border-white/30 dark:border-emerald-500/30">
                  <span className="text-sm text-white dark:text-emerald-200 font-medium">{language === 'en' ? 'Total Bookings' : 'Total'}</span>
                  <p className="text-2xl font-bold text-white dark:text-white">{bookings.length}</p>
                </div>
                <div className="bg-white/20 dark:bg-gray-800/50 backdrop-blur px-4 py-2 rounded-lg border border-white/30 dark:border-emerald-500/30">
                  <span className="text-sm text-white dark:text-emerald-200 font-medium">{language === 'en' ? 'Upcoming' : 'À venir'}</span>
                  <p className="text-2xl font-bold text-white dark:text-white">
                    {bookings.filter(b => ['assigned', 'in_progress'].includes(b.status)).length}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/services')}
              className="btn-primary bg-white dark:bg-gray-800/70 dark:bg-gray-800/70 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 dark:bg-gray-950 shadow-2xl"
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
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow'
            }`}
            data-testid="filter-all"
          >
            {language === 'en' ? 'All' : 'Tous'}
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'upcoming'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow'
            }`}
            data-testid="filter-upcoming"
          >
            {language === 'en' ? 'Upcoming' : 'À venir'}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow'
            }`}
            data-testid="filter-completed"
          >
            {language === 'en' ? 'Completed' : 'Terminés'}
          </button>
        </div>

        {/* Bookings List */}
        {loading ? (
          <SkeletonList count={3} />
        ) : filteredBookings.length === 0 ? (
          <NoBookingsFound language={language} userRole={user?.role} />
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
                      {booking.status === 'completed' && (
                        <span className={`badge ${
                          booking.is_paid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.is_paid 
                            ? (language === 'en' ? '✅ Paid' : '✅ Payé')
                            : (language === 'en' ? '💰 Unpaid' : '💰 Non payé')}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 dark:text-gray-200 text-sm mb-3 line-clamp-2">{booking.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.task_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{booking.duration_hours}h</span>
                      </div>
                      <div className="flex items-center space-x-2 font-semibold text-emerald-600">
                        <span>{booking.total_cost} CFA</span>
                      </div>
                    </div>
                    
                    {/* Payment Details for Completed Tasks */}
                    {booking.status === 'completed' && booking.payment_method && (
                      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-200 flex items-center space-x-2">
                        <span className="font-medium">
                          {language === 'en' ? 'Payment Method:' : 'Méthode de paiement:'}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          {booking.payment_method === 'cash' 
                            ? (language === 'en' ? 'Cash' : 'Espèces') 
                            : booking.payment_method}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {/* Mark as Paid Button (Tasker Only) */}
                  {user?.role === 'tasker' && booking.status === 'completed' && !booking.is_paid && (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForPayment(booking);
                          setMarkAsPaidModalOpen(true);
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <DollarSign className="w-5 h-5" />
                        <span>{language === 'en' ? 'Mark as Paid' : 'Marquer comme payé'}</span>
                      </button>
                    </div>
                  )}

                  {booking.status === 'completed' && booking.is_paid && (
                    <div className="flex flex-col space-y-2">
                      {booking.can_review && !booking.has_reviewed ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskForReview(booking);
                            setReviewModalOpen(true);
                          }}
                          className="px-6 py-3 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition flex items-center justify-center space-x-2 shadow-lg"
                        >
                          <Star className="w-5 h-5" />
                          <span>{language === 'en' ? 'Leave a Review' : 'Laisser un avis'}</span>
                        </button>
                      ) : booking.has_reviewed ? (
                        <div className="px-6 py-3 bg-green-100 border-2 border-green-300 rounded-xl font-semibold flex items-center justify-center space-x-2">
                          <Star className="w-5 h-5 fill-green-600 text-green-600" />
                          <span className="text-green-700">
                            {language === 'en' ? '✓ Review Submitted' : '✓ Avis soumis'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {booking.status === 'completed' && !booking.is_paid && (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForChat(booking);
                          setTaskerForChat({
                            id: booking.assigned_tasker_id,
                            full_name: booking.tasker_name || 'Tasker'
                          });
                          setChatModalOpen(true);
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>{language === 'en' ? 'Chat about Payment' : 'Discuter du paiement'}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForPayment(booking);
                          setPaymentModalOpen(true);
                        }}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <CreditCard className="w-5 h-5" />
                        <span>{language === 'en' ? 'Pay Online' : 'Payer en ligne'}</span>
                      </button>
                    </div>
                  )}
                  {['assigned', 'in_progress'].includes(booking.status) && (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForChat(booking);
                          setTaskerForChat({
                            id: booking.assigned_tasker_id,
                            full_name: booking.tasker_name || 'Tasker'
                          });
                          setChatModalOpen(true);
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>{language === 'en' ? 'Chat' : 'Discuter'}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (expandedBooking === booking.id) {
                            setExpandedBooking(null);
                          } else {
                            setExpandedBooking(booking.id);
                          }
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
                      >
                        <Navigation className="w-5 h-5" />
                        <span>{language === 'en' ? 'Track Tasker' : 'Suivre le tasker'}</span>
                        {expandedBooking === booking.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Job Timer and GPS Tracker for in-progress bookings */}
                {booking.status === 'in_progress' && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                    {/* Job Timer */}
                    <ClientJobTimer 
                      taskId={booking.id}
                      hourlyRate={booking.hourly_rate || 5000}
                      language={language}
                    />
                    
                    {/* GPS Tracker with Route - Expandable Section */}
                    {expandedBooking === booking.id && (
                      <div className="animate-fadeIn h-96">
                        <LiveGPSTrackerWithRoute
                          taskId={booking.id}
                          taskerLocation={{
                            latitude: booking.tasker_latitude || booking.latitude,
                            longitude: booking.tasker_longitude || booking.longitude
                          }}
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedTaskForPayment(null);
        }}
        task={selectedTaskForPayment}
        onPaymentSuccess={() => {
          setPaymentModalOpen(false);
          setSelectedTaskForPayment(null);
          fetchBookings();
        }}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setSelectedTaskForChat(null);
          setTaskerForChat(null);
        }}
        task={selectedTaskForChat}
        currentUser={user}
        otherUser={taskerForChat}
        language={language}
      />
      
      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedTaskForReview(null);
        }}
        task={selectedTaskForReview}
        taskerName={selectedTaskForReview?.tasker_name || 'Tasker'}
        onReviewSuccess={() => {
          // Update the specific booking to hide review button
          setBookings(prevBookings => 
            prevBookings.map(b => 
              b.id === selectedTaskForReview?.id 
                ? { ...b, can_review: false, has_reviewed: true }
                : b
            )
          );
        }}
        language={language}
      />

      {/* Mark as Paid Modal */}
      {markAsPaidModalOpen && selectedTaskForPayment && (
        <MarkAsPaidModal
          task={selectedTaskForPayment}
          onClose={() => {
            setMarkAsPaidModalOpen(false);
            setSelectedTaskForPayment(null);
          }}
          onSuccess={() => {
            fetchBookings(); // Refresh bookings
            setMarkAsPaidModalOpen(false);
            setSelectedTaskForPayment(null);
          }}
          language={language}
        />
      )}
    </div>
  );
};

export default NewClientDashboard;
