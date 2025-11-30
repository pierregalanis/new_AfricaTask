import React, { useState } from 'react';
import { X, CreditCard, Smartphone } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const PaymentModal = ({ isOpen, onClose, task, onPaymentSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState([
    'card',
    'orange-money-senegal',
    'wave-senegal',
    'orange-money-ci',
    'wave-ci'
  ]);

  if (!isOpen || !task) return null;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      const paymentData = {
        task_id: task.id,
        amount: task.total_cost,
        description: `Payment for task: ${task.title}`,
        customer_name: userData.full_name || 'Customer',
        customer_email: userData.email || '[email protected]',
        customer_phone: userData.phone || '0000000000',
        channels: selectedChannels,
        return_url: `${window.location.origin}/client/dashboard?payment=success`,
        cancel_url: `${window.location.origin}/client/dashboard?payment=cancelled`
      };

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/payments/create-invoice`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.payment_url) {
        // Redirect to Paydunya payment page
        window.location.href = response.data.payment_url;
      } else {
        throw new Error('Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Paiement en ligne
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Task Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{task.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Montant à payer:</span>
              <span className="text-2xl font-bold text-orange-600">
                {task.total_cost?.toLocaleString()} CFA
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Méthodes de paiement disponibles:
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Carte bancaire</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                <Smartphone className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Orange Money</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-pink-50 rounded-lg">
                <Smartphone className="w-5 h-5 text-pink-600" />
                <span className="text-sm font-medium text-gray-700">Wave</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              🔒 Paiement sécurisé via Paydunya. Vous serez redirigé vers une page de paiement sécurisée.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition"
            disabled={isProcessing}
          >
            Annuler
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Traitement...
              </span>
            ) : (
              'Payer maintenant'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
