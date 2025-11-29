import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI, taskersAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { Search, MapPin, DollarSign, Calendar, Briefcase } from 'lucide-react';

const TaskerDashboard = () => {
  const { language, user } = useAuth();
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchAvailableTasks();
    fetchMyApplications();
  }, []);

  const fetchAvailableTasks = async () => {
    try {
      const response = await tasksAPI.getAll({ status: 'posted' });
      setAvailableTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error(language === 'en' ? 'Failed to load tasks' : 'Échec du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await taskersAPI.getApplications();
      setMyApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const getApplicationStatus = (taskId) => {
    const application = myApplications.find(app => app.task_id === taskId);
    return application?.status;
  };

  const hasApplied = (taskId) => {
    return myApplications.some(app => app.task_id === taskId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="tasker-dashboard-title">
            {language === 'en' ? 'Welcome back, ' : 'Bon retour, '}{user?.full_name}!
          </h1>
          <p className="text-gray-600 mt-1">{t('findTasks')}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('available')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'available'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="available-tasks-tab"
            >
              {language === 'en' ? 'Available Tasks' : 'Tâches disponibles'} ({availableTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'applications'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="my-applications-tab"
            >
              {t('myApplications')} ({myApplications.length})
            </button>
          </nav>
        </div>

        {/* Available Tasks */}
        {activeTab === 'available' && (
          <div>
            {availableTasks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {language === 'en' ? 'No available tasks at the moment' : 'Aucune tâche disponible pour le moment'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                    data-testid={`available-task-card-${task.id}`}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>{task.budget} CFA</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{task.city}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(task.task_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {hasApplied(task.id) && (
                      <div className="mt-4 pt-4 border-t">
                        <span className="text-sm font-medium text-green-600">
                          {language === 'en' ? 'Applied' : 'Candidature envoyée'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Applications */}
        {activeTab === 'applications' && (
          <div>
            {myApplications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {language === 'en' ? 'No applications yet' : 'Aucune candidature encore'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map((application) => (
                  <div
                    key={application.id}
                    className="bg-white rounded-lg shadow-md p-6"
                    data-testid={`application-card-${application.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {language === 'en' ? 'Application for task' : 'Candidature pour la tâche'} #{application.task_id.slice(0, 8)}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4" />
                            <span>{language === 'en' ? 'Your rate:' : 'Votre tarif:'} {application.proposed_rate} CFA</span>
                          </div>
                          {application.message && (
                            <p className="text-gray-600 italic">&quot;{application.message}&quot;</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          application.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : application.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {application.status === 'accepted'
                          ? t('accept')
                          : application.status === 'rejected'
                          ? t('reject')
                          : language === 'en'
                          ? 'Pending'
                          : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskerDashboard;
