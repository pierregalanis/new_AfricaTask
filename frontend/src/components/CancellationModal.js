import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CancellationModal = ({ isOpen, onClose, taskId, userRole, onSuccess, language = 'en' }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const cancellationReasons = language === 'en' ? [
    'Schedule conflict',
    'Found another tasker',
    'No longer need service',
    'Price too high',
    'Tasker not responding',
    'Emergency/Personal issue',
    'Other'
  ] : [
    'Conflit d\'horaire',
    'Trouvé un autre prestataire',
    'N\'ai plus besoin du service',
    'Prix trop élevé',
    'Prestataire ne répond pas',
    'Urgence/Problème personnel',
    'Autre'
  ];

  const handleCancel = async () => {
    if (!reason) {
      toast.error(language === 'en' ? 'Please select a reason' : 'Veuillez sélectionner une raison');
      return;
    }

    if (reason === (language === 'en' ? 'Other' : 'Autre') && !customReason.trim()) {
      toast.error(language === 'en' ? 'Please provide a reason' : 'Veuillez fournir une raison');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/cancel`,
        {
          reason: reason === (language === 'en' ? 'Other' : 'Autre') ? customReason : reason,
          cancelled_by: userRole
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      toast.success(language === 'en' ? 'Task cancelled successfully' : 'Tâche annulée avec succès');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'en' ? 'Failed to cancel' : 'Échec de l\'annulation'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-red-100 rounded-full p-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {language === 'en' ? 'Cancel Task' : 'Annuler la tâche'}
            </h2>
            <p className="text-sm text-gray-500">
              {language === 'en' ? 'This action cannot be undone' : 'Cette action est irréversible'}
            </p>
          </div>
        </div>

        {/* Cancellation Reasons */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'en' ? 'Reason for cancellation' : 'Raison de l\'annulation'} *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">{language === 'en' ? 'Select a reason...' : 'Sélectionner une raison...'}</option>
            {cancellationReasons.map((r, idx) => (
              <option key={idx} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Custom Reason Input */}
        {(reason === 'Other' || reason === 'Autre') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Please specify' : 'Veuillez préciser'}
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              placeholder={language === 'en' ? 'Enter your reason...' : 'Entrez votre raison...'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            {language === 'en' 
              ? 'Cancelling this task will notify the other party. Frequent cancellations may affect your account standing.'
              : 'L\'annulation de cette tâche notifiera l\'autre partie. Les annulations fréquentes peuvent affecter votre compte.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {language === 'en' ? 'Keep Task' : 'Garder la tâche'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading || !reason}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading 
              ? (language === 'en' ? 'Cancelling...' : 'Annulation...') 
              : (language === 'en' ? 'Cancel Task' : 'Annuler')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;
