// services/whatsappTwilio.js
// Cliente do WhatsApp via Twilio (API oficial, sandbox ou número próprio) + webhook.
// Mesmos exports do whatsappCloud.js — o resto do backend não precisa mudar.
// Requer Node 18+ (fetch global).
//
// .env necessário:
//   TWILIO_ACCOUNT_SID=
//   TWILIO_AUTH_TOKEN=
//   TWILIO_WHATSAPP_FROM=whatsapp:+17372508034   (número do sandbox; confira na tela da Twilio)
//
// .env opcional:
//   TWILIO_SUPPORT_CONTENT_SID=   (HX..., template Quick Reply Aceitar/Recusar)
//   TWILIO_VERIFY_CONTENT_SID=    (HX..., template para mensagens iniciadas pelo bot)
//   TWILIO_WEBHOOK_URL=           (URL pública EXATA do webhook, para validar assinatura)
//   TWILIO_VALIDATE_SIGNATURE=true
//   WHATSAPP_DEBUG=true

const crypto = require('crypto');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = (() => {
  const f = process.env.TWILIO_WHATSAPP_FROM;
  if (!f) return '';
  return String(f).startsWith('whatsapp:') ? f : `whatsapp:+${String(f).replace(/\D/g, '')}`;
})();
const SUPPORT_CONTENT_SID = process.env.TWILIO_SUPPORT_CONTENT_SID;
const VERIFY_CONTENT_SID = process.env.TWILIO_VERIFY_CONTENT_SID;
const WEBHOOK_URL = process.env.TWILIO_WEBHOOK_URL;
const VALIDATE_SIGNATURE = process.env.TWILIO_VALIDATE_SIGNATURE === 'true';

const MESSAGES_URL = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;

// 63016 = texto livre fora da janela de 24h; 63015 = destinatário não fez "join" no sandbox.
// (confirme os códigos nos logs da Twilio na primeira falha)
const WINDOW_CLOSED_CODE = 63016;
const POLICY_ERROR_CODES = [63016, 63015];

function isConfigured() {
  return Boolean(ACCOUNT_SID && AUTH_TOKEN && FROM);
}

function normalizePhone(phone) {
  if (phone === null || phone === undefined) return '';
  return String(phone)
    .trim()
    .replace(/^whatsapp:/i, '')
    .split(/[:@]/)[0]
    .replace(/[^\d]/g, '');
}

function toWa(phone) {
  return `whatsapp:+${normalizePhone(phone)}`;
}

