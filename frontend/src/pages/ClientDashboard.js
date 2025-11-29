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
      await tasksAPI.create({
        ...newTask,
        budget: parseFloat(newTask.budget),
        estimated_hours: parseFloat(newTask.estimated_hours || 0),
        task_date: new Date(newTask.task_date).toISOString(),
      });
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
      toast.error(language === 'en' ? 'Failed to create task' : 'Échec de la création de la tâche');
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="dashboard-title">
              {language === 'en' ? 'Welcome back, ' : 'Bon retour, '}{user?.full_name}!
            </h1>
            <p className="text-gray-600 mt-1">{t('myTasks')}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            data-testid="post-task-button"
          >
            <Plus className="w-5 h-5" />
            <span>{t('postTask')}</span>
          </button>
        </div>

        {/* Tasks Grid */}
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {language === 'en' ? 'No tasks yet. Create your first task!' : 'Aucune tâche encore. Créez votre première tâche!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                data-testid={`task-card-${task.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">{task.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
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
                {task.applications_count > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm font-medium text-orange-600">
                      {task.applications_count} {language === 'en' ? 'applications' : 'candidatures'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-6">{t('postTask')}</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('taskTitle')}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
