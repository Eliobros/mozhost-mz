// contexts/NotificationsContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationsService, Notification } from '@/services/notifications';

interface NotificationsContextData {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextData>({} as NotificationsContextData);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Carregar notificações
  const refresh = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getAll();
      
      // Verificar se data existe antes de acessar
      if (data && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      // Se der erro, deixa vazio
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // Atualizar a cada 30 segundos
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  // Marcar como lida
  const markAsRead = async (id: number) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas:', error);
    }
  };

  // Deletar
  const deleteNotification = async (id: number) => {
    try {
      await notificationsService.delete(id);
      const deleted = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deleted && !deleted.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
