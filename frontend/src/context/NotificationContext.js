import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Notifications from 'expo-notifications';
import { AuthContext } from './AuthContext';
import apiClient from '../api/client';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async (showLoading = true) => {
    if (!user) return;
    try {
      if (showLoading) setIsLoading(true);
      const response = await apiClient.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.notifications);
        const unread = response.data.notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.log('Error fetching notifications:', error.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      // Optimistically update UI
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await apiClient.put(`/notifications/${id}/read`);
    } catch (error) {
      console.log('Error marking notification as read:', error.message);
      // Revert on error
      fetchNotifications(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await apiClient.put('/notifications/read-all');
    } catch (error) {
      console.log('Error marking all notifications as read:', error.message);
      // Revert on error
      fetchNotifications(false);
    }
  };

  // Fetch notifications when user changes
  useEffect(() => {
    if (user) {
      // First load shows loading spinner
      fetchNotifications(true);
      
      // Listen to foreground notifications to update state in real-time
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Foreground Notification Received in Context, updating list:', notification.request.content.title);
        fetchNotifications(false); // Silent update
      });

      // Polling fallback every 10 seconds for simulator / offline development
      const intervalId = setInterval(() => {
        fetchNotifications(false); // Silent update
      }, 10000);

      return () => {
        subscription.remove();
        clearInterval(intervalId);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
