import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, Briefcase, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ImprovedNotificationCenter = ({ language = 'en' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;

  useEffect(() => {
    if (user && isOpen) {
      fetchNotifications();
    }
  }, [user, isOpen]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      // Extract notifications array from response
      const notificationsData = response.data.notifications || [];
      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark-read`,
        { ids: [notificationId] },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!Array.isArray(notifications)) return;
      
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark-read`,
        { ids: unreadIds },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => ({ ...n, is_read: true })) : []);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_accepted':
      case 'task_completed':
      case 'tasker_on_way':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'task_rejected':
      case 'task_cancelled':
      case 'dispute_raised':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'new_message':
        return <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'task_accepted':
      case 'task_completed':
      case 'tasker_on_way':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'task_rejected':
      case 'task_cancelled':
      case 'dispute_raised':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      case 'new_message':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-emerald-50 border-emerald-200';
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return language === 'en' ? 'Just now' : 'À l\'instant';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}${language === 'en' ? 'm ago' : 'min'}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}${language === 'en' ? 'h ago' : 'h'}`;
    return `${Math.floor(seconds / 86400)}${language === 'en' ? 'd ago' : 'j'}`;
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:bg-gray-800 transition"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800/70 rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {language === 'en' ? 'Notifications' : 'Notifications'}
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {language === 'en' ? 'Mark all read' : 'Tout marquer lu'}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {language === 'en' ? 'No notifications yet' : 'Aucune notification'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${
                            !notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {timeAgo(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ImprovedNotificationCenter;
