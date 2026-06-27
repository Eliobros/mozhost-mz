// services/supportBridge.js
// Bridge bidirecional: painel do usuário ↔ agente no WhatsApp via Baileys

const database = require('../models/database');

// ─── Referências injetadas no init() ────────────────────────────────────────
let _io = null;
let _waSocket = null;

const AGENT_NUMBERS = (process.env.SUPPORT_AGENT_NUMBERS || '').split(',').filter(Boolean);
const AGENT_GROUP_JID = process.env.SUPPORT_AGENT_GROUP_JID || null;

// ─── Init ────────────────────────────────────────────────────────────────────

function init(io, waSocket) {
  _io = io;
  _waSocket = waSocket;
  console.log('✅ SupportBridge iniciado');
}

function attachSocket(waSocket) {
  _waSocket = waSocket;
  console.log('🔄 SupportBridge: socket Baileys actualizado');
}

// ─── Criar ticket ─────────────────────────────────────────────────────────────

async function createTicket({ userId, summary, lastMessage, conversationHistory = [] }) {
  const existing = await database.query(
    `SELECT id FROM support_tickets WHERE user_id = ? AND status IN ('waiting','active') LIMIT 1`,
    [userId]
  );
  if (existing.length > 0) {
    console.log(`ℹ️  Ticket já existe para userId ${userId}: #${existing[0].id}`);
    return { ticketId: existing[0].id, userId, alreadyExists: true };
  }

  const users = await database.query(
    'SELECT id, username, email FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) throw new Error('Usuário não encontrado');
  const user = users[0];

  const result = await database.query(
    `INSERT INTO support_tickets
     (user_id, status, summary, last_message, conversation_history, created_at)
     VALUES (?, 'waiting', ?, ?, ?, NOW())`,
    [userId, summary, lastMessage, JSON.stringify(conversationHistory)]
  );

  const ticketId = result.insertId;
  console.log(`🎫 Ticket #${ticketId} criado para ${user.username}`);

  await notifyAgents({ ticketId, user, summary, lastMessage });

  return { ticketId, userId, username: user.username };
}

// ─── Notificar agentes ────────────────────────────────────────────────────────

async function notifyAgents({ ticketId, user, summary, lastMessage }) {
  if (!_waSocket) {
    console.warn('⚠️  Baileys não está conectado — agentes não notificados');
    return;
  }

  const msg =
    `🎫 *Novo Ticket de Suporte #${ticketId}*\n\n` +
    `👤 *Usuário:* ${user.username} (${user.email})\n` +
    `📝 *Resumo:* ${summary}\n` +
    `💬 *Última msg:* ${lastMessage}\n\n` +
    `Para aceitar responda: *ACEITAR ${ticketId}*\n` +
    `Para recusar responda: *RECUSAR ${ticketId}*`;

  const targets = AGENT_GROUP_JID
    ? [AGENT_GROUP_JID]
    : AGENT_NUMBERS.map(n => `${n}@s.whatsapp.net`);

  for (const jid of targets) {
    try {
      await _waSocket.sendMessage(jid, { text: msg });
      console.log(`📤 Ticket #${ticketId} notificado para ${jid}`);
    } catch (err) {
      console.error(`❌ Falha ao notificar ${jid}:`, err.message);
    }
  }
}

// ─── Agente aceita ticket ─────────────────────────────────────────────────────

async function agentClaimTicket({ ticketId, agentPhone, agentName }) {
  const result = await database.query(
    `UPDATE support_tickets
     SET status = 'active',
         agent_phone = ?,
         agent_name  = ?,
         claimed_at  = NOW()
     WHERE id = ? AND status = 'waiting'`,
    [agentPhone, agentName, ticketId]
  );

  if (result.affectedRows === 0) {
    if (_waSocket) {
      const jid = `${agentPhone}@s.whatsapp.net`;
      await _waSocket.sendMessage(jid, {
        text: `⚠️ O ticket #${ticketId} já foi aceite por outro agente.`
      });
    }
    return false;
  }

  console.log(`✅ Ticket #${ticketId} aceite por ${agentName} (${agentPhone})`);

  const tickets = await database.query(
    'SELECT user_id FROM support_tickets WHERE id = ?',
    [ticketId]
  );

  if (tickets.length === 0) return false;

  _io.to(`ticket_${ticketId}`).emit('agente_entrou', {
    agentName,
    ticketId
  });

  if (_waSocket) {
    const jid = `${agentPhone}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, {
      text:
        `✅ *Ticket #${ticketId} aceite!*\n\n` +
        `Agora as mensagens do usuário aparecerão aqui.\n` +
        `Para encerrar a conversa, envie: *ENCERRAR ${ticketId}*`
    });
  }

  await notifyOtherAgents({ ticketId, agentName, agentPhone });

  return true;
}

