// backend/routes/push.js
// Rotas Express para Web Push Notifications
const authenticateToken = require('../middleware/auth');
require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const router = express.Router();
const db = require('../models/database.js');

// ─── Configurar VAPID ─────────────────────────────────────────────────────────
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ─── Retornar VAPID public key para o frontend ────────────────────────────────
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ─── Salvar subscription do usuário ──────────────────────────────────────────
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }

    // Verificar se já existe
    const existing = await db.query(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?',
      [endpoint]
    );

    if (existing.length > 0) {
      // Atualizar
      await db.query(
        'UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE endpoint = ?',
        [userId, keys.p256dh, keys.auth, endpoint]
      );
    } else {
      // Inserir
      await db.query(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
        [userId, endpoint, keys.p256dh, keys.auth]
      );
    }

    console.log(`✅ Push subscription salva para user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao salvar subscription:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── Remover subscription (logout) ───────────────────────────────────────────
router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await db.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── Função helper: enviar push para um usuário ───────────────────────────────
async function sendPushToUser(userId, payload) {
  try {
    // Buscar todas as subscriptions do usuário
    const subscriptions = await db.query(
      'SELECT * FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (subscriptions.length === 0) {
      console.log(`ℹ️  Usuário ${userId} sem subscription de push`);
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      icon: payload.icon || '/mozhost.png',
      badge: '/mozhost.png',
      url: payload.url || '/',
      tag: payload.tag || `mozhost-${Date.now()}`
    });

    const promises = subscriptions.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      };

      try {
        await webpush.sendNotification(subscription, pushPayload);
        console.log(`✅ Push enviado para user ${userId}`);
      } catch (err) {
        // Subscription expirada ou inválida → remover do banco
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🗑️  Subscription expirada, removendo...`);
          await db.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [row.endpoint]);
        } else {
          console.error(`❌ Erro ao enviar push:`, err.message);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('❌ Erro em sendPushToUser:', error);
  }
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;

