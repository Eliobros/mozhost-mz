const express = require('express');
const router = express.Router();
const db = require('../models/database');
const auth = require('../middleware/auth');

// Aplicar auth em todas as rotas
router.use(auth);

// Listar notificações do usuário
router.get('/', async (req, res) => {
  try {
    const notifications = await db.query(
      `SELECT id, type, category, title, message, read_at, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.userId]
    );
    
    const unreadCount = notifications.filter(n => !n.read_at).length;
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ error: 'Falha ao carregar notificações' });
  }
});

// Marcar uma como lida
router.patch('/:id/read', async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao marcar como lida' });
  }
});

// Marcar todas como lidas
router.patch('/read-all', async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao marcar todas como lidas' });
  }
});

// Deletar notificação
router.delete('/:id', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao deletar' });
  }
});

// Função helper para criar notificação (exportar para uso em outros arquivos)
const createNotification = async (userId, { type = 'info', category = 'system', title, message }) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, category, title, message) VALUES (?, ?, ?, ?, ?)`,
      [userId, type, category, title, message]
    );
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
};

router.createNotification = createNotification;

// Guardar Expo Push Token
router.post('/expo-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token obrigatório' });
    }

    // Inserir ou atualizar se já existir
    await db.query(
      `INSERT INTO expo_push_tokens (user_id, token) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE user_id = ?`,
      [req.user.userId, token, req.user.userId]
    );

    console.log(`✅ Expo Push Token guardado para user ${req.user.userId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('Erro ao guardar expo token:', error);
    res.status(500).json({ error: 'Falha ao guardar token' });
  }
});

// Remover Expo Push Token (logout)
router.delete('/expo-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token obrigatório' });
    }

    await db.query(
      'DELETE FROM expo_push_tokens WHERE user_id = ? AND token = ?',
      [req.user.userId, token]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Erro ao remover expo token:', error);
    res.status(500).json({ error: 'Falha ao remover token' });
  }
});


module.exports = router;
