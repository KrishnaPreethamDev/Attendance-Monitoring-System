import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { courseAPI } from '../services/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  related_entity_type?: string;
  related_entity_id?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await courseAPI.getNotifications({ limit: 50 });
      setNotifications(response.data.notifications);
      setTotalCount(response.data.total_count);
      setUnreadCount(response.data.unread_count);
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUnreadCount = async () => {
    try {
      const response = await courseAPI.getUnreadCount();
      setUnreadCount(response.data.unread_count);
    } catch (err) {
      console.error('Error refreshing unread count:', err);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await courseAPI.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await courseAPI.markAllNotificationsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await courseAPI.deleteNotification(notificationId);
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await courseAPI.deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
    } catch (err) {
      console.error('Error deleting all notifications:', err);
    }
  };

  // Auto-refresh unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
