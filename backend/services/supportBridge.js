// services/supportBridge.js
// Bridge bidirecional: painel do usuário ↔ agente no WhatsApp via Baileys

const database = require('../models/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { jidDecode } = require('baileys');

// ─── Referências injetadas no init() ────────────────────────────────────────
let _io = null;
let _waSocket = null;

const AGENT_NUMBERS = (process.env.SUPPORT_AGENT_NUMBERS || '').split(',').filter(Boolean);
const AGENT_GROUP_JID = process.env.SUPPORT_AGENT_GROUP_JID || null;

// ─── Helpers de normalização de telefone ────────────────────────────────────

/**
 * Normaliza um JID/número cru para apenas dígitos.
 *  - 258840075123@s.whatsapp.net  → 258840075123
 *  - 258840075123:42@c.us          → 258840075123
 *  - 123456@lid                    → 123456
 *  - +258 84 007 5123              → 258840075123
 */
function normalizePhone(raw) {
  if (raw === null || raw === undefined) return '';
  const before = String(raw).trim().split(/[:@]/)[0];
  return before.replace(/[^\d]/g, '');
}

/**
 * Extrai o número de telefone real do autor de uma mensagem do Baileys,
 * ignorando JIDs LID-only (cujo `user` é um identificador e NÃO o telefone).
 *
 * Ordem de prioridade:
 *   1. msg.key.participantPn  → PN real do participante (se disponível)
 *   2. msg.key.participant    → JID do participante (PN ou LID)
 *   3. msg.key.remoteJid      → JID do chat 1-1
 *
 * Só considera candidatos cujo `server` é `s.whatsapp.net` ou `c.us`
 * (que indicam JID baseado em número de telefone). Candidatos LID
 * (`server === 'lid'`) são ignorados nesta etapa, porque o `user`
 * nesses JIDs é o LID em si, não o telefone — compará-lo com
 * SUPPORT_AGENT_NUMBERS produziria falsos negativos.
 *
 * Se nenhum candidato tiver o PN, faz fallback para normalizePhone,
 * preservando o comportamento anterior.
 */
function extractAgentPhone(msg) {
  const candidates = [
    msg?.key?.remoteJidAlt,    // ← PV com @lid: número real aqui
    msg?.key?.participantPn,   // ← grupos: PN real do participante
    msg?.key?.participant,     // ← grupos: JID do participante
    msg?.key?.remoteJid,       // ← fallback geral
  ];

  for (const c of candidates) {
    if (!c) continue;
    try {
      const decoded = typeof jidDecode === 'function' ? jidDecode(c) : null;
      if (!decoded) continue;
      if (decoded.server !== 's.whatsapp.net' && decoded.server !== 'c.us') continue;
      const digits = String(decoded.user || '').replace(/[^\d]/g, '');
      if (digits.length >= 8) return digits;
    } catch {
      // candidato mal-formado — ignora e tenta o próximo
    }
  }

  // Fallback: comportamento antigo (usado se nenhum candidato tiver PN).
  for (const c of candidates) {
    if (!c) continue;
    const d = normalizePhone(c);
    if (d) return d;
  }
  return '';
}

/**
 * Compara dois números tolerando variações (com/sem código de país).
 *
 * Casos contemplados:
 *   - 258841234567 vs 258841234567 → match (exact)
 *   - 258841234567 vs 841234567    → match (com/sem DDI MZ +258)
 *   - 258841234567 vs 258861234567 → NO match (pessoas diferentes)
 *   - 841234567 vs 258861234567    → NO match
 */
function sameAgent(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const hasCountry = (n) => n.length >= 11; // DDI + DDD + 9 dígitos
  const aHas = hasCountry(na);
  const bHas = hasCountry(nb);

  // Caso onde só um dos lados tem DDI: emparelha últimos N dígitos do que
  // tem DDI com o número curto. Evita falsos positivos entre números
  // moçambicanos que partilham só os últimos 8.
  if (aHas !== bHas) {
    const withCountry = aHas ? na : nb;
    const noCountry    = aHas ? nb : na;
    if (noCountry.length >= 8 && noCountry.length <= 10) {
      return withCountry.endsWith(noCountry);
    }
  }

  return false;
}

function isAgentMessage(phone) {
  if (AGENT_NUMBERS.length === 0) {
    console.warn('⚠️  SUPPORT_AGENT_NUMBERS vazio — nenhum número será reconhecido como agente.');
//    console.log("Mensagem completa:", JSON.stringify(msg, null, 2));
    return false;
  }
  return AGENT_NUMBERS.some(a => sameAgent(a, phone));
}

/**
 * Envia uma mensagem para um agente (jid = phone@s.whatsapp.net).
 */
async function sendAgent(agentPhone, text) {
  if (!_waSocket) return;
  try {
    const jid = `${normalizePhone(agentPhone)}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, { text });
  } catch (err) {
    console.error(`❌ Falha ao enviar msg para agente ${agentPhone}:`, err.message);
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

function init(io, waSocket) {
  _io = io;
  _waSocket = waSocket;
  if (AGENT_NUMBERS.length === 0) {
    console.warn(
      '⚠️  SUPPORT_AGENT_NUMBERS não configurado.\n' +
      '   Nenhum número WhatsApp será reconhecido como agente.\n' +
      '   Defina no .env: SUPPORT_AGENT_NUMBERS=258840075123,258840075124'
    );
  } else {
    console.log(`👥 ${AGENT_NUMBERS.length} agente(s) configurado(s):`, AGENT_NUMBERS);
  }
  console.log('✅ SupportBridge iniciado');
}

function attachSocket(waSocket) {
  _waSocket = waSocket;
  console.log('🔄 SupportBridge: socket Baileys actualizado');
}

// ─── Criar ticket ─────────────────────────────────────────────────────────────

async function createTicket({ userId, summary, lastMessage, conversationHistory = [] }) {
  const users = await database.query(
    'SELECT id, username, email FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) throw new Error('Usuário não encontrado');
  const user = users[0];

  // INSERT atômico: só cria se NÃO existir ticket waiting/active para o
  // usuário. Elimina a corrida (TOCTOU) entre o SELECT e o INSERT anteriores,
  // que podia gerar tickets duplicados em requisições simultâneas.
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
    `Para aceitar:   *!aceitar ${ticketId}*\n` +
    `               (ou *!aceitar* para o próximo em fila)\n` +
    `Para recusar:   *!recusar ${ticketId}*\n` +
    `Para encerrar (se for seu): *!encerrar ${ticketId}*`;

  const targets = AGENT_GROUP_JID
    ? [AGENT_GROUP_JID]
    : AGENT_NUMBERS.map(n => `${normalizePhone(n)}@s.whatsapp.net`);

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
    await sendAgent(
      agentPhone,
      `⚠️ O ticket #${ticketId} não está em espera (já foi aceite ou encerrado).`
    );
    return false;
  }

  console.log(`✅ Ticket #${ticketId} aceite por ${agentName} (${agentPhone})`);

  _io.to(`ticket_${ticketId}`).emit('agente_entrou', {
    agentName,
    ticketId
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
  if (!_waSocket) return;

  const others = AGENT_NUMBERS.filter(n => !sameAgent(n, agentPhone));
  for (const n of others) {
    try {
      const jid = `${normalizePhone(n)}@s.whatsapp.net`;
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
    const jid = `${normalizePhone(ticket.agent_phone)}@s.whatsapp.net`;
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

  // INSERT direto (em vez de saveChatMessage) para capturar o insertId e
  // enviá-lo no socket event — o frontend usa este id como cursor do
  // polling incremental de fallback (GET /messages?after=<id>).
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
  // Validação detalhada para dar mensagens úteis ao agente
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

  const tickets = await database.query(
    'SELECT agent_phone FROM support_tickets WHERE id = ?',
    [ticketId]
  );

  if (tickets[0]?.agent_phone && _waSocket) {
    const jid = `${normalizePhone(tickets[0].agent_phone)}@s.whatsapp.net`;
    await _waSocket.sendMessage(jid, {
      text: `❌ O usuário cancelou o ticket #${ticketId}.`
    });
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
      sentiment = allowed.find(a => found.includes(a)) || null;
    }
    return { ok: true, summary, sentiment };
  } catch (err) {
    console.warn('⚠️ Gemini summarize falhou:', err.message);
    return { ok: false, summary: null, reason: err.message };
  }
}

/**
 * Envia a avaliação (nota + resumo + texto) ao agente (WhatsApp) que encerrou.
 */
async function notifyAgentAboutFeedback({ ticketId, rating, summary, sentiment, feedbackText }) {
  const tickets = await database.query(
    `SELECT agent_phone FROM support_tickets WHERE id = ?`,
    [ticketId]
  );
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
    const truncated = String(feedbackText).length > 600
      ? String(feedbackText).slice(0, 600) + '…'
      : feedbackText;
    lines.push(``);
    lines.push(`💬 *Mensagem original:*`);
    lines.push(`"${truncated}"`);
  }
  await sendAgent(agentPhone, lines.join('\n'));
}

/**
 * Submete a avaliação do utilizador para um ticket encerrado.
 *
 * Fluxo:
 *   1) Persiste rating + feedback_text atomicamente (idempotente via rating IS NULL).
 *   2) Persiste sentiment básico (derivado da nota).
 *   3) Retorna 200 imediatamente ao front.
 *   4) Em background: resume com Gemini (se houver texto) e notifica o agente.
 *
 * Isto evita que o utilizador fique 1-5s à espera do Gemini.
 */
async function submitFeedback({ ticketId, userId, rating, feedbackText }) {
  const r = parseInt(rating, 10);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    throw new Error('Rating inválido (1-5)');
  }

  const text = feedbackText ? String(feedbackText).trim().slice(0, 4000) : '';
  const baseSentiment = sentimentFromRating(r);

  // 1) Idempotência atomic — rating IS NULL garante 1 avaliação por ticket
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

  // 2) Resposta imediata ao cliente (latência ~50ms).
  //    O resumo e a notificação ao agente acontecem em background.
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
        // Notifica o agente mesmo sem resumo
        try {
          await notifyAgentAboutFeedback({
            ticketId, rating: r, summary: null,
            sentiment: baseSentiment, feedbackText: text,
          });
        } catch {}
      }
    });
  } else if (text.length > 0) {
    // Texto presente mas sem GEMINI_API_KEY — manda o texto bruto ao agente
    notifyAgentAboutFeedback({
      ticketId, rating: r, summary: null,
      sentiment: baseSentiment, feedbackText: text,
    }).catch(err => console.error('⚠️ Notificação agente:', err.message));
  } else {
    // Só nota, sem comentário — notifica com a nota pura
    notifyAgentAboutFeedback({
      ticketId, rating: r, summary: null,
      sentiment: baseSentiment, feedbackText: null,
    }).catch(err => console.error('⚠️ Notificação agente:', err.message));
  }

  return { success: true, rating: r, summary: null, sentiment: baseSentiment };
}

