// services/supportBridge.js
// Bridge bidirecional: painel do usuário ↔ agente no WhatsApp via API oficial (Cloud API)

const database = require('../models/database');
const wa = require('./whatsappCloud');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let _io = null;

// ─── Agentes (tabela support_agents — geridos no painel admin) ──────────────
// Cache de 30s para não bater no banco a cada mensagem recebida.
const AGENTS_CACHE_TTL_MS = 30_000;
let _agentsCache = { numbers: [], at: 0 };

async function getAgentNumbers() {
  const now = Date.now();
  if (now - _agentsCache.at < AGENTS_CACHE_TTL_MS) return _agentsCache.numbers;
  try {
    const rows = await database.query(
      'SELECT phone FROM support_agents WHERE active = TRUE'
    );
    _agentsCache = {
      numbers: rows.map((r) => normalizePhone(r.phone)).filter(Boolean),
      at: now,
    };
    if (_agentsCache.numbers.length === 0) {
      console.warn(
        '⚠️  Nenhum agente ativo na tabela support_agents. Cadastre no painel admin (Config. Agentes).'
      );
    }
  } catch (err) {
    console.error('❌ Erro ao carregar agentes do banco:', err.message);
    _agentsCache = { numbers: [], at: now }; // evita martelar o banco a cada msg
  }
  return _agentsCache.numbers;
}

/** Chamar após CRUD de agentes no painel para refletir mudanças já no próximo evento. */
function invalidateAgentCache() {
  _agentsCache.at = 0;
}

const NEW_TICKET_TEMPLATE = process.env.WHATSAPP_TEMPLATE_NEW_TICKET || 'alerta_novo_suporte';

// ─── Helpers de normalização de telefone ────────────────────────────────────

/**
 * Normaliza um número cru para apenas dígitos.
 *  - +258 84 007 5123 → 258840075123
 *  - 258840075123@s.whatsapp.net → 258840075123
 */
function normalizePhone(raw) {
  if (raw === null || raw === undefined) return '';
  const before = String(raw).trim().split(/[:@]/)[0];
  return before.replace(/[^\d]/g, '');
}

/**
 * Compara dois números tolerando variações (com/sem código de país).
 *   - 258841234567 vs 258841234567 → match
 *   - 258841234567 vs 841234567    → match (com/sem DDI MZ +258)
 *   - 258841234567 vs 258861234567 → NO match
 */
function sameAgent(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const hasCountry = (n) => n.length >= 11;
  const aHas = hasCountry(na);
  const bHas = hasCountry(nb);

  if (aHas !== bHas) {
    const withCountry = aHas ? na : nb;
    const noCountry = aHas ? nb : na;
    if (noCountry.length >= 8 && noCountry.length <= 10) {
      return withCountry.endsWith(noCountry);
    }
  }

  return false;
}

async function isAgentMessage(phone) {
  const agents = await getAgentNumbers();
  return agents.some((a) => sameAgent(a, phone));
}

/**
 * Envia texto livre a um agente. Só funciona se o agente escreveu para o
 * número do bot nas últimas 24h (janela de atendimento da Meta).
 * Devolve true/false em vez de lançar erro.
 */
async function sendAgent(agentPhone, text) {
  if (!wa.isConfigured()) return false;
  try {
    await wa.sendText(normalizePhone(agentPhone), text);
    return true;
  } catch (err) {
    if (err.code === wa.WINDOW_CLOSED_CODE) {
      console.warn(
        `⚠️  Janela de 24h fechada para o agente ${agentPhone} — texto livre não enviado.`
      );
    } else {
      console.error(`❌ Falha ao enviar msg para agente ${agentPhone}:`, err.message);
    }
    return false;
  }
}

function sentimentFromRating(rating) {
  if (rating >= 5) return 'muito_positivo';
  if (rating === 4) return 'positivo';
  if (rating === 3) return 'neutro';
  if (rating === 2) return 'negativo';
  return 'muito_negativo';
}

const SENTIMENT_LABELS = {
  muito_positivo: '😍 Muito positivo',
  positivo: '😊 Positivo',
  neutro: '😐 Neutro',
  negativo: '😟 Negativo',
  muito_negativo: '😡 Muito negativo',
};

// ─── Init ────────────────────────────────────────────────────────────────────

