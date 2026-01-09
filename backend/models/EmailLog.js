// models/EmailLog.js
const db = require('./database');

class EmailLog {
  // Criar novo log de email
  static async create({ userId, to, subject, status, messageId, provider = 'brevo', error }) {
    const sql = `
      INSERT INTO email_logs 
      (user_id, recipient_email, subject, status, message_id, provider, error_message, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const result = await db.query(sql, [
      userId,
      to,
      subject,
      status,
      messageId || null,     // ← Converte undefined pra null
      provider,
      error || null          // ← Converte undefined pra null
    ]);
    
    return result.insertId;
  }

  // Contar emails enviados no mês atual
  static async countThisMonth(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE user_id = ?
        AND YEAR(sent_at) = YEAR(CURRENT_DATE)
        AND MONTH(sent_at) = MONTH(CURRENT_DATE)
    `;
    
    const [result] = await db.query(sql, [userId]);
    return result?.count || 0;
  }

  // Contar por status no mês atual
  static async countByStatusThisMonth(userId, status) {
    const sql = `
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE user_id = ?
        AND status = ?
        AND YEAR(sent_at) = YEAR(CURRENT_DATE)
        AND MONTH(sent_at) = MONTH(CURRENT_DATE)
    `;
    
    const [result] = await db.query(sql, [userId, status]);
    return result?.count || 0;
  }

  // Buscar logs com paginação
  static async findByUser(userId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT 
        id,
        recipient_email,
        subject,
        status,
        message_id,
        error_message,
        sent_at
      FROM email_logs
      WHERE user_id = ?
      ORDER BY sent_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const logs = await db.query(sql, [userId, parseInt(limit), offset]);
    
    // Total de registros
    const countSql = 'SELECT COUNT(*) as total FROM email_logs WHERE user_id = ?';
    const [countResult] = await db.query(countSql, [userId]);
    
    return {
      logs,
      total: countResult?.total || 0
    };
  }

  // Estatísticas do mês
  static async getMonthlyStats(userId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
      FROM email_logs
      WHERE user_id = ?
        AND YEAR(sent_at) = YEAR(CURRENT_DATE)
        AND MONTH(sent_at) = MONTH(CURRENT_DATE)
    `;
    
    const [stats] = await db.query(sql, [userId]);
    return stats || { total: 0, sent: 0, failed: 0, bounced: 0 };
  }

  // Últimos emails de um usuário (simples, sem paginação)
  static async getRecentByUser(userId, limit = 5) {
    const sql = `
      SELECT 
        id,
        recipient_email,
        subject,
        status,
        sent_at
      FROM email_logs
      WHERE user_id = ?
      ORDER BY sent_at DESC
      LIMIT ?
    `;
    
    return await db.query(sql, [userId, limit]);
  }
}

module.exports = EmailLog;
