// services/accountService.js
// Ciclo de vida das contas: suspensão automática por expiração (free trial de 7 dias
// ou plano pago sem renovação) e limpeza de containers suspensos há mais de 5 dias.
const database = require('../models/database');
const dockerManager = require('../utils/docker-manager');
const notificationManager = require('../utils/notification-manager');

const FREE_TRIAL_DAYS = Number(process.env.FREE_TRIAL_DAYS) || 7;
const SUSPENDED_CLEANUP_DAYS = Number(process.env.SUSPENDED_CLEANUP_DAYS) || 5;

class AccountService {
  /**
   * Status da conta: suspensa ou não, e por quê.
   * Usado pelo frontend para exibir a página de bloqueio com dados de pagamento.
   */
  async getAccountStatus(userId) {
    const users = await database.query(
      `SELECT id, username, email, phone, plan, coins, free_trial_ends, suspended_at, created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!users.length) return { found: false };

    const user = users[0];

    // Billing ativo (plano pago vigente)
    const activeBilling = await database.query(
      `SELECT plan_id, expires_at FROM billing
       WHERE user_id = ? AND status = 'active' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [userId]
    );

    const billing = activeBilling.length ? activeBilling[0] : null;

    // Conta suspensa manualmente ou pela cron job
    const suspended = !!user.suspended_at;

    return {
      found: true,
      username: user.username,
      email: user.email,
      phone: user.phone,
      plan: user.plan,
      coins: user.coins,
      suspended,
      suspendedAt: user.suspended_at,
      freeTrialEnds: user.free_trial_ends,
      freeTrialExpired: !!user.free_trial_ends && new Date(user.free_trial_ends) <= new Date(),
      activeBilling: billing ? { planId: billing.plan_id, expiresAt: billing.expires_at } : null,
      // Motivo da suspensão (para a página de bloqueio)
      reason: suspended
        ? (billing ? 'billing_expired' : 'trial_expired')
        : null
    };
  }

