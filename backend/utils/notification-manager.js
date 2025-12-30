// utils/notification-manager.js
const database = require('../models/database');

class NotificationManager {
  constructor() {
    this.io = null; // Socket.IO instance (será configurado no server.js)
    this.userSockets = new Map(); // Map de userId -> socket.id
  }

  /**
   * Configurar Socket.IO instance
   */
  setSocketIO(io) {
    this.io = io;
    console.log('✅ NotificationManager: Socket.IO configurado');
  }

  /**
   * Registrar conexão de usuário
   */
  registerUserSocket(userId, socketId) {
    this.userSockets.set(userId, socketId);
    console.log(`[NotificationManager] Usuário ${userId} conectado (socket: ${socketId})`);
  }

  /**
   * Remover conexão de usuário
   */
  unregisterUserSocket(userId) {
    this.userSockets.delete(userId);
    console.log(`[NotificationManager] Usuário ${userId} desconectado`);
  }

  /**
   * Criar notificação no banco E enviar via WebSocket
   */
  async notify(userId, notification) {
    try {
      const { type = 'info', category = 'system', title, message } = notification;

      // 1. Salvar no banco
      const result = await database.query(`
        INSERT INTO notifications (user_id, type, category, title, message)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, type, category, title, message]);

      const notificationId = result.insertId;

      // 2. Buscar notificação completa
      const saved = await database.query(`
        SELECT id, type, category, title, message, created_at, read_at
        FROM notifications
        WHERE id = ?
      `, [notificationId]);

      if (saved.length === 0) {
        console.error('❌ Notificação salva mas não encontrada:', notificationId);
        return null;
      }

      const fullNotification = {
        id: saved[0].id,
        type: saved[0].type,
        category: saved[0].category,
        title: saved[0].title,
        message: saved[0].message,
        read: !!saved[0].read_at,
        timestamp: saved[0].created_at
      };

      // 3. Enviar via WebSocket se usuário estiver conectado
      if (this.io && this.userSockets.has(userId)) {
        const socketId = this.userSockets.get(userId);
        this.io.to(socketId).emit('notification', fullNotification);
        console.log(`📤 Notificação enviada via WebSocket para usuário ${userId}`);
      }

      return fullNotification;

    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      return null;
    }
  }

  /**
   * Notificações específicas por tipo de evento
   */

  // Container parou
  async notifyContainerStopped(userId, containerName, containerId) {
    return await this.notify(userId, {
      type: 'warning',
      category: 'container',
      title: '🔴 Container Parou',
      message: `O container "${containerName}" parou de funcionar.`
    });
  }

  // Container iniciado
  async notifyContainerStarted(userId, containerName, containerId) {
    return await this.notify(userId, {
      type: 'success',
      category: 'container',
      title: '🟢 Container Iniciado',
      message: `O container "${containerName}" está rodando.`
    });
  }

  // Container com erro
  async notifyContainerError(userId, containerName, errorMessage) {
    return await this.notify(userId, {
      type: 'error',
      category: 'container',
      title: '❌ Erro no Container',
      message: `Container "${containerName}" teve um erro: ${errorMessage}`
    });
  }

  // Deploy completado
  async notifyDeploySuccess(userId, containerName) {
    return await this.notify(userId, {
      type: 'success',
      category: 'container',
      title: '✅ Deploy Concluído',
      message: `Deploy do container "${containerName}" foi concluído com sucesso!`
    });
  }

  // Subscription expirando
  async notifySubscriptionExpiring(userId, containerName, daysLeft) {
    return await this.notify(userId, {
      type: 'warning',
      category: 'subscription',
      title: '⚠️ Assinatura Expirando',
      message: `O container "${containerName}" expira em ${daysLeft} dias. Renove para continuar usando.`
    });
  }

  // Subscription expirada
  async notifySubscriptionExpired(userId, containerName) {
    return await this.notify(userId, {
      type: 'error',
      category: 'subscription',
      title: '❌ Assinatura Expirada',
      message: `O container "${containerName}" expirou. Recarregue 500 coins para reativar.`
    });
  }

  // RAM/CPU alta
  async notifyHighResourceUsage(userId, containerName, resource, percentage) {
    return await this.notify(userId, {
      type: 'warning',
      category: 'container',
      title: '⚠️ Uso Alto de Recursos',
      message: `Container "${containerName}" está usando ${percentage}% de ${resource}.`
    });
  }

  // Pagamento aprovado
  async notifyPaymentSuccess(userId, amount, coins) {
    return await this.notify(userId, {
      type: 'success',
      category: 'billing',
      title: '💰 Pagamento Aprovado',
      message: `Pagamento de R$ ${amount} aprovado! ${coins} coins adicionados à sua conta.`
    });
  }

  // Pagamento falhou
  async notifyPaymentFailed(userId, amount) {
    return await this.notify(userId, {
      type: 'error',
      category: 'billing',
      title: '❌ Pagamento Falhou',
      message: `Pagamento de R$ ${amount} não foi aprovado. Tente novamente.`
    });
  }

  // Boas-vindas
  async notifyWelcome(userId, username) {
    return await this.notify(userId, {
      type: 'success',
      category: 'welcome',
      title: '🎉 Bem-vindo à MozHost!',
      message: `Olá ${username}! Sua conta foi criada com sucesso. Você ganhou 250 coins de bônus!`
    });
  }

  // Container criado
  async notifyContainerCreated(userId, containerName, domain) {
    return await this.notify(userId, {
      type: 'success',
      category: 'container',
      title: '✅ Container Criado',
      message: `Container "${containerName}" criado! Acesse em: ${domain}`
    });
  }

  // Container deletado
  async notifyContainerDeleted(userId, containerName) {
    return await this.notify(userId, {
      type: 'info',
      category: 'container',
      title: '🗑️ Container Deletado',
      message: `Container "${containerName}" foi removido com sucesso.`
    });
  }

  /**
   * Enviar notificação para todos os usuários conectados (broadcast)
   */
  async notifyAll(notification) {
    if (!this.io) {
      console.error('❌ Socket.IO não configurado');
      return;
    }

    this.io.emit('notification', notification);
    console.log('📢 Notificação broadcast enviada para todos os usuários');
  }

  /**
   * Obter número de usuários conectados
   */
  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  /**
   * Verificar se usuário está conectado
   */
  isUserConnected(userId) {
    return this.userSockets.has(userId);
  }
}

// Exportar instância única (singleton)
module.exports = new NotificationManager();
