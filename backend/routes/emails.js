const express = require('express');
const router = express.Router();
const EmailService = require('../services/EmailService');
const checkEmailQuota = require('../middleware/checkEmailQuota');
const alaudaAuthMiddleware = require('../middleware/alaudaAuth');

// Enviar email
router.post('/send', alaudaAuthMiddleware, checkEmailQuota, async (req, res) => {
  try {
    const { to, subject, html, text, fromName } = req.body;
    
    // Validações
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        success: false,
        error: 'Campos obrigatórios: to, subject, e (html ou text)' 
      });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        success: false,
        error: 'Email inválido' 
      });
    }

    const emailService = new EmailService();
    const result = await emailService.send({
      userId: req.user.id, // ← Vem do seu authMiddleware
      to,
      subject,
      html,
      text,
      fromName
    });

    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Email enviado com sucesso',
      quota: req.emailQuota
    });

  } catch (error) {
    console.error('[Email] Erro ao enviar:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Erro ao enviar email' 
    });
  }
});

// Ver estatísticas de emails
router.get('/stats', alaudaAuthMiddleware, async (req, res) => {
  try {
    const emailService = new EmailService();
    const stats = await emailService.getStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Email] Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Listar emails enviados (histórico)
router.get('/logs', alaudaAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const emailService = new EmailService();
    const logs = await emailService.getLogs(req.user.id, { 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('[Email] Erro ao buscar logs:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Ver quota atual
router.get('/quota', alaudaAuthMiddleware, async (req, res) => {
  try {
    const emailService = new EmailService();
    const quota = await emailService.getQuota(req.user.id);
    
    res.json({
      success: true,
      data: quota
    });
  } catch (error) {
    console.error('[Email] Erro ao buscar quota:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
