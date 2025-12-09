const db = require('../models/database');

class SubscriptionService {
  // Criar subscription quando container é criado (30 dias)
  async createSubscription(userId, containerId, coinsPaid = 500) {
    const ramMb = 1024; // 1GB RAM
    const storageMb = 1024; // 1GB Storage
    
    // Expiração: 30 dias a partir de agora
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    await db.query(
      `INSERT INTO subscriptions (user_id, container_id, coins_paid, ram_mb, storage_mb, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, containerId, coinsPaid, ramMb, storageMb, expiresAt]
    );
    
    // Criar notificação de compra
    await db.query(
      `INSERT INTO notifications (user_id, type, category, title, message)
       VALUES (?, 'success', 'subscription', 'Assinatura ativada!', ?)`,
      [userId, `Seu container foi ativado por 30 dias. Expira em ${expiresAt.toLocaleDateString('pt-MZ')}.`]
    );
    
    return { expiresAt, ramMb, storageMb };
  }
  
  // Renovar subscription
  async renewSubscription(userId, containerId, coinsPaid = 500) {
    // Buscar subscription atual
    const subs = await db.query(
      'SELECT * FROM subscriptions WHERE container_id = ? AND user_id = ? ORDER BY expires_at DESC LIMIT 1',
      [containerId, userId]
    );
    
    if (subs.length === 0) {
      // Criar nova se não existir
      return this.createSubscription(userId, containerId, coinsPaid);
    }
    
    const sub = subs[0];
    const now = new Date();
    
    // Se expirada, começa de agora. Se não, adiciona 30 dias a partir da expiração atual
    const baseDate = new Date(sub.expires_at) > now ? new Date(sub.expires_at) : now;
    const newExpires = new Date(baseDate);
    newExpires.setDate(newExpires.getDate() + 30);
    
    await db.query(
      `UPDATE subscriptions SET expires_at = ?, status = 'active', renewed_at = NOW() WHERE id = ?`,
      [newExpires, sub.id]
    );
    
    // Atualizar status do container para stopped (pode iniciar)
    await db.query(
      "UPDATE containers SET status = 'stopped' WHERE id = ? AND status = 'error'",
      [containerId]
    );
    
    // Notificar
    await db.query(
      `INSERT INTO notifications (user_id, type, category, title, message)
       VALUES (?, 'success', 'subscription', 'Assinatura renovada!', ?)`,
      [userId, `Seu container foi renovado por mais 30 dias. Nova expiração: ${newExpires.toLocaleDateString('pt-MZ')}.`]
    );
    
    return { expiresAt: newExpires };
  }
  
  // Verificar subscriptions expirando (rodar via cron ou no startup)
  async checkExpiringSubscriptions() {
    const now = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    
    // Buscar que vão expirar nos próximos 5 dias
    const expiring = await db.query(
      `SELECT s.*, c.name as container_name, u.username 
       FROM subscriptions s 
       JOIN containers c ON s.container_id = c.id
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'active' 
       AND s.expires_at <= ? 
       AND s.expires_at > NOW()`,
      [fiveDaysFromNow]
    );
    
    for (const sub of expiring) {
      // Atualizar status
      await db.query("UPDATE subscriptions SET status = 'expiring_soon' WHERE id = ?", [sub.id]);
      
      // Calcular dias restantes
      const daysLeft = Math.ceil((new Date(sub.expires_at) - now) / (1000 * 60 * 60 * 24));
      
      // Verificar se já notificou hoje
      const existingNotif = await db.query(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND category = 'subscription' 
         AND title LIKE '%expirando%' 
         AND DATE(created_at) = CURDATE()`,
        [sub.user_id]
      );
      
      if (existingNotif.length === 0) {
        await db.query(
          `INSERT INTO notifications (user_id, type, category, title, message)
           VALUES (?, 'warning', 'subscription', ?, ?)`,
          [
            sub.user_id, 
            `Container "${sub.container_name}" expirando!`,
            `Faltam ${daysLeft} dias para expirar. Recarregue 500 coins para renovar.`
          ]
        );
      }
    }
    
    return expiring.length;
  }
  
  // Expirar subscriptions vencidas
  async expireSubscriptions() {
    // Buscar expiradas
    const expired = await db.query(
      `SELECT s.*, c.name as container_name 
       FROM subscriptions s 
       JOIN containers c ON s.container_id = c.id
       WHERE s.expires_at <= NOW() 
       AND s.status != 'expired'`
    );
    
    for (const sub of expired) {
      // Marcar como expirada
      await db.query("UPDATE subscriptions SET status = 'expired' WHERE id = ?", [sub.id]);
      
      // Parar container e marcar como erro (impedindo start)
      await db.query("UPDATE containers SET status = 'error' WHERE id = ?", [sub.container_id]);
      
      // Notificar
      await db.query(
        `INSERT INTO notifications (user_id, type, category, title, message)
         VALUES (?, 'error', 'subscription', ?, ?)`,
        [
          sub.user_id,
          `Container "${sub.container_name}" expirou!`,
          'Sua assinatura expirou. Recarregue 500 coins para reativar o container.'
        ]
      );
    }
    
    return expired.length;
  }
  
  // Obter status da subscription de um container
  async getSubscriptionStatus(containerId) {
    const subs = await db.query(
      `SELECT * FROM subscriptions WHERE container_id = ? ORDER BY expires_at DESC LIMIT 1`,
      [containerId]
    );
    
    if (subs.length === 0) {
      return { hasSubscription: false, expired: true };
    }
    
    const sub = subs[0];
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    return {
      hasSubscription: true,
      subscriptionId: sub.id,
      expiresAt: sub.expires_at,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      expired: expiresAt <= now,
      expiringSoon: daysLeft <= 5 && daysLeft > 0,
      status: sub.status
    };
  }
}

module.exports = new SubscriptionService();