function init(io) {
  _io = io;
  if (!wa.isConfigured()) {
    console.warn('⚠️  WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID não configurados.');
  }
  // Pré-carrega a lista de agentes (tabela support_agents) só para logar o estado
  getAgentNumbers()
    .then((n) => {
      if (n.length > 0) console.log(`👥 ${n.length} agente(s) ativo(s) no banco:`, n);
    })
    .catch(() => {});
  console.log('✅ SupportBridge iniciado (WhatsApp Cloud API)');
}

// Mantido só por compatibilidade com o código antigo (não faz nada).
function attachSocket() {}

// ─── Criar ticket ─────────────────────────────────────────────────────────────

async function createTicket({ userId, summary, lastMessage, conversationHistory = [] }) {
  const users = await database.query('SELECT id, username, email FROM users WHERE id = ?', [
    userId,
  ]);

  if (users.length === 0) throw new Error('Usuário não encontrado');
  const user = users[0];

  // INSERT atômico: só cria se NÃO existir ticket waiting/active para o usuário.
  const result = await database.query(
    `INSERT INTO support_tickets
       (user_id, status, summary, last_message, conversation_history, created_at)
     SELECT ?, 'waiting', ?, ?, ?, NOW()
     FROM DUAL
     WHERE NOT EXISTS (
       SELECT 1 FROM support_tickets
       WHERE user_id = ? AND status IN ('waiting', 'active')
     )`,
    [userId, summary, lastMessage, JSON.stringify(conversationHistory), userId]
  );

  if (result.affectedRows === 0) {
    const existing = await database.query(
      `SELECT id FROM support_tickets WHERE user_id = ? AND status IN ('waiting','active') LIMIT 1`,
      [userId]
    );
    if (existing.length > 0) {
      console.log(`ℹ️  Ticket já existe para userId ${userId}: #${existing[0].id}`);
      return { ticketId: existing[0].id, userId, alreadyExists: true };
    }
    throw new Error('Não foi possível criar o ticket (conflito). Tente novamente.');
  }

  const ticketId = result.insertId;
  console.log(`🎫 Ticket #${ticketId} criado para ${user.username}`);

  await notifyAgents({ ticketId, user, summary, lastMessage });

  return { ticketId, userId, username: user.username };
}

// ─── Notificar agentes (template com botões Aceitar / Recusar) ───────────────

