import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationId, setLastNotificationId] = useState(null);

  // Fetch notifications when user logs in
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      // Poll for new notifications every 10 seconds
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      const newNotifications = response.data.notifications || [];
      const newUnreadCount = response.data.unread_count || 0;
      
      // Check if there's a new notification
      if (newNotifications.length > 0 && newNotifications[0].id !== lastNotificationId) {
        const latestNotification = newNotifications[0];
        
        // Show toast notification for new unread notifications
        if (!latestNotification.is_read && lastNotificationId !== null) {
          showToastNotification(latestNotification);
        }
        
        setLastNotificationId(latestNotification.id);
      }
      
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const showToastNotification = (notification) => {
    // Use react-toastify to show a popup
    const { toast } = require('react-toastify');
    
    const getNotificationMessage = () => {
      switch (notification.type) {
        case 'new_booking':
          return `📋 New booking: ${notification.task_title}`;
        case 'task_accepted':
          return `✅ Task accepted: ${notification.task_title}`;
        case 'task_rejected':
          return `❌ Task rejected: ${notification.task_title}`;
        case 'task_completed':
          return `🎉 Task completed: ${notification.task_title}`;
        case 'task_cancelled':
          return `⚠️ Task cancelled: ${notification.task_title}`;
        default:
          return notification.message || 'New notification';
      }
    };

    toast.info(getNotificationMessage(), {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/mark-all-read`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/notifications/${notificationId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
