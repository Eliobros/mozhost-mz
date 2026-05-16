const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { authenticateAdmin } = require('../middleware/auth');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Função que substitui os {{prefixos}}
function aplicarTemplate(template, usuario) {
  return template
    .replace(/{{username}}/g, usuario.username)
    .replace(/{{email}}/g, usuario.email)
    .replace(/{{coins}}/g, usuario.coins)
    .replace(/{{plan}}/g, usuario.plan)
    .replace(/{{link}}/g, 'https://mozhost.com/dashboard')
}

// ============================================
// SALVAR TEMPLATE
// ============================================
router.post('/admin/campaigns/template', authenticateAdmin, async (req, res) => {
  try {
    const { assunto, corpo } = req.body;

    if (!assunto || !corpo) {
      return res.status(400).json({
        success: false,
        message: 'Assunto e corpo são obrigatórios'
      });
    }

    await database.query(`
      INSERT INTO email_templates (assunto, corpo)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE assunto = VALUES(assunto), corpo = VALUES(corpo)
    `, [assunto, corpo]);

    res.json({
      success: true,
      message: 'Template salvo com sucesso'
    });

  } catch (error) {
    console.error('Erro ao salvar template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar template',
      error: error.message
    });
  }
});

// ============================================
// BUSCAR TEMPLATE
// ============================================
router.get('/admin/campaigns/template', authenticateAdmin, async (req, res) => {
  try {
    const templates = await database.query(
      'SELECT * FROM email_templates ORDER BY updated_at DESC LIMIT 1'
    );

    res.json({
      success: true,
      template: templates[0] || null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar template',
      error: error.message
    });
  }
});

// ============================================
// ENVIAR CAMPANHA
// ============================================
router.post('/admin/campaigns/send', authenticateAdmin, async (req, res) => {
  try {
    const { tipo } = req.body;

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de campanha é obrigatório'
      });
    }

    // Busca template salvo
    const templates = await database.query(
      'SELECT * FROM email_templates ORDER BY updated_at DESC LIMIT 1'
    );

    if (!templates || templates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum template salvo. Cria um template primeiro.'
      });
    }

    const template = templates[0];

    // Queries por tipo
    const queries = {
      todos: `
        SELECT id, username, email, coins, plan
        FROM users
        WHERE email_verified = TRUE
      `,
      inativos: `
        SELECT id, username, email, coins, plan
        FROM users
        WHERE is_active = FALSE AND email_verified = TRUE
      `,
      sem_containers: `
        SELECT u.id, u.username, u.email, u.coins, u.plan
        FROM users u
        LEFT JOIN containers c ON c.user_id = u.id
        WHERE c.id IS NULL AND u.email_verified = TRUE
      `,
      free: `
        SELECT id, username, email, coins, plan
        FROM users
        WHERE plan = 'free' AND email_verified = TRUE
      `,
      vip: `
        SELECT id, username, email, coins, plan
        FROM users
        WHERE plan IN ('basic', 'pro') AND email_verified = TRUE
      `
    };

    if (!queries[tipo]) {
      return res.status(400).json({
        success: false,
        message: 'Tipo inválido'
      });
    }

    const usuarios = await database.query(queries[tipo]);

    if (!usuarios || usuarios.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum usuário encontrado para este grupo',
        enviados: 0
      });
    }

    let enviados = 0;
    let erros = 0;

    for (const user of usuarios) {
      try {
        const corpo = aplicarTemplate(template.corpo, user);
        const assunto = aplicarTemplate(template.assunto, user);

        await resend.emails.send({
          from: 'MozHost <noreply@mozhost.com>',
          to: user.email,
          subject: assunto,
          html: corpo
        });

        enviados++;
      } catch (err) {
        console.error(`Erro ao enviar para ${user.email}:`, err);
        erros++;
      }
    }

    console.log(`[Campaign] Tipo: ${tipo} | Admin: ${req.user.username} | Enviados: ${enviados} | Erros: ${erros}`);

    res.json({
      success: true,
      message: 'Campanha enviada!',
      tipo,
      enviados,
      erros
    });

  } catch (error) {
    console.error('Erro ao enviar campanha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar campanha',
      error: error.message
    });
  }
});

module.exports = router;