async function notifyAgents({ ticketId, user, summary, lastMessage }) {
  if (!wa.isConfigured()) {
    console.warn('⚠️  WhatsApp Cloud API não configurada — agentes não notificados');
    return;
  }

  // A Cloud API não tem grupos: o template vai para cada agente individualmente.
  const agents = await getAgentNumbers();
  for (const n of agents) {
    const to = normalizePhone(n);
    try {
      await wa.sendTemplate({
        to,
        name: NEW_TICKET_TEMPLATE,
        language: 'pt_BR',
        params: {
          ticket_number: ticketId,
          username: user.username,
          email: user.email,
          msg: lastMessage || summary,
        },
        buttonPayloads: [`aceitar:${ticketId}`, `recusar:${ticketId}`],
      });
      console.log(`📤 Ticket #${ticketId} notificado para ${to}`);
    } catch (err) {
      console.error(`❌ Falha ao notificar ${to}:`, err.message, err.details || '');
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
    await sendAgent(
      agentPhone,
      `⚠️ O ticket #${ticketId} não está em espera (já foi aceite ou encerrado).`
    );
    return false;
  }

  console.log(`✅ Ticket #${ticketId} aceite por ${agentName} (${agentPhone})`);

  _io.to(`ticket_${ticketId}`).emit('agente_entrou', {
    agentName,
    ticketId,
  });

  await sendAgent(
    agentPhone,
    `✅ *Ticket #${ticketId} aceite!*\n\n` +
      `Agora as mensagens do usuário aparecerão aqui.\n` +
      `Para encerrar a conversa, envie: *!encerrar ${ticketId}*`
  );

  await notifyOtherAgents({ ticketId, agentName, agentPhone });

  return true;
}

// ─── Notificar outros agentes ─────────────────────────────────────────────────

async function notifyOtherAgents({ ticketId, agentName, agentPhone }) {
  const agents = await getAgentNumbers();
  const others = agents.filter((n) => !sameAgent(n, agentPhone));
  for (const n of others) {
    await sendAgent(n, `ℹ️ O ticket #${ticketId} foi aceite por ${agentName}.`);
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

  const delivered = await sendAgent(
    ticket.agent_phone,
    `💬 *[Ticket #${ticketId}] Usuário:*\n${message}`
  );

  return { success: true, delivered };
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

  // INSERT direto para capturar o insertId (cursor do polling incremental do frontend)
  const result = await database.query(
    `INSERT INTO support_messages (ticket_id, sender, agent_name, message, created_at)
     VALUES (?, 'agent', ?, ?, NOW())`,
    [ticketId, agentName || null, message]
  );
  const messageId = result.insertId;

  _io.to(`ticket_${ticketId}`).emit('nova_mensagem', {
    id: messageId,
    message,
    agentName,
    ticketId,
    createdAt: new Date().toISOString(),
  });
}

// ─── Encerrar ticket (pelo agente) ───────────────────────────────────────────

async function closeTicket({ ticketId, agentPhone }) {
  const tickets = await database.query(
    `SELECT id, agent_phone, status FROM support_tickets WHERE id = ?`,
    [ticketId]
  );

  if (tickets.length === 0) {
    await sendAgent(agentPhone, `⚠️ Ticket #${ticketId} não encontrado.`);
    return;
  }

  const t = tickets[0];

  if (t.status === 'closed') {
    await sendAgent(agentPhone, `ℹ️ Ticket #${ticketId} já foi encerrado.`);
    return;
  }

  if (t.status === 'cancelled') {
    await sendAgent(agentPhone, `ℹ️ Ticket #${ticketId} foi cancelado pelo usuário.`);
    return;
  }

  if (t.status === 'waiting') {
    await sendAgent(
      agentPhone,
      `ℹ️ Ticket #${ticketId} ainda está em espera (sem agente). ` +
        `Se quiser assumir: *!aceitar ${ticketId}*`
    );
    return;
  }

  // status === 'active' → só encerra se for o dono
  if (!t.agent_phone || !sameAgent(t.agent_phone, agentPhone)) {
    await sendAgent(
      agentPhone,
      `⚠️ Você não é o agente do ticket #${ticketId}. ` +
        `Se quiser assumir, envie *!aceitar ${ticketId}*.`
    );
    return;
  }

  await database.query(
    `UPDATE support_tickets
     SET status = 'closed', closed_at = NOW()
     WHERE id = ? AND status = 'active'`,
    [ticketId]
  );

  console.log(`🔒 Ticket #${ticketId} encerrado por ${agentPhone}`);

  _io.to(`ticket_${ticketId}`).emit('ticket_encerrado', { ticketId });

  await sendAgent(agentPhone, `✅ Ticket #${ticketId} encerrado com sucesso.`);
}

// ─── Encerrar ticket activo do agente (sem id explícito) ─────────────────────

async function closeOwnActiveTicket(agentPhone) {
  const tickets = await database.query(
    `SELECT id FROM support_tickets WHERE agent_phone = ? AND status = 'active'
     ORDER BY claimed_at DESC LIMIT 1`,
    [agentPhone]
  );
  if (tickets.length === 0) {
    await sendAgent(agentPhone, `ℹ️ Você não tem ticket activo para encerrar.`);
    return;
  }
  await closeTicket({ ticketId: tickets[0].id, agentPhone });
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

  const tickets = await database.query('SELECT agent_phone FROM support_tickets WHERE id = ?', [
    ticketId,
  ]);

  if (tickets[0]?.agent_phone) {
    await sendAgent(tickets[0].agent_phone, `❌ O usuário cancelou o ticket #${ticketId}.`);
  }

  return { success: true };
}

// ─── submitFeedback (avaliação do utilizador) ────────────────────────────────

async function callGeminiSummarize({ rating, text }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false, summary: null, reason: 'no_api_key' };
  }
  if (!text || !text.trim()) {
    return { ok: false, summary: null, reason: 'empty_text' };
  }
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.3, maxOutputTokens: 220 },
    });
    const prompt = `Analisa o seguinte feedback de um cliente sobre o suporte recebido na plataforma MozHost.
Nota: ${rating}/5
Mensagem: ${JSON.stringify(text)}

Devolve EXACTAMENTE este formato (uma linha cada, sem markdown extra):
SUMMARY: <resumo em até 2 frases curtas na mesma língua do cliente>
SENTIMENT: <um dos seguintes: muito_positivo|positivo|neutro|negativo|muito_negativo>`;

    const result = await model.generateContent(prompt);
    const response = (result.response.text() || '').trim();

    let summary = null;
    let sentiment = null;
    const sM = response.match(/SUMMARY:\s*([^\n]+)/i);
    const eM = response.match(/SENTIMENT:\s*([\w_]+)/i);
    if (sM) summary = sM[1].trim().replace(/^["']|["']$/g, '').slice(0, 480);
    if (eM) {
      const allowed = ['muito_positivo', 'positivo', 'neutro', 'negativo', 'muito_negativo'];
      const found = eM[1].toLowerCase();
      sentiment = allowed.find((a) => found.includes(a)) || null;
    }
    return { ok: true, summary, sentiment };
  } catch (err) {
    console.warn('⚠️ Gemini summarize falhou:', err.message);
    return { ok: false, summary: null, reason: err.message };
  }
}

