import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { SkeletonCard, SkeletonTable } from '../components/LoadingStates';
import { NoEarningsFound } from '../components/EmptyStates';
import { DollarSign, TrendingUp, Clock, Calendar, Download, Filter } from 'lucide-react';

const TaskerEarnings = () => {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all'); // all, week, month

  useEffect(() => {
    if (user?.role !== 'tasker') {
      navigate('/');
      return;
    }
    fetchEarnings();
  }, [user, timeFilter]);

  const fetchEarnings = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/taskers/earnings?period=${timeFilter}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setEarnings(response.data);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' CFA';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{language === 'en' ? 'Loading...' : 'Chargement...'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'en' ? 'My Earnings' : 'Mes revenus'}
            </h1>
            <p className="text-gray-600 mt-1">
              {language === 'en' ? 'Track your income and payments' : 'Suivez vos revenus et paiements'}
            </p>
          </div>
          
          {/* Time Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">{language === 'en' ? 'All Time' : 'Tout'}</option>
              <option value="week">{language === 'en' ? 'This Week' : 'Cette semaine'}</option>
              <option value="month">{language === 'en' ? 'This Month' : 'Ce mois'}</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8" />
              <TrendingUp className="w-6 h-6 opacity-75" />
            </div>
            <p className="text-sm opacity-90 mb-1">
              {language === 'en' ? 'Total Earnings' : 'Revenus totaux'}
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(earnings?.total_earnings || 0)}
            </p>
          </div>

          {/* Pending Payments */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <p className="text-sm opacity-90 mb-1">
              {language === 'en' ? 'Pending' : 'En attente'}
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(earnings?.pending_earnings || 0)}
            </p>
            <p className="text-xs opacity-75 mt-2">
              {earnings?.pending_count || 0} {language === 'en' ? 'tasks' : 'tâches'}
            </p>
          </div>

          {/* This Week */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <p className="text-sm opacity-90 mb-1">
              {language === 'en' ? 'This Week' : 'Cette semaine'}
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(earnings?.week_earnings || 0)}
            </p>
          </div>

          {/* This Month */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <p className="text-sm opacity-90 mb-1">
              {language === 'en' ? 'This Month' : 'Ce mois'}
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(earnings?.month_earnings || 0)}
            </p>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {language === 'en' ? 'Payment History' : 'Historique des paiements'}
            </h2>
            <button className="flex items-center space-x-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg">
              <Download className="w-4 h-4" />
              <span>{language === 'en' ? 'Export' : 'Exporter'}</span>
            </button>
          </div>

          {loading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : earnings?.payment_history && earnings.payment_history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {language === 'en' ? 'Date' : 'Date'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {language === 'en' ? 'Task' : 'Tâche'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {language === 'en' ? 'Client' : 'Client'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {language === 'en' ? 'Hours' : 'Heures'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {language === 'en' ? 'Amount' : 'Montant'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {language === 'en' ? 'Status' : 'Statut'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {earnings.payment_history.map((payment, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(payment.completed_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {payment.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {payment.client_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {payment.hours_worked || '-'}h
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {formatCurrency(payment.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          payment.is_paid 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {payment.is_paid 
                            ? (language === 'en' ? 'Paid' : 'Payé') 
                            : (language === 'en' ? 'Pending' : 'En attente')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {language === 'en' ? 'No payment history yet' : 'Aucun historique de paiement'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskerEarnings;
