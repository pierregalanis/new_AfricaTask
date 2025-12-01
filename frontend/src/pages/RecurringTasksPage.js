import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { SkeletonList } from '../components/LoadingStates';
import EmptyState from '../components/EmptyStates';
import { Calendar, Clock, Repeat, ToggleLeft, ToggleRight, Trash2, Plus } from 'lucide-react';

const RecurringTasksPage = () => {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecurringTasks();
  }, []);

  const fetchRecurringTasks = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/recurring-tasks`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setRecurringTasks(response.data);
    } catch (error) {
      console.error('Error fetching recurring tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/recurring-tasks/${taskId}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      fetchRecurringTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm(language === 'en' ? 'Delete this recurring task?' : 'Supprimer cette tâche récurrente ?')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/recurring-tasks/${taskId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      fetchRecurringTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Don't return early - render loading in place

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Repeat className="w-8 h-8 text-orange-600" />
              <span>{language === 'en' ? 'Recurring Tasks' : 'Tâches récurrentes'}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {language === 'en' ? 'Manage your scheduled tasks' : 'Gérez vos tâches programmées'}
            </p>
          </div>
          
          {user?.role === 'client' && (
            <button
              onClick={() => navigate('/services')}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Plus className="w-5 h-5" />
              <span>{language === 'en' ? 'New Recurring Task' : 'Nouvelle tâche'}</span>
            </button>
          )}
        </div>

        {/* Tasks List */}
        {recurringTasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Repeat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {language === 'en' ? 'No recurring tasks yet' : 'Aucune tâche récurrente pour le moment'}
            </p>
            <p className="text-sm text-gray-500">
              {language === 'en' 
                ? 'Create a recurring schedule to automate your regular bookings' 
                : 'Créez un calendrier récurrent pour automatiser vos réservations régulières'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-white rounded-xl shadow-lg p-6 transition ${
                  task.is_active ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {task.is_active 
                          ? (language === 'en' ? 'Active' : 'Actif')
                          : (language === 'en' ? 'Paused' : 'En pause')}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{task.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span className="capitalize">{task.frequency}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>{task.scheduled_time}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="font-medium">{task.estimated_hours}h × {task.hourly_rate.toLocaleString()} CFA/h</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-600">
                      <span className="font-medium">{language === 'en' ? 'Next occurrence:' : 'Prochaine occurrence:'}</span>
                      {' '}{new Date(task.next_occurrence).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title={task.is_active ? 'Pause' : 'Activate'}
                    >
                      {task.is_active ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringTasksPage;
