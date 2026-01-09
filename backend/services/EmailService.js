// services/EmailService.js
const brevo = require('@sendinblue/client');
const EmailLog = require('../models/EmailLog');
const User = require('../models/User');

class EmailService {
  constructor() {
    this.client = new brevo.TransactionalEmailsApi();
    this.client.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );
  }

  async send({ userId, to, subject, html, text, fromName }) {
    // Busca usuário
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica quota
    const emailsThisMonth = await EmailLog.countThisMonth(userId);
    
    if (emailsThisMonth >= user.email_quota) {
      throw new Error(`Quota de emails excedida. Limite: ${user.email_quota}/mês`);
    }

    try {
      // Prepara email
      const sendSmtpEmail = {
        sender: { 
          email: process.env.SENDER_EMAIL || 'noreply@mozhost.co.mz',
          name: fromName || 'MozHost'
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
        textContent: text,
        tags: [`user_${userId}`]
      };

      // Envia via Brevo
      const result = await this.client.sendTransacEmail(sendSmtpEmail);

      // Salva log de sucesso
      await EmailLog.create({
        userId,
        to,
        subject,
        status: 'sent',
        messageId: result.messageId,
        provider: 'brevo'
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      // Salva log de erro
      await EmailLog.create({
        userId,
        to,
        subject,
        status: 'failed',
        error: error.message,
        provider: 'brevo'
      });

      throw new Error(`Falha ao enviar email: ${error.message}`);
    }
  }

  async getStats(userId) {
    const user = await User.findById(userId);
    const stats = await EmailLog.getMonthlyStats(userId);
    
    const total = stats.total || 0;
    const sent = stats.sent || 0;
    const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(2) : 0;

    return {
      thisMonth: {
        sent: stats.sent,
        failed: stats.failed,
        bounced: stats.bounced,
        total,
        quota: user.email_quota,
        remaining: user.email_quota - total,
        deliveryRate: parseFloat(deliveryRate)
      }
    };
  }

  async getLogs(userId, { page = 1, limit = 20 }) {
    const { logs, total } = await EmailLog.findByUser(userId, { page, limit });

    return {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getQuota(userId) {
    const user = await User.findById(userId);
    const used = await EmailLog.countThisMonth(userId);

    return {
      used,
      limit: user.email_quota,
      remaining: user.email_quota - used,
      percentage: ((used / user.email_quota) * 100).toFixed(2),
      plan: user.email_plan
    };
  }
}

module.exports = EmailService;
