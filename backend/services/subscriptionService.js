// services/subscriptionService.js
// Compatibilidade para consumidores antigos: a validade real é a do plano da conta.
const db = require('../models/database');

class SubscriptionService {
  async getSubscriptionStatus(containerId) {
    const users = await db.query(
      `SELECT u.plan, u.free_trial_ends, u.suspended_at,
              (SELECT b.expires_at FROM billing b
               WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
               ORDER BY b.expires_at DESC LIMIT 1) AS billing_expires
       FROM containers c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?
       LIMIT 1`,
      [containerId]
    );

    if (!users.length) {
      return {
        hasSubscription: false,
        scope: 'account',
        expired: true,
        suspended: true,
        daysLeft: 0
      };
    }

    const user = users[0];
    const expiresAt = user.billing_expires ||
      (user.plan === 'free' && user.free_trial_ends ? user.free_trial_ends : null);
    const expired = !!user.suspended_at || !expiresAt || new Date(expiresAt) <= new Date();
    const daysLeft = expiresAt && !expired
      ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      hasSubscription: !!expiresAt,
      scope: 'account',
      plan: user.plan,
      expiresAt,
      daysLeft,
      expired,
      suspended: !!user.suspended_at,
      expiringSoon: !expired && daysLeft <= 5
    };
  }
}

module.exports = new SubscriptionService();
