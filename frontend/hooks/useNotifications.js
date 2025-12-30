// hooks/useNotifications.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.topaziocoin.online';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  /**
   * Carregar notificações do banco (HTTP)
   */
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('mozhost_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar notificações');
      }

      const data = await response.json();

      const formattedNotifications = data.notifications.map(n => ({
        id: n.id,
        type: n.type,
        category: n.category,
        title: n.title,
        message: n.message,
        timestamp: new Date(n.created_at),
        read: !!n.read_at
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(data.unreadCount);

    } catch (error) {
      console.error('❌ Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Conectar ao WebSocket
   */
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('mozhost_token');
    if (!token) {
      console.log('⚠️  Token não encontrado, pulando conexão WebSocket');
      return;
    }

    // Evitar múltiplas conexões
    if (socketRef.current?.connected) {
      console.log('✅ WebSocket já conectado');
      return;
    }

    console.log('🔌 Conectando ao WebSocket...');

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
    });

    // Evento: Conectado
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', socket.id);
      setConnected(true);
      reconnectAttempts.current = 0;
    });

    // Evento: Desconectado
    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setConnected(false);

      // Tentar reconectar se não foi desconexão manual
      if (reason === 'io server disconnect') {
        // Servidor desconectou, tentar reconectar
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          console.log(`🔄 Tentando reconectar (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            socket.connect();
          }, 2000);
        }
      }
    });

    // Evento: Erro de conexão
    socket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão WebSocket:', error.message);
      setConnected(false);
    });

    // Evento: Notificação recebida (TEMPO REAL!)
    socket.on('notification', (notification) => {
      console.log('🔔 Nova notificação recebida:', notification);

      const formattedNotification = {
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(notification.timestamp),
        read: notification.read || false
      };

      // Adicionar no início da lista
      setNotifications(prev => [formattedNotification, ...prev]);

      // Incrementar unread count se não está lida
      if (!formattedNotification.read) {
        setUnreadCount(prev => prev + 1);
      }

      // Mostrar notificação nativa do browser (se permitido)
      showBrowserNotification(formattedNotification);

      // Tocar som (opcional)
      playNotificationSound();
    });

    // Evento: Pong (teste de conexão)
    socket.on('pong', (data) => {
      console.log('🏓 Pong recebido:', data);
    });

    // Evento: Conectado ao sistema
    socket.on('connected', (data) => {
      console.log('✅ Confirmação de conexão:', data);
    });

    socketRef.current = socket;

    return socket;
  }, []);

  /**
   * Desconectar WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Desconectando WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Mostrar notificação nativa do browser
   */
  const showBrowserNotification = (notification) => {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/mozhost.png',
          badge: '/mozhost.png',
          tag: `notification-${notification.id}`,
          requireInteraction: false
        });
      } catch (error) {
        console.error('Erro ao mostrar notificação do browser:', error);
      }
    }
  };

  /**
   * Tocar som de notificação
   */
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Silenciar erro se usuário não interagiu com a página ainda
      });
    } catch (error) {
      // Ignorar erro de som
    }
  };

  /**
   * Marcar notificação como lida
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem('mozhost_token');
      await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  /**
   * Marcar todas como lidas
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, []);

  /**
   * Deletar notificação
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem('mozhost_token');
      await fetch(`${API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const wasUnread = notifications.find(n => n.id === notificationId && !n.read);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  }, [notifications]);

  /**
   * Pedir permissão para notificações do browser
   */
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser não suporta notificações');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  /**
   * Enviar ping (teste de conexão)
   */
  const sendPing = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  /**
   * Effect: Conectar WebSocket quando componente monta
   */
  useEffect(() => {
    const token = localStorage.getItem('mozhost_token');
    
    if (token) {
      // Carregar notificações do banco primeiro
      loadNotifications();

      // Depois conectar WebSocket
      connectWebSocket();
    }

    // Cleanup: Desconectar quando componente desmonta
    return () => {
      disconnectWebSocket();
    };
  }, [loadNotifications, connectWebSocket, disconnectWebSocket]);

  return {
    // Estado
    notifications,
    unreadCount,
    connected,
    loading,

    // Ações
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission,
    sendPing,
    
    // WebSocket
    connectWebSocket,
    disconnectWebSocket
  };
};