/**
 * Envia a avaliação (nota + resumo + texto) ao agente que encerrou.
 */
async function notifyAgentAboutFeedback({ ticketId, rating, summary, sentiment, feedbackText }) {
  const tickets = await database.query(`SELECT agent_phone FROM support_tickets WHERE id = ?`, [
    ticketId,
  ]);
  const agentPhone = tickets[0]?.agent_phone;
  if (!agentPhone) return;

  const lines = [
    `⭐ *Avaliação do Ticket #${ticketId}*`,
    ``,
    `📊 Nota: *${rating}/5*`,
    `🎭 Sentimento: *${SENTIMENT_LABELS[sentiment] || sentiment}*`,
  ];
  if (summary) {
    lines.push(``);
    lines.push(`📋 *Resumo IA:* ${summary}`);
  }
  if (feedbackText) {
    const truncated =
      String(feedbackText).length > 600 ? String(feedbackText).slice(0, 600) + '…' : feedbackText;
    lines.push(``);
    lines.push(`💬 *Mensagem original:*`);
    lines.push(`"${truncated}"`);
  }
  await sendAgent(agentPhone, lines.join('\n'));
}

/**
 * Submete a avaliação do utilizador para um ticket encerrado.
 * Persiste a nota de forma idempotente e faz o resumo (Gemini) + aviso ao agente em background.
 */
async function submitFeedback({ ticketId, userId, rating, feedbackText }) {
  const r = parseInt(rating, 10);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    throw new Error('Rating inválido (1-5)');
  }

  const text = feedbackText ? String(feedbackText).trim().slice(0, 4000) : '';
  const baseSentiment = sentimentFromRating(r);

  // Idempotência atómica — rating IS NULL garante 1 avaliação por ticket
  const result = await database.query(
    `UPDATE support_tickets
     SET rating = ?, feedback_text = ?, feedback_at = NOW(),
         feedback_sentiment = ?, feedback_summary = NULL
     WHERE id = ? AND user_id = ? AND status = 'closed' AND rating IS NULL`,
    [r, text || null, baseSentiment, ticketId, userId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Ticket já avaliado ou não elegível para avaliação.');
  }

  if (text.length > 0 && process.env.GEMINI_API_KEY) {
    setImmediate(async () => {
      try {
        const ai = await callGeminiSummarize({ rating: r, text });
        const summary = (ai.ok && ai.summary) || null;
        const finalSentiment = (ai.ok && ai.sentiment) || baseSentiment;
        await database.query(
          `UPDATE support_tickets
           SET feedback_summary = ?, feedback_sentiment = ?
           WHERE id = ?`,
          [summary, finalSentiment, ticketId]
        );
        await notifyAgentAboutFeedback({
          ticketId,
          rating: r,
          summary,
          sentiment: finalSentiment,
          feedbackText: text,
        });
      } catch (err) {
        console.error('⚠️ Background feedback error:', err.message);
        try {
          await notifyAgentAboutFeedback({
            ticketId,
            rating: r,
            summary: null,
            sentiment: baseSentiment,
            feedbackText: text,
          });
        } catch {}
      }
    });
  } else if (text.length > 0) {
    notifyAgentAboutFeedback({
      ticketId,
      rating: r,
      summary: null,
      sentiment: baseSentiment,
      feedbackText: text,
    }).catch((err) => console.error('⚠️ Notificação agente:', err.message));
  } else {
    notifyAgentAboutFeedback({
      ticketId,
      rating: r,
      summary: null,
      sentiment: baseSentiment,
      feedbackText: null,
    }).catch((err) => console.error('⚠️ Notificação agente:', err.message));
  }

  return { success: true, rating: r, summary: null, sentiment: baseSentiment };
}

// ─── Handler principal (chamado pelo webhook da Cloud API) ───────────────────

