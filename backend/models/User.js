// models/User.js
const db = require('./database');

class User {
  // Buscar usuário por ID (compatível com seu padrão)
  static async findById(userId) {
    const users = await db.query(
      `SELECT 
        id,
        username,
        email,
        plan,
        email_quota,
        email_plan,
        coins,
        is_active,
        created_at
      FROM users
      WHERE id = ? AND is_active = true`,
      [userId]
    );
    
    return users.length > 0 ? users[0] : null;
  }

  // Atualizar quota de email
  static async updateEmailQuota(userId, quota) {
    await db.query(
      'UPDATE users SET email_quota = ? WHERE id = ?',
      [quota, userId]
    );
  }

  // Atualizar plano de email
  static async updateEmailPlan(userId, plan) {
    await db.query(
      'UPDATE users SET email_plan = ? WHERE id = ?',
      [plan, userId]
    );
  }

  // Buscar múltiplos usuários (útil para admin)
  static async findAll(filters = {}) {
    let sql = 'SELECT id, username, email, plan, email_quota, email_plan, coins, created_at FROM users WHERE is_active = true';
    const params = [];

    if (filters.plan) {
      sql += ' AND plan = ?';
      params.push(filters.plan);
    }

    if (filters.email_plan) {
      sql += ' AND email_plan = ?';
      params.push(filters.email_plan);
    }

    sql += ' ORDER BY created_at DESC';

    return await db.query(sql, params);
  }
}

module.exports = User;
