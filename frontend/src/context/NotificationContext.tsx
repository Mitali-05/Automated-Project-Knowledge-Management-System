import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

export interface Notification {
  id: number;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial fetch of notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiClient.get('/api/notifications');
        setNotifications(response.data);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();

    // Setup SSE connection
    const eventSource = new EventSource('http://localhost:8081/api/notifications/stream', {
      withCredentials: true,
    });

    eventSource.addEventListener('NOTIFICATION', (event) => {
      try {
        const newNotification = JSON.parse(event.data);
        setNotifications((prev) => [newNotification, ...prev]);
      } catch (error) {
        console.error('Failed to parse incoming notification', error);
      }
    });

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
      // In a real app, implement a retry mechanism here
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: number) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await apiClient.put(`/api/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark as read', error);
      // Revert if failed (optional, keeping it simple for now)
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await apiClient.put('/api/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, isLoading }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