// Comandos de texto: ! opcional, # opcional, espaços à volta.
const ACCEPT_REGEX = /^!?(?:aceitar)\s*(?:#?\s*(\d+))?\s*$/i;
const RECUSE_REGEX = /^!?(?:recusar)\s*(?:#?\s*(\d+))?\s*$/i;
const CLOSE_REGEX = /^!?(?:encerrar)\s*(?:#?\s*(\d+))?\s*$/i;

// Payload dos botões do template: "aceitar:123" / "recusar:123"
const BUTTON_PAYLOAD_REGEX = /^(aceitar|recusar):(\d+)$/i;

/**
 * Recebe um evento normalizado de whatsappCloud.extractMessages():
 * { id, from, name, type, text, payload }
 * Devolve true se a mensagem era de um agente (e foi tratada).
 */
async function handleIncomingMessage(ev) {
  const phone = normalizePhone(ev.from);

  if (!(await isAgentMessage(phone))) return false;

  const agentName = await getAgentName(phone);

  // 🔘 Toque num botão do template
  if (ev.payload) {
    const b = String(ev.payload).match(BUTTON_PAYLOAD_REGEX);
    if (b) {
      const action = b[1].toLowerCase();
      const ticketId = parseInt(b[2], 10);

      if (action === 'aceitar') {
        await agentClaimTicket({ ticketId, agentPhone: phone, agentName });
      } else {
        // "Recusar" só recusa o ticket oferecido — não encerra o ticket activo do agente.
        await sendAgent(phone, `ℹ️ Ticket #${ticketId} recusado. Outro agente pode aceitá-lo.`);
      }
      return true;
    }
  }

  // 📝 Texto — comandos
  const text = (ev.type === 'text' ? ev.text || '' : '').trim();
  if (!text) return true;

  let m;
  if ((m = text.match(ACCEPT_REGEX))) {
    const id = m[1] ? parseInt(m[1], 10) : null;
    if (id) {
      await agentClaimTicket({ ticketId: id, agentPhone: phone, agentName });
    } else {
      const waiting = await database.query(
        `SELECT id FROM support_tickets WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 1`
      );
      if (waiting.length === 0) {
        await sendAgent(phone, `ℹ️ Não há tickets em espera no momento.`);
      } else {
        await agentClaimTicket({ ticketId: waiting[0].id, agentPhone: phone, agentName });
      }
    }
    return true;
  }

  if ((m = text.match(RECUSE_REGEX))) {
    const id = m[1] ? parseInt(m[1], 10) : null;
    await sendAgent(
      phone,
      id
        ? `ℹ️ Ticket #${id} recusado por você. Outro agente pode aceitá-lo.`
        : `ℹ️ Recusa registrada. Você continua com seu ticket ativo (se houver) — use *!encerrar* para fechá-lo.`
    );
    return true;
  }

  if ((m = text.match(CLOSE_REGEX))) {
    const id = m[1] ? parseInt(m[1], 10) : null;
    if (id) {
      await closeTicket({ ticketId: id, agentPhone: phone });
    } else {
      await closeOwnActiveTicket(phone);
    }
    return true;
  }

  // Mensagem normal → encaminhar pro ticket activo do agente
  const activeTickets = await database.query(
    `SELECT id FROM support_tickets WHERE agent_phone = ? AND status = 'active' ORDER BY claimed_at DESC LIMIT 1`,
    [phone]
  );

  if (activeTickets.length > 0) {
    await agentToUser({
      ticketId: activeTickets[0].id,
      agentPhone: phone,
      agentName,
      message: text,
    });
  } else {
    console.warn(
      `⚠️  Msg de agente ${phone} sem ticket ativo e sem comando — ignorada: "${text.slice(0, 50)}"`
    );
  }

  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAgentName(phone) {
  try {
    const agents = await database.query(
      'SELECT agent_name FROM support_agents WHERE phone = ? AND active = TRUE LIMIT 1',
      [phone]
    );
    if (agents[0]?.agent_name) return agents[0].agent_name;

    const digits = normalizePhone(phone);
    return `Agente (${digits.slice(-4)})`;
  } catch {
    return `Agente (${normalizePhone(phone).slice(-4)})`;
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
  closeOwnActiveTicket,
  cancelTicket,
  submitFeedback,
  handleIncomingMessage,
  // utils exportados para testes:
  normalizePhone,
  sameAgent,
  isAgentMessage,
  getAgentNumbers,
  invalidateAgentCache,
};
