import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, Clock, DollarSign, MapPin, User, 
  CheckCircle, AlertCircle, Loader, XCircle 
} from 'lucide-react';

const TaskCard = ({ task, language = 'en', onAction }) => {
  const getStatusBadge = (status) => {
    const badges = {
      posted: {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <AlertCircle className="w-3 h-3" />,
        label: language === 'en' ? 'Posted' : 'Publié'
      },
      assigned: {
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: <User className="w-3 h-3" />,
        label: language === 'en' ? 'Assigned' : 'Assigné'
      },
      in_progress: {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: <Loader className="w-3 h-3" />,
        label: language === 'en' ? 'In Progress' : 'En cours'
      },
      completed: {
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />,
        label: language === 'en' ? 'Completed' : 'Terminé'
      },
      cancelled: {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="w-3 h-3" />,
        label: language === 'en' ? 'Cancelled' : 'Annulé'
      }
    };

    const badge = badges[status] || badges.posted;

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        {badge.icon}
        <span>{badge.label}</span>
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link 
              to={`/tasks/${task.id}`}
              className="text-lg font-bold text-gray-900 hover:text-orange-600 transition line-clamp-1"
            >
              {task.title}
            </Link>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {task.description}
            </p>
          </div>
          <div className="ml-4">
            {getStatusBadge(task.status)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-3">
        {/* Location */}
        {task.location && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span className="line-clamp-1">{task.location}</span>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <span>{formatDate(task.task_date || task.created_at)}</span>
        </div>

        {/* Hours & Rate */}
        <div className="flex items-center justify-between">
          {task.estimated_hours && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span>{task.estimated_hours}h</span>
            </div>
          )}
          {task.hourly_rate && (
            <div className="flex items-center space-x-2 text-sm font-semibold text-orange-600">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>{task.hourly_rate.toLocaleString()} CFA/h</span>
            </div>
          )}
        </div>

        {/* Total Amount */}
        {task.total_amount > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {language === 'en' ? 'Total Amount:' : 'Montant total:'}
              </span>
              <span className="text-lg font-bold text-green-600">
                {task.total_amount.toLocaleString()} CFA
              </span>
            </div>
          </div>
        )}

        {/* Participants */}
        {(task.client_name || task.tasker_name) && (
          <div className="pt-3 border-t border-gray-100 space-y-1">
            {task.client_name && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {language === 'en' ? 'Client:' : 'Client:'}
                </span>
                <span className="font-medium">{task.client_name}</span>
              </div>
            )}
            {task.tasker_name && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {language === 'en' ? 'Tasker:' : 'Tasker:'}
                </span>
                <span className="font-medium">{task.tasker_name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with action */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <Link
          to={`/tasks/${task.id}`}
          className="block w-full text-center px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition group-hover:shadow-md"
        >
          {language === 'en' ? 'View Details' : 'Voir les détails'}
        </Link>
      </div>
    </div>
  );
};

export default TaskCard;
