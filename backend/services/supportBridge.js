
// services/supportBridge.js
// Bridge bidirecional: painel do usuário ↔ agente no WhatsApp via Baileys

const database = require('../models/database');

// ─── Referências injetadas no init() ────────────────────────────────────────
let _io = null;       // Socket.IO server
let _waSocket = null; // Baileys socket (makeWASocket)

// Número(s) dos agentes de suporte no formato internacional sem +
// ex: '258841234567' (Mozambique)
const AGENT_NUMBERS = (process.env.SUPPORT_AGENT_NUMBERS || '').split(',').filter(Boolean);

// Grupo WhatsApp dos agentes (opcional — se preferires grupo ao invés de DM)
const AGENT_GROUP_JID = process.env.SUPPORT_AGENT_GROUP_JID || null;

// ─── Init ────────────────────────────────────────────────────────────────────

function init(io, waSocket) {
  _io = io;
  _waSocket = waSocket;
  console.log('✅ SupportBridge iniciado');
}

/**
 * Chamado pelo whatsapp.js quando o Baileys conecta ou reconecta.
 * Actualiza o socket sem precisar de reiniciar o bridge.
 */
function attachSocket(waSocket) {
  _waSocket = waSocket;
  console.log('🔄 SupportBridge: socket Baileys actualizado');
}

// ─── Criar ticket ─────────────────────────────────────────────────────────────

/**
 * Cria um ticket de suporte e notifica os agentes via WhatsApp.
 * Chamado pela route ou pelo function calling da IA.
 */
async function createTicket({ userId, summary, lastMessage, conversationHistory = [] }) {
  // Verifica se já existe ticket aberto
  const existing = await database.query(
    `SELECT id FROM support_tickets WHERE user_id = ? AND status IN ('waiting','active') LIMIT 1`,
    [userId]
  );
  if (existing.length > 0) {
    console.log(`ℹ️  Ticket já existe para userId ${userId}: #${existing[0].id}`);
    return { ticketId: existing[0].id, userId, alreadyExists: true };
  }

  // Buscar dados do usuário
  const users = await database.query(
    'SELECT id, username, email FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) throw new Error('Usuário não encontrado');
  const user = users[0];

  // Inserir ticket
  const result = await database.query(
    `INSERT INTO support_tickets
     (user_id, status, summary, last_message, conversation_history, created_at)
     VALUES (?, 'waiting', ?, ?, ?, NOW())`,
    [userId, summary, lastMessage, JSON.stringify(conversationHistory)]
  );

  const ticketId = result.insertId;

  console.log(`🎫 Ticket #${ticketId} criado para ${user.username}`);

  // Notificar agentes via WhatsApp
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
    `Para aceitar este ticket, responda:\n` +
    `*ACEITAR ${ticketId}*`;

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

/**
 * Chamado quando o Baileys recebe "ACEITAR <ticketId>" de um agente.
 * Garante que apenas o primeiro agente a aceitar fica com o ticket (atomic update).
 */
async function agentClaimTicket({ ticketId, agentPhone, agentName }) {
  // UPDATE atômico — só actualiza se ainda estiver 'waiting'
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
    // Outro agente já pegou o ticket
    if (_waSocket) {
      const jid = `${agentPhone}@s.whatsapp.net`;
      await _waSocket.sendMessage(jid, {
        text: `⚠️ O ticket #${ticketId} já foi aceite por outro agente.`
      });
    }
    return false;
  }

  console.log(`✅ Ticket #${ticketId} aceite por ${agentName} (${agentPhone})`);

  // Buscar userId do ticket
  const tickets = await database.query(
    'SELECT user_id FROM support_tickets WHERE id = ?',
    [ticketId]
  );

  if (tickets.length === 0) return false;

  const userId = tickets[0].user_id;

  // Notificar painel do usuário via Socket.IO
  _io.to(`ticket_${ticketId}`).emit('agente_entrou', {
    agentName,
    ticketId
  });

  // Confirmar ao agente
  if (_waSocket) {
    const jid = `${agentPhone}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, {
      text:
        `✅ *Ticket #${ticketId} aceite!*\n\n` +
        `Agora as mensagens do usuário aparecerão aqui.\n` +
        `Para encerrar a conversa, envie: *ENCERRAR ${ticketId}*`
    });
  }

  // Notificar outros agentes que o ticket foi aceite
  await notifyOtherAgents({ ticketId, agentName, agentPhone });

  return true;
}

