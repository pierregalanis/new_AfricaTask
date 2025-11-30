import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { tasksAPI, categoriesAPI } from '../api/client';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { Plus, MapPin, DollarSign, Calendar, Briefcase } from 'lucide-react';

const ClientDashboard = () => {
  const { language, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category_id: '',
    subcategory: '',
    budget: '',
    estimated_hours: '',
    task_date: '',
    address: user?.address || '',
    city: user?.city || '',
    latitude: user?.latitude || 5.345317,
    longitude: user?.longitude || -4.024429,
  });

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getAll({ client_id: user?.id });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error(language === 'en' ? 'Failed to load tasks' : 'Échec du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        budget: parseFloat(newTask.budget),
        task_date: new Date(newTask.task_date).toISOString(),
      };
      
      // Only add estimated_hours if it has a value
      if (newTask.estimated_hours) {
        taskData.estimated_hours = parseFloat(newTask.estimated_hours);
      }
      
      await tasksAPI.create(taskData);
      toast.success(language === 'en' ? 'Task created!' : 'Tâche créée!');
      setShowCreateModal(false);
      fetchTasks();
      setNewTask({
        title: '',
        description: '',
        category_id: '',
        subcategory: '',
        budget: '',
        estimated_hours: '',
        task_date: '',
        address: user?.address || '',
        city: user?.city || '',
        latitude: user?.latitude || 5.345317,
        longitude: user?.longitude || -4.024429,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      const errorMsg = error.response?.data?.detail || (language === 'en' ? 'Failed to create task' : 'Échec de la création de la tâche');
      toast.error(errorMsg);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      posted: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const statusMap = {
      posted: t('posted'),
      assigned: t('assigned'),
      in_progress: t('inProgress'),
      completed: t('completed'),
      cancelled: t('cancelled'),
    };
    return statusMap[status] || status;
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
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fancy Header with Gradient */}
        <div className="fancy-card p-8 mb-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2" data-testid="dashboard-title">
                {language === 'en' ? '👋 Welcome back, ' : '👋 Bon retour, '}{user?.full_name}!
              </h1>
              <p className="text-orange-100 text-lg">{t('myTasks')}</p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-sm opacity-90">{language === 'en' ? 'Total Tasks' : 'Total des tâches'}</span>
                  <p className="text-2xl font-bold">{tasks.length}</p>
                </div>
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-sm opacity-90">{language === 'en' ? 'Active' : 'Actives'}</span>
                  <p className="text-2xl font-bold">{tasks.filter(t => ['posted', 'assigned', 'in_progress'].includes(t.status)).length}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary bg-white text-orange-600 hover:bg-gray-50 shadow-2xl"
              data-testid="post-task-button"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              <span>{t('postTask')}</span>
            </button>
          </div>
        </div>

        {/* Fancy Tasks Grid */}
        {tasks.length === 0 ? (
          <div className="fancy-card text-center py-16 animate-fadeIn">
            <div className="inline-block p-6 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mb-6">
              <Briefcase className="w-16 h-16 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {language === 'en' ? 'No tasks yet!' : 'Aucune tâche encore!'}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === 'en' ? 'Create your first task and find the perfect tasker!' : 'Créez votre première tâche et trouvez le tasker parfait!'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              {t('postTask')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="fancy-card p-6 cursor-pointer hover-glow animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`task-card-${task.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex-1 gradient-text">{task.title}</h3>
                  <span className={`badge ${getStatusBadgeColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">{task.budget} CFA</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <span>{task.city}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <span>{new Date(task.task_date).toLocaleDateString()}</span>
                  </div>
                </div>
                {task.applications_count > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg px-3 py-2 inline-flex items-center">
                      <span className="text-sm font-semibold text-orange-700">
                        🎯 {task.applications_count} {language === 'en' ? 'applications' : 'candidatures'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fancy Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="fancy-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-scaleIn">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold gradient-text">{t('postTask')}</h2>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('taskTitle')}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="fancy-input"
                    placeholder={language === 'en' ? 'e.g., Fix my kitchen sink' : 'ex: Réparer mon évier de cuisine'}
                    data-testid="task-title-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('description')}
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    data-testid="task-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('category')}
                    </label>
                    <select
                      required
                      value={newTask.category_id}
                      onChange={(e) => setNewTask({ ...newTask, category_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      data-testid="task-category-select"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {language === 'en' ? cat.name_en : cat.name_fr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('budget')} (CFA)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newTask.budget}
                      onChange={(e) => setNewTask({ ...newTask, budget: e.target.value })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      data-testid="task-budget-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('taskDate')}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newTask.task_date}
                      onChange={(e) => setNewTask({ ...newTask, task_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      data-testid="task-date-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('city')}
                    </label>
                    <input
                      type="text"
                      required
                      value={newTask.city}
                      onChange={(e) => setNewTask({ ...newTask, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      data-testid="task-city-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('address')}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.address}
                    onChange={(e) => setNewTask({ ...newTask, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    data-testid="task-address-input"
                  />
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    data-testid="create-task-submit-button"
                  >
                    {t('submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
