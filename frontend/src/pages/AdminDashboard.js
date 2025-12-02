import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Users, Briefcase, AlertTriangle, TrendingUp, Eye, CheckCircle, XCircle } from 'lucide-react';

const AdminDashboard = () => {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalTaskers: 0,
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalDisputes: 0,
    openDisputes: 0
  });
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, tasks, disputes

  useEffect(() => {
    // Check if user is admin (in a real app, this would be a backend check)
    if (user?.email !== 'admin@africatask.com') {
      navigate('/');
      return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch users
      const usersResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users`,
        { headers }
      );
      const allUsers = usersResponse.data;
      setUsers(allUsers);

      // Fetch tasks
      const tasksResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks`,
        { headers }
      );
      const allTasks = tasksResponse.data;
      setTasks(allTasks);

      // Fetch disputes
      const disputesResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/disputes`,
        { headers }
      );
      const allDisputes = disputesResponse.data;
      setDisputes(allDisputes);

      // Calculate stats
      setStats({
        totalUsers: allUsers.length,
        totalClients: allUsers.filter(u => u.role === 'client').length,
        totalTaskers: allUsers.filter(u => u.role === 'tasker').length,
        totalTasks: allTasks.length,
        activeTasks: allTasks.filter(t => ['pending', 'in_progress'].includes(t.status)).length,
        completedTasks: allTasks.filter(t => t.status === 'completed').length,
        totalDisputes: allDisputes.length,
        openDisputes: allDisputes.filter(d => d.status === 'open').length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId) => {
    const resolution = prompt(language === 'en' ? 'Enter resolution:' : 'Entrez la résolution:');
    if (!resolution) return;

    try {
      const formData = new FormData();
      formData.append('resolution', resolution);

      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/disputes/${disputeId}/resolve`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      alert(language === 'en' ? 'Dispute resolved!' : 'Litige résolu!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert(language === 'en' ? 'Failed to resolve dispute' : 'Échec de la résolution du litige');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{language === 'en' ? 'Loading...' : 'Chargement...'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'en' ? 'Admin Dashboard' : 'Tableau de bord admin'}
          </h1>
          <p className="text-gray-600">
            {language === 'en' ? 'Manage users, tasks, and disputes' : 'Gérer les utilisateurs, tâches et litiges'}
          </p>
        </div>

        {/* Stats Cards */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Users Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8" />
                  <TrendingUp className="w-6 h-6 opacity-75" />
                </div>
                <p className="text-sm opacity-90 mb-1">
                  {language === 'en' ? 'Total Users' : 'Utilisateurs totaux'}
                </p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs opacity-75 mt-2">
                  {stats.totalClients} {language === 'en' ? 'clients' : 'clients'} • {stats.totalTaskers} {language === 'en' ? 'taskers' : 'taskers'}
                </p>
              </div>

              {/* Tasks Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Briefcase className="w-8 h-8" />
                </div>
                <p className="text-sm opacity-90 mb-1">
                  {language === 'en' ? 'Total Tasks' : 'Tâches totales'}
                </p>
                <p className="text-3xl font-bold">{stats.totalTasks}</p>
                <p className="text-xs opacity-75 mt-2">
                  {stats.activeTasks} {language === 'en' ? 'active' : 'actives'} • {stats.completedTasks} {language === 'en' ? 'completed' : 'terminées'}
                </p>
              </div>

              {/* Disputes Card */}
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <p className="text-sm opacity-90 mb-1">
                  {language === 'en' ? 'Total Disputes' : 'Litiges totaux'}
                </p>
                <p className="text-3xl font-bold">{stats.totalDisputes}</p>
                <p className="text-xs opacity-75 mt-2">
                  {stats.openDisputes} {language === 'en' ? 'open' : 'ouverts'}
                </p>
              </div>

              {/* Revenue Card (Placeholder) */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <p className="text-sm opacity-90 mb-1">
                  {language === 'en' ? 'Platform Revenue' : 'Revenus plateforme'}
                </p>
                <p className="text-3xl font-bold">--</p>
                <p className="text-xs opacity-75 mt-2">
                  {language === 'en' ? 'Coming soon' : 'Bientôt disponible'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: language === 'en' ? 'Overview' : 'Aperçu', icon: TrendingUp },
                { id: 'users', label: language === 'en' ? 'Users' : 'Utilisateurs', icon: Users },
                { id: 'tasks', label: language === 'en' ? 'Tasks' : 'Tâches', icon: Briefcase },
                { id: 'disputes', label: language === 'en' ? 'Disputes' : 'Litiges', icon: AlertTriangle }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium transition ${
                    activeTab === tab.id
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-950 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Name' : 'Nom'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Email' : 'Email'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Role' : 'Rôle'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Country' : 'Pays'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.slice(0, 20).map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:bg-gray-950">
                        <td className="px-4 py-3 text-sm text-gray-900">{u.full_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === 'tasker' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.country || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-950 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Title' : 'Titre'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Status' : 'Statut'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Amount' : 'Montant'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {language === 'en' ? 'Date' : 'Date'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tasks.slice(0, 20).map(task => (
                      <tr key={task.id} className="hover:bg-gray-50 dark:bg-gray-950">
                        <td className="px-4 py-3 text-sm text-gray-900">{task.title}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            task.status === 'completed' ? 'bg-green-100 text-green-700' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {task.total_amount?.toLocaleString() || '--'} CFA
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(task.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {language === 'en' ? 'No disputes to review' : 'Aucun litige à examiner'}
                  </div>
                ) : (
                  disputes.map(dispute => (
                    <div key={dispute.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {dispute.task_title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {language === 'en' ? 'Raised by' : 'Soulevé par'}: <span className="font-medium">{dispute.raised_by_role}</span> • {new Date(dispute.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          dispute.status === 'open' ? 'bg-red-100 text-red-700' :
                          dispute.status === 'investigating' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {dispute.status}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'en' ? 'Reason:' : 'Raison:'}
                        </p>
                        <p className="text-sm text-gray-600">{dispute.reason}</p>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {language === 'en' ? 'Description:' : 'Description:'}
                        </p>
                        <p className="text-sm text-gray-600">{dispute.description}</p>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{dispute.client_name} vs {dispute.tasker_name}</span>
                      </div>

                      {dispute.status === 'open' && (
                        <button
                          onClick={() => handleResolveDispute(dispute.id)}
                          className="mt-4 flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{language === 'en' ? 'Resolve Dispute' : 'Résoudre le litige'}</span>
                        </button>
                      )}

                      {dispute.resolution && (
                        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-green-800 mb-1">
                            {language === 'en' ? 'Resolution:' : 'Résolution:'}
                          </p>
                          <p className="text-sm text-green-700">{dispute.resolution}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