async function notifyAgents({ ticketId, user, summary, lastMessage }) {
  if (!_waSocket) {
    console.warn('⚠️  Baileys não está conectado — agentes não notificados');
    return;
  }

  const buttons = [
    { buttonId: 'aceitar_suporte', buttonText: { displayText: '✅ Aceitar' }, type: 1 },
    { buttonId: 'recusar_suporte', buttonText: { displayText: '❌ Recusar' }, type: 1 }
  ];

  const buttonMessage = {
    text:
      `🎫 *Novo Ticket de Suporte #${ticketId}*\n\n` +
      `👤 *Usuário:* ${user.username} (${user.email})\n` +
      `📝 *Resumo:* ${summary}\n` +
      `💬 *Última msg:* ${lastMessage}\n\n` +
      `Escolha uma opção abaixo:`,
    footer: "MozHost Bot",
    buttons,
    headerType: 1
  };

  const targets = AGENT_GROUP_JID
    ? [AGENT_GROUP_JID]
    : AGENT_NUMBERS.map(n => `${n}@s.whatsapp.net`);

  for (const jid of targets) {
    try {
      await _waSocket.sendMessage(jid, buttonMessage, { quoted: null });
      console.log(`📤 Ticket #${ticketId} notificado com botões para ${jid}`);
    } catch (err) {
      console.error(`❌ Falha ao notificar ${jid}:`, err.message);
    }
  }
}

// ─── Usuário envia mensagem pro agente ───────────────────────────────────────

/**
 * Chamado pela route POST /api/support/message (usuário → agente).
 */
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

  // Salvar mensagem no histórico
  await saveChatMessage({ ticketId, from: 'user', message });

  // Enviar pro agente via Baileys
  if (_waSocket) {
    const jid = `${ticket.agent_phone}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, {
      text: `💬 *[Ticket #${ticketId}] Usuário:*\n${message}`
    });
  }

  return { success: true };
}

// ─── Agente envia mensagem pro usuário ───────────────────────────────────────

/**
 * Chamado pelo handler do Baileys quando agente responde no WhatsApp.
 * O texto do agente NÃO começa com ACEITAR/ENCERRAR.
 */
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

  // Salvar mensagem
  await saveChatMessage({ ticketId, from: 'agent', agentName, message });

  // Emitir pro painel do usuário via Socket.IO
  _io.to(`ticket_${ticketId}`).emit('nova_mensagem', {
    message,
    agentName,
    ticketId
  });
}

// ─── Encerrar ticket ─────────────────────────────────────────────────────────

/**
 * Chamado quando agente envia "ENCERRAR <ticketId>" no WhatsApp.
 */
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

  // Notificar painel do usuário
  _io.to(`ticket_${ticketId}`).emit('ticket_encerrado', { ticketId });

  // Confirmar ao agente
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

  // Se tinha agente, notificar no WhatsApp
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

/**
 * Conecta ao evento messages.upsert do Baileys.
 * Chama este handler no teu index.js / baileys.js:
 *
 *   const bridge = require('./services/supportBridge');
 *   sock.ev.on('messages.upsert', bridge.handleIncomingWhatsApp);
 */
async function handleIncomingWhatsApp({ messages, type }) {
  if (type !== 'notify') return false;
  let handled = false;

  for (const msg of messages) {
    if (!msg.message || msg.key.fromMe) continue;

    const jid = msg.key.remoteJid;
    const phone = jid.replace('@s.whatsapp.net', '');
    if (!AGENT_NUMBERS.includes(phone)) continue;
    handled = true;

    // 🔘 Resposta de botão
    const btnResponse = msg.message.buttonsResponseMessage;
    if (btnResponse) {
      const id = btnResponse.selectedButtonId;
      const agentName = await getAgentName(phone);

      if (id === 'aceitar_suporte') {
        // pega o primeiro ticket em espera
        const tickets = await database.query(
          `SELECT id FROM support_tickets WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 1`
        );
        if (tickets.length > 0) {
          await agentClaimTicket({ ticketId: tickets[0].id, agentPhone: phone, agentName });
        }
        continue;
      }

      if (id === 'recusar_suporte') {
        // pega o ticket ativo do agente
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

    // 📝 Fallback em texto (ACEITAR/ENCERRAR)
    const text = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''
    ).trim();

    if (!text) continue;

    const acceptMatch = text.match(/^ACEITAR\s+(\d+)$/i);
    const closeMatch  = text.match(/^ENCERRAR\s+(\d+)$/i);

    if (acceptMatch) {
      const ticketId = parseInt(acceptMatch[1]);
      const agentName = await getAgentName(phone);
      await agentClaimTicket({ ticketId, agentPhone: phone, agentName });
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
  // Podes ter uma tabela de agentes ou usar env
  // Por ora, tenta buscar no banco pelo phone
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