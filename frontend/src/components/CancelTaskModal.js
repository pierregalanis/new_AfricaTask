import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const CancelTaskModal = ({ task, onClose, onSuccess, language = 'en' }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const predefinedReasons = language === 'en' 
    ? [
        'Schedule conflict',
        'Found another tasker',
        'Task no longer needed',
        'Pricing issue',
        'Other'
      ]
    : [
        'Conflit d\'horaire',
        'Trouvé un autre tasker',
        'Tâche plus nécessaire',
        'Problème de tarification',
        'Autre'
      ];

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError(language === 'en' ? 'Please provide a reason' : 'Veuillez fournir une raison');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('reason', reason);

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${task.id}/cancel`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Show penalty warning if applicable
      if (response.data.penalty_amount > 0) {
        alert(
          language === 'en'
            ? `Cancellation fee: ${response.data.penalty_amount.toLocaleString()} CFA\nReason: ${response.data.penalty_reason}`
            : `Frais d'annulation: ${response.data.penalty_amount.toLocaleString()} CFA\nRaison: ${response.data.penalty_reason}`
        );
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error cancelling task:', err);
      setError(
        err.response?.data?.detail ||
        (language === 'en' ? 'Failed to cancel task' : 'Échec de l\'annulation')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 my-8 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'en' ? 'Cancel Task' : 'Annuler la tâche'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Warning Message */}
        {task.status === 'in_progress' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              {language === 'en'
                ? '⚠️ This task is in progress. Cancellation may incur a penalty based on hours worked.'
                : '⚠️ Cette tâche est en cours. L\'annulation peut entraîner une pénalité basée sur les heures travaillées.'}
            </p>
          </div>
        )}

        {/* Task Info */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {language === 'en' ? 'Task:' : 'Tâche:'}
          </p>
          <p className="font-semibold text-gray-900 dark:text-white">{task.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {language === 'en' ? 'Status:' : 'Statut:'}{' '}
            <span className="font-medium capitalize">{task.status}</span>
          </p>
        </div>

        {/* Reason Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'en' ? 'Reason for cancellation:' : 'Raison de l\'annulation:'}
          </label>
          <div className="space-y-2 mb-3">
            {predefinedReasons.map((r, idx) => (
              <button
                key={idx}
                onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-2 rounded-lg border transition ${
                  reason === r
                    ? 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          
          {/* Custom Reason */}
          {reason === (language === 'en' ? 'Other' : 'Autre') && (
            <textarea
              value={reason === (language === 'en' ? 'Other' : 'Autre') ? '' : reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'en' ? 'Enter your reason...' : 'Entrez votre raison...'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 placeholder-gray-400 dark:placeholder-gray-500"
              rows={3}
            />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-950 font-semibold disabled:opacity-50"
          >
            {language === 'en' ? 'Keep Task' : 'Garder la tâche'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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

export default CancelTaskModal;
