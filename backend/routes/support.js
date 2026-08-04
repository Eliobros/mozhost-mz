// routes/support.js
// Rotas HTTP do sistema de suporte humano MozHost

const express = require('express');
const router = express.Router();
const bridge = require('../services/supportBridge');
const database = require('../models/database');
const authMiddleware  = require('../middleware/auth'); // o teu middleware JWT

// ─── Rate limit simples (em memória) ─────────────────────────────────────────
// Evita que um usuário spame o agente de suporte com mensagens.
// Limite: 12 mensagens por janela de 15 segundos.
const messageRate = new Map();
const MESSAGE_MAX = 12;
const MESSAGE_WINDOW_MS = 15000;

function messageRateLimit(scope, userId, max = MESSAGE_MAX, windowMs = MESSAGE_WINDOW_MS) {
  const now = Date.now();
  const key = `${scope}:${userId}`;
  const rec = messageRate.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + windowMs;
  }
  rec.count += 1;
  messageRate.set(key, rec);

  // Limpeza ocasional para a memória não crescer sem limite
  if (messageRate.size > 1000) {
    for (const [k, v] of messageRate) {
      if (now > v.resetAt) messageRate.delete(k);
    }
  }

  return rec.count <= max;
}

// ─── POST /api/support/ticket ─────────────────────────────────────────────────
// Cria um novo ticket de suporte (chamado pelo frontend ou pelo function calling da IA)

