import { useEffect } from 'react';
import { create } from 'zustand';
import { getSocket } from '../services/socket';
import api from '../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  entityId?: string;
  entityType?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[], count: number) => void;
  addNotification: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  addNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications].slice(0, 30),
      unreadCount: s.unreadCount + 1,
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));

/** Fetch initial notifications + subscribe to real-time pushes */
export function useNotifications() {
  const store = useNotificationStore();

  useEffect(() => {
    // Fetch existing notifications on mount
    api.get('/notifications').then(({ data }) => {
      store.setNotifications(data.notifications, data.unreadCount);
    }).catch(() => {});

    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const onNew = (notification: Notification) => {
      store.addNotification(notification);
    };

    socket.on('NOTIFICATION_CREATED', onNew);
    return () => { socket.off('NOTIFICATION_CREATED', onNew); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    store.markRead(id);
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    store.markAllRead();
  };

  return { ...store, markRead, markAllRead };
}
