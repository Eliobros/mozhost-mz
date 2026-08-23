// services/accountService.js
// A assinatura pertence à conta. Os containers apenas acompanham o ciclo do plano.
const database = require('../models/database');
const dockerManager = require('../utils/docker-manager');
const notificationManager = require('../utils/notification-manager');

const FREE_TRIAL_DAYS = Number(process.env.FREE_TRIAL_DAYS) || 7;
const SUSPENDED_CLEANUP_DAYS = Math.max(7, Number(process.env.SUSPENDED_CLEANUP_DAYS) || 7);
const DAY_MS = 1000 * 60 * 60 * 24;
const PLAN_LIMITS = {
  starter: { max_containers: 3, max_ram_mb: 512, max_storage_mb: 2048 },
  basic: { max_containers: 5, max_ram_mb: 1024, max_storage_mb: 5120 },
  pro: { max_containers: 10, max_ram_mb: 2048, max_storage_mb: 10240 },
  business: { max_containers: 25, max_ram_mb: 4096, max_storage_mb: 25600 }
};

function daysUntil(date) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS);
}

class AccountService {
  /** Retorna o acesso atual da conta e a data única que governa os containers. */
  async getAccountStatus(userId) {
    const users = await database.query(
      `SELECT id, username, email, phone, plan, coins, free_trial_ends, suspended_at, created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!users.length) return { found: false };

    const user = users[0];
    const activeBilling = await database.query(
      `SELECT plan_id, expires_at FROM billing
       WHERE user_id = ? AND status = 'active' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [userId]
    );

    const billing = activeBilling[0] || null;
    const trialActive = user.plan === 'free' && user.free_trial_ends &&
      new Date(user.free_trial_ends) > new Date();
    const expiresAt = billing?.expires_at || (trialActive ? user.free_trial_ends : null);
    const suspended = !!user.suspended_at;
    const hasAccess = !suspended && !!expiresAt;

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
      expiresAt,
      hasAccess,
      reason: suspended
        ? (user.plan === 'free' ? 'trial_expired' : 'billing_expired')
        : (!hasAccess ? (user.plan === 'free' ? 'trial_expired' : 'billing_expired') : null)
    };
  }

  /**
   * Envia somente os marcos definidos na política: 5, 3 e 1 dia antes
   * da expiração, além de 2 dias antes da exclusão definitiva.
   */
  async warnExpiringAccounts() {
    const expiring = await database.query(
      `SELECT u.id, u.username, u.email,
              CASE WHEN b.expires_at IS NOT NULL THEN b.expires_at ELSE u.free_trial_ends END AS expires_at,
              CASE WHEN b.expires_at IS NOT NULL THEN 'plano' ELSE 'período gratuito' END AS tipo
       FROM users u
       LEFT JOIN (
         SELECT user_id, MAX(expires_at) AS expires_at FROM billing
         WHERE status = 'active' AND expires_at > NOW()
         GROUP BY user_id
       ) b ON b.user_id = u.id
       WHERE u.suspended_at IS NULL
         AND (
           (b.expires_at IS NOT NULL AND b.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 5 DAY))
           OR
           (b.expires_at IS NULL AND u.plan = 'free' AND u.free_trial_ends IS NOT NULL
             AND u.free_trial_ends BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 5 DAY))
         )`
    );

    let sent = 0;
    for (const user of expiring) {
      const daysLeft = daysUntil(user.expires_at);
      if (![5, 3, 1].includes(daysLeft)) continue;

      const title = `⚠️ Seu ${user.tipo} expira em ${daysLeft} dia(s)`;
      const alreadySent = await database.query(
        `SELECT id FROM notifications
         WHERE user_id = ? AND category = 'billing' AND title = ?
           AND created_at >= DATE_SUB(?, INTERVAL 8 DAY)
         LIMIT 1`,
        [user.id, title, user.expires_at]
      );
      if (alreadySent.length) continue;

      await notificationManager.notify(user.id, {
        type: 'warning',
        category: 'billing',
        title,
        message: `Faltam ${daysLeft} dia(s) para o seu ${user.tipo} expirar. Renove o plano da conta para manter todos os containers ativos.`
      });
      sent++;
    }

    const retentionUsers = await database.query(
      `SELECT id, username, suspended_at FROM users
       WHERE suspended_at IS NOT NULL
         AND suspended_at > DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [SUSPENDED_CLEANUP_DAYS]
    );

    for (const user of retentionUsers) {
      const deletionAt = new Date(user.suspended_at);
      deletionAt.setDate(deletionAt.getDate() + SUSPENDED_CLEANUP_DAYS);
      const daysLeft = daysUntil(deletionAt);
      if (daysLeft !== 2) continue;

      const title = '⚠️ Exclusão dos containers em 2 dias';
      const alreadySent = await database.query(
        `SELECT id FROM notifications
         WHERE user_id = ? AND category = 'billing' AND title = ?
           AND created_at >= ?
         LIMIT 1`,
        [user.id, title, user.suspended_at]
      );
      if (alreadySent.length) continue;

      await notificationManager.notify(user.id, {
        type: 'error',
        category: 'billing',
        title,
        message: 'Sua conta está suspensa. Faltam 2 dias para a exclusão permanente dos containers e arquivos. Renove o plano imediatamente para preservar seus dados.'
      });
      sent++;
    }

    return sent;
  }

  /** Inicia containers preservados quando a conta volta a ter um plano válido. */
  async reactivateUserContainers(userId) {
    const containers = await database.query(
      `SELECT id FROM containers
       WHERE user_id = ? AND status = 'stopped'
         AND plan_blocked = false AND suspended_by_billing = true`,
      [userId]
    );

    let started = 0;
    for (const container of containers) {
      try {
        await dockerManager.startContainer(container.id);
        await database.query('UPDATE containers SET suspended_by_billing = false WHERE id = ?', [container.id]);
        started++;
      } catch (error) {
        console.warn(`⚠️ Não consegui reativar container ${container.id}:`, error.message);
      }
    }
    return started;
  }

  /** Aplica upgrades pagos que foram agendados para a renovação do ciclo. */
  async processScheduledPlanChanges() {
    const scheduled = await database.query(
      `SELECT id, user_id, plan_id FROM billing
       WHERE status = 'scheduled' AND expires_at <= NOW()
       ORDER BY expires_at ASC`
    );

    let processed = 0;
    for (const billing of scheduled) {
      const limits = PLAN_LIMITS[billing.plan_id];
      if (!limits) continue;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await database.query(
        `UPDATE billing SET status = 'expired' WHERE user_id = ? AND status = 'active'`,
        [billing.user_id]
      );
      await database.query(
        `UPDATE billing SET status = 'active', activated_at = NOW(), expires_at = ? WHERE id = ?`,
        [expiresAt, billing.id]
      );
      await database.query(
        `UPDATE users SET plan = ?, max_containers = ?, max_ram_mb = ?, max_storage_mb = ?,
         pending_plan = NULL, suspended_at = NULL, free_trial_ends = ? WHERE id = ?`,
        [billing.plan_id, limits.max_containers, limits.max_ram_mb, limits.max_storage_mb, expiresAt, billing.user_id]
      );
      await database.query('UPDATE containers SET plan_blocked = false WHERE user_id = ?', [billing.user_id]);
      await this.reactivateUserContainers(billing.user_id);

      await notificationManager.notify(billing.user_id, {
        type: 'success',
        category: 'billing',
        title: `Plano ${billing.plan_id} ativado`,
        message: `Seu upgrade agendado entrou em vigor. O novo ciclo expira em ${expiresAt.toLocaleDateString('pt-BR')}.`
      });
      processed++;
    }

    return processed;
  }

  /** Suspende todos os containers quando o ciclo único da conta expira. */
  async suspendExpiredAccounts() {
    const expiredUsers = await database.query(
      `SELECT u.id, u.username, u.plan
       FROM users u
       WHERE u.suspended_at IS NULL
         AND (
           (u.plan = 'free' AND u.free_trial_ends IS NOT NULL AND u.free_trial_ends <= NOW())
           OR
           (u.plan != 'free' AND NOT EXISTS (
             SELECT 1 FROM billing b
             WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
           ))
         )`
    );

    let suspendedCount = 0;
    for (const user of expiredUsers) {
      try {
        await this.suspendUser(user.id, user.username, user.plan);
        suspendedCount++;
      } catch (error) {
        console.error(`❌ Erro ao suspender usuário ${user.id} (${user.username}):`, error.message);
      }
    }

    return { suspendedCount, totalChecked: expiredUsers.length };
  }

  async suspendUser(userId, username, currentPlan) {
    const containers = await database.query(
      `SELECT id FROM containers WHERE user_id = ? AND status = 'running'`,
      [userId]
    );

    for (const container of containers) {
      try {
        await database.query('UPDATE containers SET suspended_by_billing = true WHERE id = ?', [container.id]);
        await dockerManager.stopContainer(container.id);
      } catch (error) {
        console.warn(`⚠️ Não consegui parar container ${container.id}:`, error.message);
      }
    }

    // A assinatura expirada deixa de ser billing ativo, mas o plano histórico
    // e os limites ficam preservados durante a retenção de 7 dias.
    await database.query(
      `UPDATE billing SET status = 'expired'
       WHERE user_id = ? AND status = 'active' AND expires_at <= NOW()`,
      [userId]
    );
    await database.query('UPDATE users SET suspended_at = NOW() WHERE id = ?', [userId]);

    await notificationManager.notify(userId, {
      type: 'error',
      category: 'billing',
      title: '⛔ Conta suspensa por expiração do plano',
      message: `Todos os containers foram suspensos. Seus dados serão preservados por ${SUSPENDED_CLEANUP_DAYS} dias; renove o plano nesse período para reativar a conta.`
    });

    console.log(`⛔ Conta suspensa: ${username} (${userId}) — plano ${currentPlan || 'free'}`);
  }

  /** Remove recursos suspensos após o prazo de retenção. */
  async cleanupSuspendedAccounts() {
    const users = await database.query(
      `SELECT id, username FROM users
       WHERE suspended_at IS NOT NULL
         AND suspended_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
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
          // Domínios não têm garantia de FK para containers em instalações antigas.
          try {
            await database.query('DELETE FROM custom_domains WHERE container_id = ?', [container.id]);
          } catch (domainError) {
            console.warn(`⚠️ Domínios do container ${container.id} não foram removidos:`, domainError.message);
          }
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
