// routes/whatsapp-link.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Gerar código único de 8 caracteres
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 0, 1 pra evitar confusão
  let code = 'MOZH-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Bot solicita código de vinculação (chamado quando user envia /vincular)
router.post('/request-code', [
  body('whatsappNumber').matches(/^258(84|85|86|87)[0-9]{7}$/).withMessage('Número WhatsApp inválido (formato: 258841234567)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validação falhou', details: errors.array() });
    }

    const { whatsappNumber } = req.body;

    // Verificar se já existe vinculação
    const existing = await database.query(
      'SELECT * FROM whatsapp_accounts WHERE whatsapp_number = ?',
      [whatsappNumber]
    );

    if (existing.length > 0 && existing[0].verified) {
      // Já vinculado - buscar info do usuário
      const users = await database.query(
        'SELECT username, email, coins FROM users WHERE id = ?',
        [existing[0].user_id]
      );

      return res.json({
        success: true,
        alreadyLinked: true,
        user: {
          username: users[0].username,
          email: users[0].email,
          coins: users[0].coins
        }
      });
    }

    // Gerar novo código
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Deletar códigos antigos deste número
    await database.query(
      'DELETE FROM whatsapp_accounts WHERE whatsapp_number = ? AND verified = FALSE',
      [whatsappNumber]
    );

    // Criar novo registro pendente
    await database.query(
      'INSERT INTO whatsapp_accounts (whatsapp_number, verification_code, code_expires_at, verified) VALUES (?, ?, ?, FALSE)',
      [whatsappNumber, code, expiresAt]
    );

    res.json({
      success: true,
      code: code,
      expiresIn: 600, // segundos
      message: 'Código gerado com sucesso'
    });

  } catch (error) {
    console.error('Request code error:', error);
    res.status(500).json({ error: 'Falha ao gerar código' });
  }
});

// Usuário vincula no site (após login)
router.post('/verify-code', [
  body('code').isLength({ min: 11, max: 11 }).withMessage('Código inválido')
], authMiddleware, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validação falhou', details: errors.array() });
    }

    const { code } = req.body;
    const userId = req.user.userId;

    // Buscar código pendente
    const pending = await database.query(
      'SELECT * FROM whatsapp_accounts WHERE verification_code = ? AND verified = FALSE AND code_expires_at > NOW()',
      [code.toUpperCase()]
    );

    if (pending.length === 0) {
      return res.status(400).json({
        error: 'Código inválido ou expirado',
        message: 'Solicite um novo código no WhatsApp com /vincular'
      });
    }

    const whatsappNumber = pending[0].whatsapp_number;

    // Verificar se usuário já tem outra conta vinculada
    const existingUser = await database.query(
      'SELECT * FROM whatsapp_accounts WHERE user_id = ? AND verified = TRUE',
      [userId]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: 'Você já tem uma conta WhatsApp vinculada',
        message: 'Desvincule primeiro para vincular outro número'
      });
    }

    // Verificar se este WhatsApp já está vinculado a outra conta
    const existingWhatsApp = await database.query(
      'SELECT * FROM whatsapp_accounts WHERE whatsapp_number = ? AND verified = TRUE',
      [whatsappNumber]
    );

    if (existingWhatsApp.length > 0) {
      return res.status(400).json({
        error: 'Este WhatsApp já está vinculado a outra conta',
        message: 'Use /desvincular no WhatsApp primeiro'
      });
    }

    // Vincular conta
    await database.query(
      'UPDATE whatsapp_accounts SET user_id = ?, verified = TRUE, verification_code = NULL, code_expires_at = NULL, updated_at = NOW() WHERE id = ?',
      [userId, pending[0].id]
    );

    // Buscar dados do usuário
    const users = await database.query(
      'SELECT username, email, coins FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'WhatsApp vinculado com sucesso!',
      whatsappNumber: whatsappNumber,
      user: users[0]
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Falha ao verificar código' });
  }
});

// Desvincular conta (no site)
router.post('/unlink', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await database.query(
      'DELETE FROM whatsapp_accounts WHERE user_id = ? AND verified = TRUE',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Nenhuma conta WhatsApp vinculada'
      });
    }

    res.json({
      success: true,
      message: 'WhatsApp desvinculado com sucesso'
    });

  } catch (error) {
    console.error('Unlink error:', error);
    res.status(500).json({ error: 'Falha ao desvincular' });
  }
});

// Status da vinculação (no site)
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const linked = await database.query(
      'SELECT whatsapp_number, created_at FROM whatsapp_accounts WHERE user_id = ? AND verified = TRUE',
      [userId]
    );

    if (linked.length === 0) {
      return res.json({
        linked: false,
        message: 'Nenhuma conta WhatsApp vinculada'
      });
    }

    res.json({
      linked: true,
      whatsappNumber: linked[0].whatsapp_number,
      linkedSince: linked[0].created_at
    });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Falha ao verificar status' });
  }
});

// Bot verifica se usuário está vinculado (antes de processar comandos)
router.post('/check-user', [
  body('whatsappNumber').notEmpty().withMessage('WhatsApp number required')
], async (req, res) => {
  try {
    const { whatsappNumber } = req.body;

    const linked = await database.query(
      'SELECT wa.*, u.id as user_id, u.username, u.email, u.coins, u.max_containers FROM whatsapp_accounts wa JOIN users u ON wa.user_id = u.id WHERE wa.whatsapp_number = ? AND wa.verified = TRUE',
      [whatsappNumber]
    );

    if (linked.length === 0) {
      return res.json({
        linked: false,
        message: 'Conta não vinculada. Use /vincular para começar.'
      });
    }

    res.json({
      linked: true,
      user: {
        id: linked[0].user_id,
        username: linked[0].username,
        email: linked[0].email,
        coins: linked[0].coins,
        maxContainers: linked[0].max_containers
      }
    });

  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ error: 'Falha ao verificar usuário' });
  }
});

module.exports = router;
