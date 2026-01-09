// middleware/checkEmailQuota.js
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');

module.exports = async (req, res, next) => {
  try {
    // O authMiddleware já validou e preencheu req.user
    const userId = req.user.id;
    
    // Busca usuário
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado' 
      });
    }

    // Conta emails deste mês
    const emailCount = await EmailLog.countThisMonth(userId);

    // Verifica quota
    if (emailCount >= user.email_quota) {
      return res.status(429).json({ 
        success: false,
        error: 'Quota de emails excedida',
        quota: {
          used: emailCount,
          limit: user.email_quota,
          remaining: 0,
          message: 'Faça upgrade do seu plano para enviar mais emails'
        }
      });
    }

    // Adiciona info no request para uso posterior
    req.emailQuota = {
      used: emailCount,
      limit: user.email_quota,
      remaining: user.email_quota - emailCount
    };

    console.log(`[Email Quota] User ${req.user.username}: ${emailCount}/${user.email_quota} emails`);
    next();

  } catch (error) {
    console.error('[Email Quota] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao verificar quota de emails' 
    });
  }
};
