import React, { useState } from 'react';
import { X, DollarSign, Clock } from 'lucide-react';
import axios from 'axios';

const MarkAsPaidModal = ({ task, onClose, onSuccess, language = 'en' }) => {
  const [hours, setHours] = useState(task.hours_worked || task.estimated_hours || 2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hourlyRate = task.hourly_rate || 0;
  const calculatedAmount = hours * hourlyRate;

  const handleSubmit = async () => {
    if (hours <= 0) {
      setError(language === 'en' ? 'Hours must be greater than 0' : 'Les heures doivent être supérieures à 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('hours_worked', hours);

      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${task.id}/mark-paid-cash`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error marking as paid:', err);
      setError(
        err.response?.data?.detail ||
        (language === 'en' ? 'Failed to mark as paid' : 'Échec du marquage comme payé')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {language === 'en' ? 'Mark as Paid' : 'Marquer comme payé'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Task:' : 'Tâche:'}
          </p>
          <p className="font-semibold text-gray-900">{task.title}</p>
          <p className="text-sm text-gray-600 mt-2">
            {language === 'en' ? 'Hourly Rate:' : 'Taux horaire:'}{' '}
            <span className="font-semibold text-emerald-600">{hourlyRate.toLocaleString()} CFA/h</span>
          </p>
        </div>

        {/* Hours Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            {language === 'en' ? 'Hours Worked:' : 'Heures travaillées:'}
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-semibold"
          />
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' 
              ? 'Enter the actual hours worked (can use decimals like 2.5)' 
              : 'Entrez les heures réelles travaillées (peut utiliser des décimales comme 2.5)'}
          </p>
        </div>

        {/* Calculation Display */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">{language === 'en' ? 'Calculation:' : 'Calcul:'}</span>
            <span className="text-sm font-mono text-gray-600">{hours}h × {hourlyRate.toLocaleString()} CFA</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">{language === 'en' ? 'Total Amount:' : 'Montant total:'}</span>
            <span className="text-2xl font-bold text-green-600">{calculatedAmount.toLocaleString()} CFA</span>
          </div>
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
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
          >
            {language === 'en' ? 'Cancel' : 'Annuler'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || hours <= 0}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (language === 'en' ? 'Processing...' : 'Traitement...')
              : (language === 'en' ? 'Confirm Payment' : 'Confirmer le paiement')}
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-center text-gray-500 mt-4">
          {language === 'en'
            ? '💵 This will mark the task as paid via cash'
            : '💵 Ceci marquera la tâche comme payée en espèces'}
        </p>
      </div>
    </div>
  );
};

export default MarkAsPaidModal;
