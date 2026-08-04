// utils/notification-manager.js
const database = require('../models/database');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

class NotificationManager {
  constructor() {
    this.io = null;
    this.userSockets = new Map();
  }

  setSocketIO(io) {
    this.io = io;
    console.log('✅ NotificationManager: Socket.IO configurado');
  }

  registerUserSocket(userId, socketId) {
    this.userSockets.set(userId, socketId);
    console.log(`[NotificationManager] Usuário ${userId} conectado (socket: ${socketId})`);
  }

  unregisterUserSocket(userId) {
    this.userSockets.delete(userId);
    console.log(`[NotificationManager] Usuário ${userId} desconectado`);
  }

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

      // 4. Enviar via Expo Push Notification (app mobile) — 🔥 fire-and-forget, NÃO bloqueia a API
      try {
        const tokens = await database.query(
          'SELECT token FROM expo_push_tokens WHERE user_id = ?',
          [userId]
        );

        if (tokens.length > 0) {
          const messages = tokens
            .filter(t => Expo.isExpoPushToken(t.token))
            .map(t => ({
              to: t.token,
              sound: 'default',
              title: title,
              body: message,
              data: { type, category, notificationId }
            }));

          if (messages.length > 0) {
            const chunks = expo.chunkPushNotifications(messages);
            (async () => {
              for (const chunk of chunks) {
                try {
                  const receipts = await expo.sendPushNotificationsAsync(chunk);
                  console.log(`📱 Push enviado para ${messages.length} dispositivo(s) do user ${userId}`);

                  // Remover tokens inválidos
                  for (let i = 0; i < receipts.length; i++) {
                    if (receipts[i].status === 'error') {
                      console.error(`❌ Erro no push: ${receipts[i].message}`);
                      if (receipts[i].details?.error === 'DeviceNotRegistered') {
                        await database.query(
                          'DELETE FROM expo_push_tokens WHERE token = ?',
                          [chunk[i].to]
                        );
                        console.log(`🗑️ Token inválido removido: ${chunk[i].to}`);
                      }
                    }
                  }
                } catch (pushError) {
                  console.error('❌ Erro ao enviar push chunk:', pushError);
                }
              }
            })().catch(err => console.error('❌ Erro no push (fire-and-forget):', err));
          }
        }
      } catch (pushError) {
        console.error('❌ Erro ao buscar tokens expo:', pushError);
      }

      // 5. Enviar via Web Push (browser) — 🔥 fire-and-forget, NÃO bloqueia a API
      try {
        const { sendPushToUser } = require('../routes/push');
        sendPushToUser(userId, {
          title: title,
          message: message,
          icon: '/mozhost.png',
          url: '/',
          tag: `mozhost-${notificationId}`
        }).catch(pushError => console.error('❌ Erro ao enviar Web Push:', pushError.message));
      } catch (pushError) {
        console.error('❌ Erro ao enviar Web Push:', pushError.message);
      }

      // 6. Enviar via WhatsApp (se vinculado) — 🔥 fire-and-forget, NÃO bloqueia a API
      try {
        const waAccounts = await database.query(
          'SELECT whatsapp_number FROM whatsapp_accounts WHERE user_id = ? AND verified = TRUE',
          [userId]
        );

        if (waAccounts.length > 0) {
          const { sendWhatsAppMessage } = require('./whatsapp');
          sendWhatsAppMessage({
            phone: waAccounts[0].whatsapp_number,
            message: `*${title}*\n\n${message}`
          }).catch(waError => console.error('❌ Erro ao enviar WhatsApp:', waError.message));
        }
      } catch (waError) {
        console.error('❌ Erro ao enviar WhatsApp:', waError.message);
      }

      return fullNotification;

    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      return null;
    }
  }

  async notifyContainerStopped(userId, containerName, containerId) {
    return await this.notify(userId, {
      type: 'warning',
      category: 'container',
      title: '🔴 Container Parou',
      message: `O container "${containerName}" parou de funcionar.`
    });
  }

  async notifyContainerStarted(userId, containerName, containerId) {
    return await this.notify(userId, {
      type: 'success',
      category: 'container',
      title: '🟢 Container Iniciado',
      message: `O container "${containerName}" está rodando.`
    });
  }

  async notifyContainerError(userId, containerName, errorMessage) {
    return await this.notify(userId, {
      type: 'error',
      category: 'container',
      title: '❌ Erro no Container',
      message: `Container "${containerName}" teve um erro: ${errorMessage}`
    });
  }

  async notifyDeploySuccess(userId, containerName) {
    return await this.notify(userId, {
      type: 'success',
      category: 'container',
      title: '✅ Deploy Concluído',
      message: `Deploy do container "${containerName}" foi concluído com sucesso!`
    });
  }

  async notifySubscriptionExpiring(userId, containerName, daysLeft) {
    return await this.notify(userId, {
      type: 'warning',
      category: 'subscription',
      title: '⚠️ Assinatura Expirando',
      message: `O container "${containerName}" expira em ${daysLeft} dias. Renove para continuar usando.`
    });
  }

  async notifySubscriptionExpired(userId, containerName) {
    return await this.notify(userId, {
      type: 'error',
      category: 'subscription',
      title: '❌ Assinatura Expirada',
      message: `O container "${containerName}" expirou. Recarregue 500 coins para reativar.`
    });
  }

  async notifyHighResourceUsage(userId, containerName, resource, percentage) {
    return await this.notify(userId, {
      type: 'warning',
      category: 'container',
      title: '⚠️ Uso Alto de Recursos',
      message: `Container "${containerName}" está usando ${percentage}% de ${resource}.`
    });
  }

  async notifyPaymentSuccess(userId, amount, coins) {
    return await this.notify(userId, {
      type: 'success',
      category: 'billing',
      title: '💰 Pagamento Aprovado',
      message: `Pagamento de R$ ${amount} aprovado! ${coins} coins adicionados à sua conta.`
    });
  }

  async notifyPaymentFailed(userId, amount) {
    return await this.notify(userId, {
      type: 'error',
      category: 'billing',
      title: '❌ Pagamento Falhou',
      message: `Pagamento de R$ ${amount} não foi aprovado. Tente novamente.`
    });
  }

  async notifyWelcome(userId, username) {
    return await this.notify(userId, {
      type: 'success',
      category: 'welcome',
      title: '🎉 Bem-vindo à MozHost!',
      message: `Olá ${username}! Sua conta foi criada com sucesso. Você ganhou 250 coins de bônus!`
    });
  }

  async notifyContainerCreated(userId, containerName, domain) {
    return await this.notify(userId, {
      type: 'success',
      category: 'container',
      title: '✅ Container Criado',
      message: `Container "${containerName}" criado! Acesse em: ${domain}`
    });
  }

  async notifyContainerDeleted(userId, containerName) {
    return await this.notify(userId, {
      type: 'info',
      category: 'container',
      title: '🗑️ Container Deletado',
      message: `Container "${containerName}" foi removido com sucesso.`
    });
  }

  async notifyAll(notification) {
    if (!this.io) {
      console.error('❌ Socket.IO não configurado');
      return;
    }
    this.io.emit('notification', notification);
    console.log('📢 Notificação broadcast enviada para todos os usuários');
  }

  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  isUserConnected(userId) {
    return this.userSockets.has(userId);
  }
}

module.exports = new NotificationManager();

