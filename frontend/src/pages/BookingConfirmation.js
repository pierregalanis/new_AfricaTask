import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI, usersAPI, paymentsAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { CheckCircle, Calendar, Clock, DollarSign, MapPin, User, MessageCircle, Navigation } from 'lucide-react';

const BookingConfirmation = () => {
  const { taskId } = useParams();
  const { language } = useAuth();
  const [task, setTask] = useState(null);
  const [tasker, setTasker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchBookingDetails();
  }, [taskId]);

  const fetchBookingDetails = async () => {
    try {
      const taskResponse = await tasksAPI.getById(taskId);
      setTask(taskResponse.data);
      
      const taskerResponse = await usersAPI.getById(taskResponse.data.assigned_tasker_id);
      setTasker(taskerResponse.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error(language === 'en' ? 'Failed to load booking' : 'Échec du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      await paymentsAPI.create({
        task_id: taskId,
        amount: task.total_cost,
        payment_method: paymentMethod,
      });
      toast.success('✅ ' + (language === 'en' ? 'Payment processed!' : 'Paiement traité!'));
      setShowPayment(false);
      fetchBookingDetails();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(language === 'en' ? 'Payment failed' : 'Échec du paiement');
    }
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="fancy-card p-8 mb-8 text-center bg-gradient-to-r from-green-500 to-green-600 text-white animate-fadeIn">
          <CheckCircle className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2" data-testid="confirmation-title">
            {language === 'en' ? 'Booking Confirmed!' : 'Réservation confirmée!'}
          </h1>
          <p className="text-xl text-green-100">
            {language === 'en' ? 'Your service has been booked successfully' : 'Votre service a été réservé avec succès'}
          </p>
        </div>

        {/* Booking Details */}
        <div className="fancy-card p-8 mb-8 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {language === 'en' ? 'Booking Details' : 'Détails de la réservation'}
          </h2>

          <div className="space-y-6">
            {/* Service Info */}
            <div className="flex items-start space-x-4 pb-6 border-b">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{task?.title}</h3>
                <p className="text-gray-600 mt-1">{task?.description}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center space-x-4">
              <Calendar className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">{language === 'en' ? 'Date & Time' : 'Date & Heure'}</p>
                <p className="font-semibold text-gray-900">
                  {new Date(task?.task_date).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center space-x-4">
              <Clock className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">{language === 'en' ? 'Duration' : 'Durée'}</p>
                <p className="font-semibold text-gray-900">{task?.duration_hours} {language === 'en' ? 'hours' : 'heures'}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center space-x-4">
              <MapPin className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">{t('location')}</p>
                <p className="font-semibold text-gray-900">{task?.address}, {task?.city}</p>
              </div>
            </div>

            {/* Total Cost */}
            <div className="flex items-center space-x-4 pt-6 border-t">
              <DollarSign className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">{language === 'en' ? 'Total Cost' : 'Coût total'}</p>
                <p className="text-3xl font-bold text-emerald-600">{task?.total_cost} CFA</p>
                <p className="text-sm text-gray-500">
                  ({task?.hourly_rate} CFA/hr × {task?.duration_hours}h)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tasker Info */}
        {tasker && (
          <div className="fancy-card p-8 mb-8 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {language === 'en' ? 'Your Tasker' : 'Votre Tasker'}
            </h2>
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                {tasker.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{tasker.full_name}</h3>
                <p className="text-gray-600">{tasker.email}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>⭐ {tasker.tasker_profile?.average_rating?.toFixed(1) || '0.0'}</span>
                  <span>• {tasker.tasker_profile?.completed_tasks || 0} {language === 'en' ? 'tasks' : 'tâches'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => navigate('/client/bookings')}
            className="btn-primary"
            data-testid="view-bookings-button"
          >
            {language === 'en' ? 'View My Bookings' : 'Voir mes réservations'}
          </button>
          <button
            onClick={() => setShowPayment(true)}
            className="btn-secondary"
            data-testid="payment-button"
          >
            💳 {language === 'en' ? 'Make Payment' : 'Effectuer le paiement'}
          </button>
        </div>

        {/* Next Steps */}
        <div className="fancy-card p-6 bg-blue-50 border border-blue-200 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <h3 className="font-semibold text-blue-900 mb-3">
            {language === 'en' ? '📋 Next Steps:' : '📋 Prochaines étapes:'}
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ {language === 'en' ? 'Your tasker will confirm the booking' : 'Votre tasker confirmera la réservation'}</li>
            <li>✓ {language === 'en' ? 'You can chat with them for any questions' : 'Vous pouvez discuter pour toute question'}</li>
            <li>✓ {language === 'en' ? 'Track their location on the task day' : 'Suivez leur position le jour de la tâche'}</li>
            <li>✓ {language === 'en' ? 'Payment is due after service completion' : 'Le paiement est dû après le service'}</li>
          </ul>
        </div>

        {/* Payment Modal */}
        {showPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="fancy-card max-w-md w-full p-8 animate-scaleIn">
              <h2 className="text-2xl font-bold mb-6">{language === 'en' ? 'Select Payment Method' : 'Méthode de paiement'}</h2>
              <div className="space-y-3 mb-6">
                {['cash', 'orange_money', 'wave', 'paypal'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`w-full p-4 rounded-xl border-2 transition text-left ${
                      paymentMethod === method
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-semibold">
                      {method === 'cash' && '💵 ' + t('cash')}
                      {method === 'orange_money' && '🟠 ' + t('orangeMoney')}
                      {method === 'wave' && '🌊 ' + t('wave')}
                      {method === 'paypal' && '💳 ' + t('paypal')}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowPayment(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 btn-primary"
                >
                  {language === 'en' ? 'Confirm' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingConfirmation;
