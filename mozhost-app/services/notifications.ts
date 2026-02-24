// services/notifications.ts
import { api } from './api'; // ✅ named import

export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const notificationsService = {
  // Listar notificações
  async getAll(): Promise<NotificationsResponse> {
    const response = await api.get('/notifications');
    return response.data;
  },

  // Marcar como lida
  async markAsRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  // Marcar todas como lidas
  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },

  // Deletar notificação
  async delete(id: number): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