  /**
   * Avisa (uma vez por dia) usuários cujo trial free ou plano pago vai expirar
   * nos próximos 3 dias, para não pegarem a suspensão de surpresa.
   */
  async warnExpiringAccounts() {
    const expiring = await database.query(
      `SELECT u.id, u.username,
              CASE WHEN b.expires_at IS NOT NULL THEN b.expires_at ELSE u.free_trial_ends END as expires_at,
              CASE WHEN b.expires_at IS NOT NULL THEN 'plano pago' ELSE 'trial grátis' END as tipo
       FROM users u
       LEFT JOIN (
         SELECT user_id, MAX(expires_at) as expires_at FROM billing
         WHERE status = 'active' AND expires_at > NOW()
         GROUP BY user_id
       ) b ON b.user_id = u.id
       WHERE u.suspended_at IS NULL
         AND (
           (b.expires_at IS NOT NULL AND b.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY))
           OR
           (b.expires_at IS NULL AND u.plan = 'free' AND u.free_trial_ends IS NOT NULL
             AND u.free_trial_ends BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY))
         )
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id = u.id AND n.category = 'billing'
             AND n.title LIKE '%expirar%' AND DATE(n.created_at) = CURDATE()
         )`
    );

    for (const user of expiring) {
      const daysLeft = Math.ceil((new Date(user.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
      await notificationManager.notify(user.id, {
        type: 'warning',
        category: 'billing',
        title: `⚠️ Seu ${user.tipo} vai expirar!`,
        message: `Faltam ${daysLeft} dia(s) para expirar. Renove para não perder seus containers.`
      });
    }

    return expiring.length;
  }

  /**
   * Suspende contas expiradas:
   *  - Free: free_trial_ends passou e não há billing ativo → suspende.
   *  - Pagos: billing ativo com expires_at passado → suspende e rebaixa para free.
   * Suspensão = docker stop em todos os containers + suspended_at = NOW().
   */
  async suspendExpiredAccounts() {
    const now = new Date();

    // 1) Contas free com trial expirado e sem billing ativo
    const expiredFree = await database.query(
      `SELECT u.id, u.username, u.plan
       FROM users u
       WHERE u.plan = 'free'
         AND u.suspended_at IS NULL
         AND u.free_trial_ends IS NOT NULL
         AND u.free_trial_ends < NOW()
         AND NOT EXISTS (
           SELECT 1 FROM billing b
           WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
         )`
    );

    // 2) Contas pagas cujo billing expirou (30 dias sem renovação)
    const expiredBilling = await database.query(
      `SELECT u.id, u.username, u.plan
       FROM users u
       WHERE u.suspended_at IS NULL
         AND u.plan != 'free'
         AND NOT EXISTS (
           SELECT 1 FROM billing b
           WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
         )`
    );

    const toSuspend = [...expiredFree, ...expiredBilling];
    let suspendedCount = 0;

    for (const user of toSuspend) {
      try {
        await this.suspendUser(user.id, user.username, user.plan);
        suspendedCount++;
      } catch (error) {
        console.error(`❌ Erro ao suspender usuário ${user.id} (${user.username}):`, error.message);
      }
    }

    return { suspendedCount, totalChecked: toSuspend.length };
  }

  /**
   * Aplica a suspensão em um usuário: para todos os containers (docker stop)
   * e marca suspended_at.
   */
  async suspendUser(userId, username, currentPlan) {
    // Parar todos os containers em execução
    const containers = await database.query(
      `SELECT id, name FROM containers WHERE user_id = ? AND status = 'running'`,
      [userId]
    );

    for (const container of containers) {
      try {
        await dockerManager.stopContainer(container.id);
      } catch (e) {
        console.warn(`⚠️  Não consegui parar container ${container.id}:`, e.message);
      }
    }

    // Se era um plano pago, rebaixa para free (limites do plano grátis)
    if (currentPlan && currentPlan !== 'free') {
      await database.query(
        `UPDATE users SET plan = 'free', max_containers = 1, max_ram_mb = 512, max_storage_mb = 1024 WHERE id = ?`,
        [userId]
      );
    }

    await database.query('UPDATE users SET suspended_at = NOW() WHERE id = ?', [userId]);

    await notificationManager.notify(userId, {
      type: 'error',
      category: 'billing',
      title: '⛔ Conta suspensa',
      message: `Sua conta foi suspensa. Renove seu plano para reativar seus containers.`
    });

    console.log(`⛔ Conta suspensa: ${username} (${userId})${currentPlan !== 'free' ? ` — rebaixado de ${currentPlan} para free` : ''}`);
  }

  /**
   * Limpeza: contas suspensas há mais de 5 dias → deleta containers (docker + arquivos)
   * para liberar espaço no disco. A conta do usuário é mantida (ele pode reativar depois).
   */
  async cleanupSuspendedAccounts() {
    const users = await database.query(
      `SELECT u.id, u.username
       FROM users u
       WHERE u.suspended_at IS NOT NULL
         AND u.suspended_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [SUSPENDED_CLEANUP_DAYS]
    );

    let cleanedCount = 0;

    for (const user of users) {
      const containers = await database.query(
        'SELECT id, name FROM containers WHERE user_id = ?',
        [user.id]
      );

      for (const container of containers) {
        try {
          await dockerManager.deleteContainer(container.id);
        } catch (error) {
          console.error(`❌ Erro ao deletar container ${container.id} de ${user.username}:`, error.message);
        }
      }

      if (containers.length > 0) {
        cleanedCount++;
        console.log(`🧹 Cleanup: ${containers.length} container(s) de ${user.username} deletados (suspenso há +${SUSPENDED_CLEANUP_DAYS} dias)`);
      }
    }

    return { cleanedCount };
  }
}

module.exports = new AccountService();
