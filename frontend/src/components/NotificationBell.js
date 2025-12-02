import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { language } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationText = (notification) => {
    const { type, task_title } = notification;
    
    if (language === 'en') {
      switch (type) {
        case 'task_accepted':
          return `Your task "${task_title}" has been accepted!`;
        case 'task_rejected':
          return `Your task "${task_title}" has been rejected.`;
        case 'task_completed':
          return `Task "${task_title}" has been marked as completed.`;
        case 'new_message':
          return `You have a new message for "${task_title}".`;
        case 'payment_received':
          return `Payment received for task "${task_title}".`;
        case 'review_received':
          return `You received a new review for "${task_title}".`;
        default:
          return notification.message || 'New notification';
      }
    } else {
      switch (type) {
        case 'task_accepted':
          return `Votre tâche "${task_title}" a été acceptée!`;
        case 'task_rejected':
          return `Votre tâche "${task_title}" a été rejetée.`;
        case 'task_completed':
          return `La tâche "${task_title}" a été marquée comme terminée.`;
        case 'new_message':
          return `Vous avez un nouveau message pour "${task_title}".`;
        case 'payment_received':
          return `Paiement reçu pour la tâche "${task_title}".`;
        case 'review_received':
          return `Vous avez reçu un nouvel avis pour "${task_title}".`;
        default:
          return notification.message || 'Nouvelle notification';
      }
    }
  };

  const getNotificationIcon = (type) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'task_accepted':
        return <Check className={`${iconClass} text-green-600`} />;
      case 'task_rejected':
        return <span className={`${iconClass} text-red-600`}>✕</span>;
      case 'new_message':
        return <span className="text-blue-600">💬</span>;
      case 'payment_received':
        return <span className="text-green-600">💰</span>;
      case 'review_received':
        return <span className="text-yellow-600">⭐</span>;
      default:
        return <Bell className={`${iconClass} text-gray-600`} />;
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    // Navigate to dashboard
    navigate('/dashboard');
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return language === 'en' ? 'Just now' : "À l'instant";
    if (diffInMinutes < 60) return `${diffInMinutes}${language === 'en' ? 'min ago' : 'min'}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}${language === 'en' ? 'h ago' : 'h'}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}${language === 'en' ? 'd ago' : 'j'}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {language === 'en' ? 'Notifications' : 'Notifications'}
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center space-x-1"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{language === 'en' ? 'Mark all read' : 'Tout marquer'}</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>{language === 'en' ? 'No notifications' : 'Aucune notification'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>
                          {getNotificationText(notification)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {formatTimestamp(notification.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