/** Link wa.me para o usuário iniciar a conversa COM O BOT (abre a janela de 24h). */
function buildWaLink(_phone, text) {
  const bot = normalizePhone(FROM);
  if (!bot) return null;
  const qs = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${bot}${qs}`;
}

async function callApi(params) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.append(k, String(v));
  }
  const res = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.code = data.code;
    err.details = data.more_info;
    throw err;
  }
  return data;
}

function sanitizeParam(value, max = 300) {
  const s = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {4,}/g, '   ')
    .trim()
    .slice(0, max);
  return s || '-';
}

/** Texto livre (só funciona dentro da janela de 24h). */
async function sendText(to, body) {
  return callApi({
    From: FROM,
    To: toWa(to),
    Body: String(body).slice(0, 1600),
  });
}

/**
 * Template de conteúdo da Twilio (Content Template Builder).
 * name = Content SID (HX...).
 * params: array → {{1}}, {{2}}...  |  objeto → chaves usadas como estão.
 * buttonPayloads é ignorado: na Twilio o ID de cada botão é definido no template.
 */
async function sendTemplate({ to, name, params = {} }) {
  const vars = Array.isArray(params)
    ? Object.fromEntries(params.map((v, i) => [String(i + 1), sanitizeParam(v)]))
    : Object.fromEntries(Object.entries(params).map(([k, v]) => [k, sanitizeParam(v)]));

  return callApi({
    From: FROM,
    To: toWa(to),
    ContentSid: name,
    ContentVariables: Object.keys(vars).length ? JSON.stringify(vars) : undefined,
  });
}

// ─── Envio com fallback de janela 24h / template ─────────────────────────────

async function sendWhatsAppMessage({ phone, message }) {
  if (!isConfigured()) {
    console.warn(`⚠️ Twilio WhatsApp não configurado — mensagem ignorada (para ${phone})`);
    return null;
  }
  const to = normalizePhone(phone);
  if (!to) {
    console.warn('⚠️ Número de telefone vazio — mensagem ignorada');
    return null;
  }

  try {
    return await sendText(to, message);
  } catch (err) {
    const isPolicy = POLICY_ERROR_CODES.includes(err.code);
    if (isPolicy && VERIFY_CONTENT_SID) {
      console.log(`🕐 Política 24h (erro ${err.code}) — tentando template para ${to}`);
      try {
        return await sendTemplate({ to, name: VERIFY_CONTENT_SID, params: [String(message)] });
      } catch (tErr) {
        console.error('❌ Erro ao enviar template:', tErr.message, tErr.details || '');
      }
    } else if (isPolicy) {
      console.warn(
        `🕐 Política 24h/sandbox (erro ${err.code}) — mensagem NÃO enviada para ${to}. ` +
        `O destinatário precisa escrever para o bot: ${buildWaLink(to)}`
      );
    } else {
      console.error('❌ Erro ao enviar WhatsApp:', err.message, err.details || '');
    }
    return null;
  }
}

function formatVerificationMessage(code) {
  return `🔐 MozHost — Seu código de verificação: ${code}. Válido por 15 minutos.`;
}

async function sendVerificationCode({ phone, code }) {
  if (!isConfigured()) {
    console.warn(`⚠️ Twilio WhatsApp não configurado — código não enviado (para ${phone})`);
    return { ok: false, reason: 'not_configured' };
  }
  const to = normalizePhone(phone);
  if (!to) {
    console.warn('⚠️ Número de telefone vazio — código não enviado');
    return { ok: false, reason: 'no_phone' };
  }

  const message = formatVerificationMessage(code);
  try {
    await sendText(to, message);
    return { ok: true, method: 'text' };
  } catch (err) {
    const isPolicy = POLICY_ERROR_CODES.includes(err.code);
    if (isPolicy && VERIFY_CONTENT_SID) {
      console.log(`🕐 Política 24h (erro ${err.code}) — tentando template de verificação para ${to}`);
      try {
        await sendTemplate({ to, name: VERIFY_CONTENT_SID, params: [message] });
        return { ok: true, method: 'template' };
      } catch (tErr) {
        console.error('❌ Erro ao enviar template de verificação:', tErr.message, tErr.details || '');
      }
    }
    if (isPolicy) {
      console.warn(
        `🕐 Política 24h/sandbox (erro ${err.code}) — código NÃO enviado para ${to}. ` +
        `Usuário precisa escrever para o bot: ${buildWaLink(to, 'verificar')}`
      );
      return { ok: false, reason: 'policy_24h', metaCode: err.code, waLink: buildWaLink(to, 'verificar') };
    }
    console.error('❌ Erro ao enviar código de verificação:', err.message, err.details || '');
    return { ok: false, reason: 'error', metaCode: err.code || null };
  }
}

// Botões de suporte (Aceitar/Recusar).
// 1) Com TWILIO_SUPPORT_CONTENT_SID: template Quick Reply (IDs: aceitar_suporte / recusar_suporte).
// 2) Fallback: texto pedindo para responder ACEITAR ou RECUSAR (o webhook converte em payload).
async function sendSupportOptions(phone) {
  if (!isConfigured()) {
    console.warn(`⚠️ Twilio WhatsApp não configurado — opções de suporte ignoradas (para ${phone})`);
    return null;
  }
  const to = normalizePhone(phone);
  if (!to) {
    console.warn('⚠️ Número de telefone vazio — opções de suporte ignoradas');
    return null;
  }

  if (SUPPORT_CONTENT_SID) {
    try {
      return await callApi({ From: FROM, To: toWa(to), ContentSid: SUPPORT_CONTENT_SID });
    } catch (err) {
      console.error('❌ Erro ao enviar botões (Quick Reply):', err.message, '— usando texto');
    }
  }

  try {
    return await sendText(
      to,
      'Deseja assumir este ticket de suporte?\nResponda ACEITAR ou RECUSAR.'
    );
  } catch (err) {
    console.error('❌ Erro ao enviar opções de suporte:', err.message);
    return null;
  }
}

// Sender compatível com o padrão Baileys (sock.sendMessage(jid, { text }))
function createSender() {
  return {
    sendMessage: async (jid, content = {}) => {
      const phone = normalizePhone(jid);
      if (!phone) return null;
      if (Array.isArray(content.buttons) && content.buttons.length > 0) {
        return sendSupportOptions(phone);
      }
      if (content.text !== undefined) {
        return sendWhatsAppMessage({ phone, message: content.text });
      }
      return null;
    },
  };
}

// ─── Estado da conexão ────────────────────────────────────────────────────────

function checkWhatsAppConnection() {
  return isConfigured();
}

async function initializeWhatsApp() {
  if (!isConfigured()) {
    console.warn(
      '⚠️ Twilio WhatsApp NÃO configurado.\n' +
      '   Adicione no .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM'
    );
    return null;
  }
  console.log(`✅ Twilio WhatsApp configurado (From: ${FROM})`);
  return createSender();
}

function startWhatsApp() {
  initializeWhatsApp().catch((err) =>
    console.error('❌ Erro ao inicializar WhatsApp:', err.message)
  );
}

function disconnectWhatsApp() {
  console.log('ℹ️ Twilio WhatsApp não possui sessão local para desconectar.');
}

function getCurrentQR() {
  return null;
}

// ─── Código de verificação pendente (usuário iniciou a conversa) ──────────────

async function maybeSendPendingVerificationCode(phone) {
  const to = normalizePhone(phone);
  if (!to) return false;

  const database = require('../models/database');

  let rows;
  try {
    rows = await database.query(
      `SELECT country_code, phone, whatsapp_verification_code, whatsapp_verification_expires
       FROM users
       WHERE whatsapp_verified = 0
         AND whatsapp_verification_code IS NOT NULL
         AND whatsapp_verification_code <> ''`
    );
  } catch (err) {
    console.error('❌ Erro ao buscar códigos de verificação pendentes:', err.message);
    return false;
  }

  const matchesPhone = (row) => {
    const combined = normalizePhone(String(row.country_code || '') + String(row.phone || ''));
    const alone = normalizePhone(String(row.phone || ''));
    return combined === to || (alone && alone === to);
  };

  for (const row of rows) {
    if (!matchesPhone(row)) continue;

    if (row.whatsapp_verification_expires) {
      const expires = new Date(row.whatsapp_verification_expires);
      if (expires < new Date()) continue;
    }

    const code = String(row.whatsapp_verification_code || '');
    if (!code) continue;

    console.log(`📱 Webhook: código de verificação pendente encontrado para ${to} — enviando...`);
    const result = await sendVerificationCode({ phone: to, code });
    if (result.ok) {
      console.log(`✅ Código de verificação enviado automaticamente para ${to} (via ${result.method})`);
      return true;
    }
    return false;
  }

  return false;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

/** Valida X-Twilio-Signature (HMAC-SHA1 da URL + parâmetros ordenados). */
function verifySignature(url, params, header) {
  if (!header || !AUTH_TOKEN) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
  const expected = crypto.createHmac('sha1', AUTH_TOKEN).update(data, 'utf8').digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Normaliza o payload da Twilio (form-urlencoded) em eventos simples:
 * { id, from, name, type, text, payload }
 */
function extractMessages(body) {
  if (!body || !body.MessageSid) return [];
  // Status callbacks (entregue/lido) não têm texto nem botão
  if (body.MessageStatus && !body.Body && !body.ButtonPayload) return [];

  const from = normalizePhone(body.From);
  if (!from) return [];

  let payload = body.ButtonPayload || null;
  const text = body.ButtonText || body.Body || null;
  const type = payload ? 'button' : 'text';

  // Fallback sem botões: o agente digita ACEITAR / RECUSAR
  if (!payload && text) {
    const t = text.trim().toLowerCase();
    if (t === 'aceitar') payload = 'aceitar_suporte';
    else if (t === 'recusar') payload = 'recusar_suporte';
  }

  return [
    {
      id: body.MessageSid,
      from,
      name: body.ProfileName || null,
      type,
      text,
      payload,
    },
  ];
}

// A Twilio pode reenviar o mesmo webhook — evita processar duas vezes.
const seenIds = new Set();
function alreadySeen(id) {
  if (!id) return false;
  if (seenIds.has(id)) return true;
  seenIds.add(id);
  if (seenIds.size > 5000) {
    seenIds.delete(seenIds.values().next().value);
  }
  return false;
}

function createWebhookRouter(express, onMessage) {
  const router = express.Router();

  // A Twilio envia application/x-www-form-urlencoded
  router.use(express.urlencoded({ extended: false }));

  // Teste rápido no navegador
  router.get('/', (_req, res) => res.status(200).send('ok'));

  router.post('/', (req, res) => {
    const body = req.body || {};

    if (VALIDATE_SIGNATURE && WEBHOOK_URL) {
      if (!verifySignature(WEBHOOK_URL, body, req.get('x-twilio-signature'))) {
        console.warn('⚠️  Webhook Twilio com assinatura inválida — ignorado');
        return res.sendStatus(403);
      }
    }

    // Responde já (TwiML vazio) e processa depois
    res.status(200).type('text/xml').send('<Response></Response>');

    if (process.env.WHATSAPP_DEBUG === 'true') {
      console.log('🐛 Payload completo da Twilio:', JSON.stringify(body));
    }

    const events = extractMessages(body);
    if (events.length > 0) {
      console.log(`📥 Webhook WhatsApp: ${events.length} mensagem(ns) recebida(s)`);
    }

    for (const ev of events) {
      if (alreadySeen(ev.id)) {
        if (process.env.WHATSAPP_DEBUG === 'true') console.log(`🔁 Evento duplicado ignorado: ${ev.id}`);
        continue;
      }
      Promise.resolve(onMessage(ev)).catch((err) =>
        console.error('❌ Erro ao processar msg WhatsApp:', err.message)
      );
    }
  });

  return router;
}

module.exports = {
  // Configuração / estado
  isConfigured,
  checkWhatsAppConnection,
  initializeWhatsApp,
  startWhatsApp,
  disconnectWhatsApp,
  getCurrentQR,
  getWhatsAppSocket: () => createSender(),
  // Envio
  sendText,
  sendTemplate,
  sendWhatsAppMessage,
  sendVerificationCode,
  sendSupportOptions,
  createSender,
  formatVerificationMessage,
  // Utilitários
  normalizePhone,
  buildWaLink,
  POLICY_ERROR_CODES,
  WINDOW_CLOSED_CODE,
  // Webhook
  createWebhookRouter,
  extractMessages,
  maybeSendPendingVerificationCode,
  verifySignature,
};