// ─── Notificar outros agentes ─────────────────────────────────────────────────

async function notifyOtherAgents({ ticketId, agentName, agentPhone }) {
  if (!_waSocket) return;

  const others = AGENT_NUMBERS.filter(n => n !== agentPhone);
  for (const n of others) {
    try {
      const jid = `${n}@s.whatsapp.net`;
      await _waSocket.sendMessage(jid, {
        text: `ℹ️ O ticket #${ticketId} foi aceite por ${agentName}.`
      });
    } catch (err) {
      console.error(`❌ Falha ao notificar agente ${n}:`, err.message);
    }
  }
}

// ─── Usuário envia mensagem pro agente ───────────────────────────────────────

async function userToAgent({ ticketId, userId, message }) {
  const tickets = await database.query(
    `SELECT id, agent_phone, agent_name, status, user_id
     FROM support_tickets WHERE id = ?`,
    [ticketId]
  );

  if (tickets.length === 0) throw new Error('Ticket não encontrado');

  const ticket = tickets[0];

  if (ticket.user_id !== userId) throw new Error('Acesso negado');
  if (ticket.status !== 'active') throw new Error('Ticket não está activo');
  if (!ticket.agent_phone) throw new Error('Nenhum agente conectado');

  await saveChatMessage({ ticketId, from: 'user', message });

  if (_waSocket) {
    const jid = `${ticket.agent_phone}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, {
      text: `💬 *[Ticket #${ticketId}] Usuário:*\n${message}`
    });
  }

  return { success: true };
}

// ─── Agente envia mensagem pro usuário ───────────────────────────────────────

async function agentToUser({ ticketId, agentPhone, agentName, message }) {
  const tickets = await database.query(
    `SELECT id, user_id, status FROM support_tickets
     WHERE id = ? AND agent_phone = ? AND status = 'active'`,
    [ticketId, agentPhone]
  );

  if (tickets.length === 0) {
    console.warn(`⚠️  Mensagem ignorada — ticket #${ticketId} não activo para ${agentPhone}`);
    return;
  }

  await saveChatMessage({ ticketId, from: 'agent', agentName, message });

  _io.to(`ticket_${ticketId}`).emit('nova_mensagem', {
    message,
    agentName,
    ticketId
  });
}

// ─── Encerrar ticket ─────────────────────────────────────────────────────────

async function closeTicket({ ticketId, agentPhone }) {
  const result = await database.query(
    `UPDATE support_tickets
     SET status = 'closed', closed_at = NOW()
     WHERE id = ? AND agent_phone = ? AND status = 'active'`,
    [ticketId, agentPhone]
  );

  if (result.affectedRows === 0) {
    if (_waSocket) {
      const jid = `${agentPhone}@s.whatsapp.net`;
      await _waSocket.sendMessage(jid, {
        text: `⚠️ Ticket #${ticketId} não encontrado ou já encerrado.`
      });
    }
    return;
  }

  console.log(`🔒 Ticket #${ticketId} encerrado por ${agentPhone}`);

  _io.to(`ticket_${ticketId}`).emit('ticket_encerrado', { ticketId });

  if (_waSocket) {
    const jid = `${agentPhone}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, {
      text: `✅ Ticket #${ticketId} encerrado com sucesso.`
    });
  }
}

// ─── Cancelar ticket (pelo usuário) ──────────────────────────────────────────