router.post('/ticket', authMiddleware, async (req, res) => {
  try {
    const { summary, lastMessage, conversationHistory } = req.body;
    const userId = req.user.id;

    // Rate limit: evita que um usuário crie/cancele tickets em loop para
    // spammar os agentes com notificações no WhatsApp (5 por minuto).
    if (!messageRateLimit('ticket', userId, 5, 60000)) {
      return res.status(429).json({ success: false, error: 'Muitas solicitações de ticket em pouco tempo. Aguarde um pouco.' });
    }

    if (!summary || !lastMessage) {
      return res.status(400).json({ success: false, error: 'summary e lastMessage são obrigatórios' });
    }

    // Verificar se utilizador já tem ticket activo
    const existing = await database.query(
      `SELECT id FROM support_tickets 
       WHERE user_id = ? AND status IN ('waiting', 'active')
       LIMIT 1`,
      [userId]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        ticketId: existing[0].id,
        message: 'Ticket existente retomado'
      });
    }

    const { ticketId } = await bridge.createTicket({
      userId,
      summary,
      lastMessage,
      conversationHistory: conversationHistory || []
    });

    res.json({ success: true, ticketId });

  } catch (err) {
    console.error('❌ Erro ao criar ticket:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/support/message ────────────────────────────────────────────────
// Usuário envia mensagem para o agente (bridge → WhatsApp do agente)

router.post('/message', authMiddleware, async (req, res) => {
  try {
    const { ticketId, message } = req.body;
    const userId = req.user.id;

    if (!ticketId || !message) {
      return res.status(400).json({ success: false, error: 'ticketId e message são obrigatórios' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ success: false, error: 'Mensagem muito longa (máx 2000 chars)' });
    }

    if (!messageRateLimit('msg', userId)) {
      return res.status(429).json({ success: false, error: 'Muitas mensagens em pouco tempo. Aguarde alguns segundos.' });
    }

    await bridge.userToAgent({ ticketId: parseInt(ticketId), userId, message });

    res.json({ success: true });

  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err.message);
    const status = err.message === 'Acesso negado' ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ─── POST /api/support/ticket/:id/cancel ─────────────────────────────────────
// Utilizador cancela o ticket enquanto aguarda ou durante conversa

router.post('/ticket/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.id;

    await bridge.cancelTicket({ ticketId, userId });

    res.json({ success: true, message: 'Ticket cancelado' });

  } catch (err) {
    console.error('❌ Erro ao cancelar ticket:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/support/ticket/:id ─────────────────────────────────────────────
// Busca estado actual do ticket (útil para reconnect do socket)

router.get('/ticket/:id', authMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.id;

    const tickets = await database.query(
      `SELECT id, status, agent_name, summary, created_at, claimed_at, closed_at,
              rating, feedback_at, feedback_sentiment
       FROM support_tickets WHERE id = ? AND user_id = ?`,
      [ticketId, userId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket não encontrado' });
    }

    res.json({ success: true, ticket: tickets[0] });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/support/ticket/:id/messages ────────────────────────────────────
// Histórico de mensagens do ticket OU polling incremental via cursor:
//   - Sem query → devolve TODO o histórico (compatibilidade).
//   - `?after=<id>` → devolve SÓ mensagens com id > after (incremental).
//   - `?sender=agent|user` → restringe o filtro ao remetente.
// Usado pelo frontend em /api/support/ticket/:id/messages?after=<id>&sender=agent
//   a cada ~5s enquanto o ticket está `active`, como fallback robusto do socket.

router.get('/ticket/:id/messages', authMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.id;
    const after = parseInt(req.query.after, 10) || 0;
    const sender = req.query.sender && ['agent', 'user'].includes(req.query.sender)
      ? req.query.sender
      : null;

    // Verificar que o ticket pertence ao utilizador
    const tickets = await database.query(
      'SELECT id FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId]
    );

    if (tickets.length === 0) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const conditions = ['ticket_id = ?', 'id > ?'];
    const params = [ticketId, after];
    if (sender) {
      conditions.push('sender = ?');
      params.push(sender);
    }

    const rows = await database.query(
      `SELECT id, sender, agent_name, message, created_at
       FROM support_messages
       WHERE ${conditions.join(' AND ')}
       ORDER BY id ASC
       LIMIT 200`,
      params
    );

    const lastId = rows.length > 0 ? rows[rows.length - 1].id : after;
    res.json({ success: true, messages: rows, lastId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/support/ticket/:id/rate ──────────────────────────────────────
// Avaliação do utilizador após o ticket ser encerrado.
//   Body: { rating: 1-5, message?: string }
//   Persiste rating + feedback_text, resume via IA e envia resumo ao agente.

router.post('/ticket/:id/rate', authMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.id;
    const { rating, message } = req.body || {};

    if (!Number.isInteger(parseInt(rating, 10)) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'rating deve ser inteiro 1-5' });
    }
    if (message && typeof message === 'string' && message.length > 4000) {
      return res.status(400).json({ success: false, error: 'Mensagem de feedback muito longa (máx 4000)' });
    }

    const result = await bridge.submitFeedback({
      ticketId,
      userId,
      rating,
      feedbackText: message || null,
    });

    res.json({
      success: true,
      rating: result.rating,
      summary: result.summary,
      sentiment: result.sentiment,
    });

  } catch (err) {
    console.error('❌ Erro ao submeter feedback:', err.message);
    const status = err.message.includes('Acesso') ? 403
                 : err.message.includes('avaliado') || err.message.includes('elegível') ? 409
                 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ─── Socket.IO: join_ticket ───────────────────────────────────────────────────
// Este handler NÃO é uma rota HTTP — fica aqui para referência.
// Chama setupSupportSocket(io) no teu index.js

function setupSupportSocket(io) {
  io.on('connection', (socket) => {

    // Utilizador entra na sala do seu ticket
    socket.on('join_ticket', async ({ ticketId }) => {
      if (!ticketId) return;

      // Opcional: validar token aqui se quiseres segurança extra no socket
      socket.join(`ticket_${ticketId}`);
      console.log(`🔌 Socket ${socket.id} entrou em ticket_${ticketId}`);

      // Enviar estado actual do ticket logo ao conectar
      try {
        const tickets = await database.query(
          'SELECT status, agent_name FROM support_tickets WHERE id = ?',
          [ticketId]
        );

        if (tickets.length > 0 && tickets[0].status === 'active') {
          socket.emit('agente_entrou', {
            agentName: tickets[0].agent_name,
            ticketId,
            reconnected: true
          });
        }
      } catch {}
    });

    socket.on('leave_ticket', ({ ticketId }) => {
      socket.leave(`ticket_${ticketId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket ${socket.id} desconectado`);
    });
  });
}

module.exports = router;
module.exports.setupSupportSocket = setupSupportSocket;