// ─── Handler principal do Baileys ─────────────────────────────────────────────

// Regex dos comandos: aceitam ! opcional, prefixo # opcional, espaços à volta.
// O /i cobre aceitar/ACEITAR/Aceitar. Captura o id (opcional) no grupo 1.
const ACCEPT_REGEX = /^!?(?:aceitar)\s*(?:#?\s*(\d+))?\s*$/i;
const RECUSE_REGEX = /^!?(?:recusar)\s*(?:#?\s*(\d+))?\s*$/i;
const CLOSE_REGEX  = /^!?(?:encerrar)\s*(?:#?\s*(\d+))?\s*$/i;

async function handleIncomingWhatsApp({ messages, type }) {
  if (type !== 'notify') return false;
  let handled = false;

  for (const msg of messages) {
    if (!msg.message || msg.key.fromMe) continue;

    const jid = msg.key.remoteJid;
    const senderJid = msg.key.participantPn || msg.key.participant || jid;
    // prioritiza o phone real (PN) e ignora JIDs LID-only
    const phone = extractAgentPhone(msg);

    if (AGENT_NUMBERS.length > 0) {
      console.log(
        '📞 Msg de:', senderJid,
        '| participantPn:', msg.key.participantPn || '(vazio)',
        '| participant:  ', msg.key.participant || '(vazio)',
        '| phone extraído:', msg.key.remoteJidAlt || '[ vazio]'
      );
//      console.log("Mensagem completa:", JSON.stringify(msg, null, 2));
    }

    if (!isAgentMessage(phone)) continue;
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
        } else {
          await sendAgent(phone, `ℹ️ Não há tickets em espera no momento.`);
        }
        continue;
      }

      if (id === 'recusar_suporte') {
        // "Recusar" apenas recusa o ticket oferecido — NÃO deve encerrar o
        // ticket ativo do agente (isso era um bug: podia fechar conversas em
        // andamento por engano). Outro agente pode aceitar o ticket.
        await sendAgent(phone, `ℹ️ Ticket recusado. Outro agente pode aceitá-lo.`);
        continue;
      }
    }

    // 📝 Texto — comandos
    const text = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''
    ).trim();

    if (!text) continue;

    const agentName = await getAgentName(phone);

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
      continue;
    }

    if ((m = text.match(RECUSE_REGEX))) {
      const id = m[1] ? parseInt(m[1], 10) : null;
      await sendAgent(
        phone,
        id
          ? `ℹ️ Ticket #${id} recusado por você. Outro agente pode aceitá-lo.`
          : `ℹ️ Recusa registrada. Você continua com seu ticket ativo (se houver) — use *!encerrar* para fechá-lo.`
      );
      continue;
    }

    if ((m = text.match(CLOSE_REGEX))) {
      const id = m[1] ? parseInt(m[1], 10) : null;
      if (id) {
        await closeTicket({ ticketId: id, agentPhone: phone });
      } else {
        await closeOwnActiveTicket(phone);
      }
      continue;
    }

    // Mensagem normal → encaminhar pro ticket activo do agente
    const activeTickets = await database.query(
      `SELECT id FROM support_tickets WHERE agent_phone = ? AND status = 'active' ORDER BY claimed_at DESC LIMIT 1`,
      [phone]
    );

    if (activeTickets.length > 0) {
      const ticketId = activeTickets[0].id;
      await agentToUser({ ticketId, agentPhone: phone, agentName, message: text });
    }
  }

  return handled;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAgentName(phone) {
  try {
    const agents = await database.query(
      'SELECT agent_name FROM support_agents WHERE phone = ? AND active = TRUE LIMIT 1',
      [phone]
    );
    if (agents[0]?.agent_name) return agents[0].agent_name;

    // fallback: usar últimos 4 dígitos do número
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
  handleIncomingWhatsApp,
  // utils exported for tests:
  normalizePhone,
  extractAgentPhone,
  sameAgent,
  isAgentMessage,
};
