import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI, usersAPI } from '../api/client';
import { toast } from 'react-toastify';
import axios from 'axios';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import GPSTracker from '../components/GPSTracker';
import LocationSharing from '../components/LocationSharing';
import CancelTaskModal from '../components/CancelTaskModal';
import DisputeModal from '../components/DisputeModal';
import BadgeDisplay from '../components/BadgeDisplay';
import { MapPin, DollarSign, Calendar, User, Clock, ArrowLeft, MessageCircle, Navigation, XCircle, AlertTriangle, Star } from 'lucide-react';

const TaskDetails = () => {
  const { taskId } = useParams();
  const { language, user, isClient, isTasker } = useAuth();
  const [task, setTask] = useState(null);
  const [tasker, setTasker] = useState(null);
  const [client, setClient] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    proposed_rate: '',
    estimated_hours: '',
    message: '',
  });
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchTaskDetails();
    if (isClient) {
      fetchApplications();
    }
  }, [taskId]);

  useEffect(() => {
    // Fetch tasker details when task is loaded and has assigned tasker
    if (task?.assigned_tasker_id) {
      fetchTaskerDetails(task.assigned_tasker_id);
    }
    // Fetch client details when task is loaded
    if (task?.client_id) {
      fetchClientDetails(task.client_id);
    }
  }, [task?.assigned_tasker_id, task?.client_id]);

  const fetchTaskDetails = async () => {
    try {
      const response = await tasksAPI.getById(taskId);
      setTask(response.data);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error(language === 'en' ? 'Failed to load task' : 'Échec du chargement de la tâche');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await tasksAPI.getApplications(taskId);
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchTaskerDetails = async (taskerId) => {
    try {
      const response = await usersAPI.getById(taskerId);
      const taskerData = response.data;
      
      // Fetch real-time statistics
      try {
        const API_URL = process.env.REACT_APP_BACKEND_URL;
        const token = localStorage.getItem('token');
        
        // Use the same stats endpoint that ProfilePage uses for consistency
        const statsResponse = await axios.get(
          `${API_URL}/api/reviews/tasker/${taskerId}/rating`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const completedTasks = statsResponse.data.total_completed_tasks || 0;
        const totalReviews = statsResponse.data.total_reviews || 0;
        const averageRating = statsResponse.data.average_rating || 0;
        
        // Update tasker data with real stats
        if (taskerData.tasker_profile) {
          taskerData.tasker_profile.completed_tasks = completedTasks;
          taskerData.tasker_profile.total_reviews = totalReviews;
          taskerData.tasker_profile.average_rating = averageRating;
        }
      } catch (statsError) {
        console.error('Error fetching real-time stats:', statsError);
        // Continue with existing data if stats fetch fails
      }
      
      setTasker(taskerData);
    } catch (error) {
      console.error('Error fetching tasker details:', error);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.apply(taskId, {
        task_id: taskId,
        proposed_rate: parseFloat(applicationData.proposed_rate),
        estimated_hours: parseFloat(applicationData.estimated_hours),
        message: applicationData.message,
      });
      toast.success(language === 'en' ? 'Application submitted!' : 'Candidature envoyée!');
      setShowApplyModal(false);
      navigate('/tasker/dashboard');
    } catch (error) {
      console.error('Error applying:', error);
      toast.error(language === 'en' ? 'Failed to apply' : 'Échec de la candidature');
    }
  };

  const handleAssignTasker = async (taskerId) => {
    try {
      await tasksAPI.assignTasker(taskId, taskerId);
      toast.success(language === 'en' ? 'Tasker assigned!' : 'Tasker assigné!');
      fetchTaskDetails();
      fetchApplications();
    } catch (error) {
      console.error('Error assigning tasker:', error);
      toast.error(language === 'en' ? 'Failed to assign tasker' : 'Échec de l\'assignation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{language === 'en' ? 'Task not found' : 'Tâche non trouvée'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('back')}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Sharing (Tasker Only - for assigned tasks) */}
            {isTasker && task.assigned_tasker_id === user?.id && ['assigned', 'in_progress'].includes(task.status) && (
              <LocationSharing task={task} />
            )}

            {/* Task Info */}
            <div className="bg-white dark:bg-gray-800/70 rounded-lg shadow-md p-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4" data-testid="task-details-title">{task.title}</h1>
              <div className="flex items-center space-x-4 mb-6">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    task.status === 'posted'
                      ? 'bg-blue-100 text-blue-800'
                      : task.status === 'assigned'
                      ? 'bg-yellow-100 text-yellow-800'
                      : task.status === 'in_progress'
                      ? 'bg-purple-100 text-purple-800'
                      : task.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {t(task.status)}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start space-x-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('budget')}</p>
                    <p className="text-lg font-semibold">{task.budget} CFA</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('taskDate')}</p>
                    <p className="text-lg">{new Date(task.task_date).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">{t('location')}</p>
                    <p className="text-lg">{task.address}, {task.city}</p>
                  </div>
                </div>
                {task.estimated_hours > 0 && (
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">{t('estimatedHours')}</p>
                      <p className="text-lg">{task.estimated_hours} {language === 'en' ? 'hours' : 'heures'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">{t('description')}</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description}</p>
              </div>

              {/* Assigned Tasker Info (for clients) */}
              {isClient && task.assigned_tasker_id && tasker && (
                <div className="mt-6 p-4 glass-card">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    {language === 'en' ? 'Assigned Tasker' : 'Tasker assigné'}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {tasker.full_name?.charAt(0) || 'T'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        {tasker.full_name}
                      </h4>
                      {tasker.tasker_profile && (
                        <>
                          <div className="flex items-center space-x-3 mt-1">
                            <div className="flex items-center space-x-1">
                              <span className="text-yellow-500">⭐</span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {tasker.tasker_profile.average_rating?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {tasker.tasker_profile.completed_tasks || 0} {language === 'en' ? 'tasks completed' : 'tâches terminées'}
                            </span>
                          </div>
                          <div className="mt-2">
                            <BadgeDisplay taskerId={tasker.id} />
                          </div>
                        </>
                      )}
                      {tasker.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          📞 {tasker.phone}
                        </p>
                      )}
                      <button
                        onClick={() => navigate(`/tasker/${tasker.id}`)}
                        className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                      >
                        {language === 'en' ? 'View Full Profile →' : 'Voir le profil complet →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isTasker && task.status === 'posted' && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold"
                    data-testid="apply-to-task-button"
                  >
                    {t('apply')}
                  </button>
                </div>
              )}

              {/* Chat & GPS Buttons (for assigned tasks) */}
              {task.assigned_tasker_id && ['assigned', 'in_progress'].includes(task.status) && (
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center space-x-2"
                    data-testid="open-chat-button"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{language === 'en' ? 'Open Chat' : 'Ouvrir le chat'}</span>
                  </button>
                  {isClient && (
                    <button
                      onClick={() => setShowTracker(true)}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center space-x-2"
                      data-testid="track-tasker-button"
                    >
                      <Navigation className="w-5 h-5" />
                      <span>{language === 'en' ? 'Track Tasker' : 'Suivre le tasker'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Cancel Button (for active tasks) */}
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center space-x-2"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>{language === 'en' ? 'Cancel Task' : 'Annuler la tâche'}</span>
                  </button>
                </div>
              )}

              {/* Dispute Button (for completed tasks) */}
              {task.status === 'completed' && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="w-full py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold flex items-center justify-center space-x-2"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>{language === 'en' ? 'Raise Dispute' : 'Soulever un litige'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Applications (Client View) */}
            {isClient && applications.length > 0 && (
              <div className="bg-white dark:bg-gray-800/70 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t('applications')} ({applications.length})
                </h3>
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">Tasker #{app.tasker_id.slice(0, 8)}</p>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            app.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : app.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {language === 'en' ? 'Rate:' : 'Tarif:'} {app.proposed_rate} CFA
                      </p>
                      {app.message && (
                        <p className="text-sm text-gray-500 italic mb-2">&quot;{app.message}&quot;</p>
                      )}
                      {task.status === 'posted' && app.status === 'pending' && (
                        <button
                          onClick={() => handleAssignTasker(app.tasker_id)}
                          className="w-full py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
                          data-testid={`assign-tasker-button-${app.id}`}
                        >
                          {language === 'en' ? 'Assign this Tasker' : 'Assigner ce Tasker'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Component */}
        {showChat && <ChatBox task={task} onClose={() => setShowChat(false)} />}

        {/* GPS Tracker Component */}
        {showTracker && <GPSTracker task={task} onClose={() => setShowTracker(false)} />}

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800/70 rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-6">{t('apply')}</h2>
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('proposedRate')} (CFA)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={applicationData.proposed_rate}
                    onChange={(e) => setApplicationData({ ...applicationData, proposed_rate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    data-testid="proposed-rate-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('estimatedHours')}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={applicationData.estimated_hours}
                    onChange={(e) => setApplicationData({ ...applicationData, estimated_hours: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    data-testid="estimated-hours-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('message')} ({language === 'en' ? 'Optional' : 'Facultatif'})
                  </label>
                  <textarea
                    rows="3"
                    value={applicationData.message}
                    onChange={(e) => setApplicationData({ ...applicationData, message: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    data-testid="application-message-input"
                  />
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                    data-testid="submit-application-button"
                  >
                    {t('submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Task Modal */}
        {showCancelModal && (
          <CancelTaskModal
            task={task}
            onClose={() => setShowCancelModal(false)}
            onSuccess={fetchTaskDetails}
            language={language}
          />
        )}

        {/* Dispute Modal */}
        {showDisputeModal && (
          <DisputeModal
            task={task}
            onClose={() => setShowDisputeModal(false)}
            onSuccess={fetchTaskDetails}
            language={language}
          />
        )}
      </div>
    </div>
  );
};

export default TaskDetails;