async function cancelTicket({ ticketId, userId }) {
  const result = await database.query(
    `UPDATE support_tickets
     SET status = 'cancelled', closed_at = NOW()
     WHERE id = ? AND user_id = ? AND status IN ('waiting', 'active')`,
    [ticketId, userId]
  );

  if (result.affectedRows === 0) throw new Error('Ticket não encontrado ou já encerrado');

  const tickets = await database.query(
    'SELECT agent_phone FROM support_tickets WHERE id = ?',
    [ticketId]
  );

  if (tickets[0]?.agent_phone && _waSocket) {
    const jid = `${tickets[0].agent_phone}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, {
      text: `❌ O usuário cancelou o ticket #${ticketId}.`
    });
  }

  return { success: true };
}

// ─── Handler principal do Baileys ─────────────────────────────────────────────

async function handleIncomingWhatsApp({ messages, type }) {
  if (type !== 'notify') return false;
  let handled = false;

  for (const msg of messages) {
    if (!msg.message || msg.key.fromMe) continue;

    const jid = msg.key.remoteJid;

    // 👇 Resolve número real mesmo quando vem @lid
    const senderJid = msg.key.participantPn || msg.key.participant || jid;
    const phone = senderJid.replace(/:[0-9]+@/, '@').replace('@s.whatsapp.net', '');

    console.log('📞 Sender resolvido:', phone);
    console.log('📋 Agentes:', AGENT_NUMBERS);

    if (!AGENT_NUMBERS.includes(phone)) continue;
    handled = true;

    // 🔘 Resposta de botão
    const btnResponse = msg.message.buttonsResponseMessage;
    if (btnResponse) {
      const id = btnResponse.selectedButtonId;
      const agentName = await getAgentName(phone);

      if (id === 'aceitar_suporte') {
        const tickets = await database.query(
          `SELECT id FROM support_tickets WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 1`
        );
        if (tickets.length > 0) {
          await agentClaimTicket({ ticketId: tickets[0].id, agentPhone: phone, agentName });
        }
        continue;
      }

      if (id === 'recusar_suporte') {
        const tickets = await database.query(
          `SELECT id FROM support_tickets WHERE agent_phone = ? AND status = 'active' ORDER BY claimed_at DESC LIMIT 1`,
          [phone]
        );
        if (tickets.length > 0) {
          await closeTicket({ ticketId: tickets[0].id, agentPhone: phone });
        }
        continue;
      }
    }

    // 📝 Texto (ACEITAR / RECUSAR / ENCERRAR)
    const text = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''
    ).trim();

    if (!text) continue;

    const acceptMatch = text.match(/^ACEITAR\s+(\d+)$/i);
    const refuseMatch = text.match(/^RECUSAR\s+(\d+)$/i);
    const closeMatch  = text.match(/^ENCERRAR\s+(\d+)$/i);

    if (acceptMatch) {
      const ticketId = parseInt(acceptMatch[1]);
      const agentName = await getAgentName(phone);
      await agentClaimTicket({ ticketId, agentPhone: phone, agentName });
      continue;
    }

    if (refuseMatch) {
      const ticketId = parseInt(refuseMatch[1]);
      await closeTicket({ ticketId, agentPhone: phone });
      continue;
    }

    if (closeMatch) {
      const ticketId = parseInt(closeMatch[1]);
      await closeTicket({ ticketId, agentPhone: phone });
      continue;
    }

    // Mensagem normal → encaminhar pro usuário
    const activeTickets = await database.query(
      `SELECT id FROM support_tickets WHERE agent_phone = ? AND status = 'active' ORDER BY claimed_at DESC LIMIT 1`,
      [phone]
    );

    if (activeTickets.length > 0) {
      const ticketId = activeTickets[0].id;
      const agentName = await getAgentName(phone);
      await agentToUser({ ticketId, agentPhone: phone, agentName, message: text });
    }
  }

  return handled;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAgentName(phone) {
  try {
    const agents = await database.query(
      'SELECT agent_name FROM support_agents WHERE phone = ? LIMIT 1',
      [phone]
    );
    return agents[0]?.agent_name || `Agente (${phone.slice(-4)})`;
  } catch {
    return `Agente (${phone.slice(-4)})`;
  }
}

async function saveChatMessage({ ticketId, from, agentName, message }) {
  await database.query(
    `INSERT INTO support_messages (ticket_id, sender, agent_name, message, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [ticketId, from, agentName || null, message]
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  init,
  attachSocket,
  createTicket,
  agentClaimTicket,
  userToAgent,
  agentToUser,
  closeTicket,
  cancelTicket,
  handleIncomingWhatsApp
};