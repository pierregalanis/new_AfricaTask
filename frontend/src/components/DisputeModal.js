import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const DisputeModal = ({ task, onClose, onSuccess, language = 'en' }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const predefinedReasons = language === 'en' 
    ? [
        'Work not completed as agreed',
        'Quality issues',
        'Payment dispute',
        'No-show',
        'Other'
      ]
    : [
        'Travail non terminé comme convenu',
        'Problèmes de qualité',
        'Litige de paiement',
        'Absence',
        'Autre'
      ];

  const handleSubmit = async () => {
    if (!reason.trim() || !description.trim()) {
      setError(language === 'en' ? 'Please fill all fields' : 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('task_id', task.id);
      formData.append('reason', reason);
      formData.append('description', description);

      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/disputes`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      alert(language === 'en' ? 'Dispute raised successfully' : 'Litige soulevé avec succès');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error raising dispute:', err);
      setError(
        err.response?.data?.detail ||
        (language === 'en' ? 'Failed to raise dispute' : 'Échec de la soumission du litige')
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
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {language === 'en' ? 'Raise Dispute' : 'Soulever un litige'}
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
        </div>

        {/* Reason Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'en' ? 'Reason:' : 'Raison:'}
          </label>
          <div className="space-y-2">
            {predefinedReasons.map((r, idx) => (
              <button
                key={idx}
                onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-2 rounded-lg border transition ${
                  reason === r
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'en' ? 'Detailed description:' : 'Description détaillée:'}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={language === 'en' ? 'Please provide details...' : 'Veuillez fournir des détails...'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            rows={4}
          />
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
            disabled={loading || !reason.trim() || !description.trim()}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (language === 'en' ? 'Submitting...' : 'Envoi...')
              : (language === 'en' ? 'Submit Dispute' : 'Soumettre')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisputeModal;
