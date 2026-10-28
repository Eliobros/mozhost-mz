// services/whatsappEvolution.js
// Provedor WhatsApp via Evolution API (Baileys, não oficial).
// Mesma interface do whatsappMeta.js, para o resto do backend não mudar.
// Requer Node 18+ (fetch global).
//
// .env necessário:
//   WHATSAPP_PROVIDER=evolution
//   EVOLUTION_API_URL=http://localhost:8080     (endereço da Evolution visto pelo backend)
//   EVOLUTION_API_KEY=                          (o AUTHENTICATION_API_KEY do docker-compose)
//   EVOLUTION_INSTANCE=mozhost                  (nome da instância)
//   EVOLUTION_WEBHOOK_SECRET=                   (o mesmo valor do header x-webhook-secret no webhook/set)

const crypto = require('crypto');

const BASE_URL = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'mozhost';
const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

// Sem janela de 24h no Baileys, mas mantemos as constantes por compatibilidade.
const POLICY_ERROR_CODES = [];
const WINDOW_CLOSED_CODE = 131047;

let connected = false; // estado em cache (checkWhatsAppConnection é síncrono)

function isConfigured() {
  return Boolean(API_KEY && INSTANCE);
}

function normalizePhone(phone) {
  if (phone === null || phone === undefined) return '';
  return String(phone).trim().split(/[:@]/)[0].replace(/[^\d]/g, '');
}

function buildWaLink(phone, text) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const qs = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${p}${qs}`;
}

async function callApi(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data?.response?.message?.[0]?.text || data?.message || `HTTP ${res.status}`
    );
    err.code = res.status;
    err.details = JSON.stringify(data).slice(0, 300);
    throw err;
  }
  return data;
}

// ─── Envio ───────────────────────────────────────────────────────────────────

async function sendText(to, body) {
  return callApi(`/message/sendText/${INSTANCE}`, {
    body: { number: normalizePhone(to), text: String(body).slice(0, 4096) },
  });
}

const SUPPORT_OPTIONS_TEXT =
  'Deseja assumir este ticket de suporte?\n\nResponda *1* para Aceitar ou *2* para Recusar.';

/**
 * Baileys não tem templates. Envia texto simples com os parâmetros.
 * Se vierem buttonPayloads, acrescenta as instruções de resposta 1/2.
 * AJUSTE se o seu supportBridge espera outro texto.
 */
async function sendTemplate({ to, params = {}, buttonPayloads = [] }) {
  const values = Array.isArray(params) ? params : Object.values(params);
  let text = values.map((v) => String(v ?? '').trim()).filter(Boolean).join('\n');
  if (buttonPayloads.length > 0) {
    text += '\n\nResponda *1* para Aceitar ou *2* para Recusar.';
  }
  return sendText(to, text || '-');
}

async function sendWhatsAppMessage({ phone, message }) {
  if (!isConfigured()) {
    console.warn(`⚠️ Evolution API não configurada — mensagem ignorada (para ${phone})`);
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
    console.error('❌ Erro ao enviar WhatsApp (Evolution):', err.message, err.details || '');
    return null;
  }
}

function formatVerificationMessage(code) {
  return `🔐 MozHost — Seu código de verificação: ${code}. Válido por 15 minutos.`;
}

async function sendVerificationCode({ phone, code }) {
  if (!isConfigured()) return { ok: false, reason: 'not_configured' };
  const to = normalizePhone(phone);
  if (!to) return { ok: false, reason: 'no_phone' };
  try {
    await sendText(to, formatVerificationMessage(code));
    return { ok: true, method: 'text' };
  } catch (err) {
    console.error('❌ Erro ao enviar código de verificação (Evolution):', err.message, err.details || '');
    return { ok: false, reason: 'error', metaCode: err.code || null };
  }
}

// Botões não são confiáveis no Baileys: usa texto com resposta 1/2.
async function sendSupportOptions(phone) {
  if (!isConfigured()) return null;
  const to = normalizePhone(phone);
  if (!to) return null;
  try {
    return await sendText(to, SUPPORT_OPTIONS_TEXT);
  } catch (err) {
    console.error('❌ Erro ao enviar opções de suporte (Evolution):', err.message);
    return null;
  }
}

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

// ─── Estado da conexão ───────────────────────────────────────────────────────

async function refreshConnection() {
  if (!isConfigured()) {
    connected = false;
    return false;
  }
  try {
    const data = await callApi(`/instance/connectionState/${INSTANCE}`, { method: 'GET' });
    connected = (data?.instance?.state || data?.state) === 'open';
  } catch (err) {
    connected = false;
  }
  return connected;
}

function checkWhatsAppConnection() {
  return connected;
}

async function initializeWhatsApp() {
  if (!isConfigured()) {
    console.warn('⚠️ Evolution API NÃO configurada. Defina EVOLUTION_API_KEY e EVOLUTION_INSTANCE no .env');
    return null;
  }
  await refreshConnection();
  console.log(
    `${connected ? '✅' : '⚠️'} Evolution API (${BASE_URL}, instância ${INSTANCE}): ` +
      (connected ? 'conectada' : 'instância NÃO conectada (escaneie o QR em /manager)')
  );
  const timer = setInterval(refreshConnection, 30000);
  timer.unref?.();
  return createSender();
}

function startWhatsApp() {
  initializeWhatsApp().catch((err) =>
    console.error('❌ Erro ao inicializar WhatsApp (Evolution):', err.message)
  );
}

function disconnectWhatsApp() {
  console.log('ℹ️ Para desconectar, use o /manager da Evolution (logout da instância).');
}

function getCurrentQR() {
  return null; // use o /manager da Evolution
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

function secretOk(req) {
  if (!WEBHOOK_SECRET) return true; // sem segredo configurado, não valida
  const got = Buffer.from(String(req.get('x-webhook-secret') || ''));
  const want = Buffer.from(WEBHOOK_SECRET);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function normalizeEvent(name) {
  return String(name || '').toLowerCase().replace(/_/g, '.');
}

/**
 * Normaliza o payload da Evolution em eventos simples (mesmo formato do whatsappMeta):
 * { id, from, name, type, text, payload }
 * Respostas "1"/"aceitar" e "2"/"recusar" viram payload aceitar_suporte / recusar_suporte.
 */
function extractMessages(body) {
  const out = [];
  if (normalizeEvent(body?.event) !== 'messages.upsert') return out;

  const items = Array.isArray(body.data) ? body.data : [body.data];
  for (const m of items) {
    if (!m || !m.key || m.key.fromMe) continue;

    let jid = m.key.remoteJid || '';
    if (jid.endsWith('@g.us')) continue; // ignora grupos
    if (jid.endsWith('@lid')) {
      // contas novas usam LID; o número real vem em campos alternativos
      jid = m.key.remoteJidAlt || m.key.senderPn || m.senderPn || '';
      if (!jid) {
        console.warn('⚠️ Mensagem com LID sem número real — ignorada:', m.key.id);
        continue;
      }
    }

    const msg = m.message || {};
    const text =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.buttonsResponseMessage?.selectedDisplayText ||
      msg.listResponseMessage?.title ||
      null;

    let payload =
      msg.buttonsResponseMessage?.selectedButtonId ||
      msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
      null;

    if (!payload && text) {
      const t = text.trim().toLowerCase();
      if (t === '1' || t === 'aceitar') payload = 'aceitar_suporte';
      else if (t === '2' || t === 'recusar') payload = 'recusar_suporte';
    }

    out.push({
      id: m.key.id,
      from: normalizePhone(jid),
      name: m.pushName || null,
      type: payload ? 'interactive' : 'text',
      text,
      payload,
    });
  }
  return out;
}

const seenIds = new Set();
function alreadySeen(id) {
  if (!id) return false;
  if (seenIds.has(id)) return true;
  seenIds.add(id);
  if (seenIds.size > 5000) seenIds.delete(seenIds.values().next().value);
  return false;
}

/**
 * Router do webhook. Mesma assinatura do whatsappMeta: createWebhookRouter(express, onMessage).
 * A Evolution só faz POST (sem verificação com hub.challenge).
 */
function createWebhookRouter(express, onMessage) {
  const router = express.Router();

  router.get('/', (req, res) => res.status(200).send('ok'));

  router.post(['/', '/:event'], (req, res) => {
    if (!secretOk(req)) {
      console.warn('⚠️  Webhook Evolution com segredo inválido — ignorado');
      return res.sendStatus(401);
    }
    res.sendStatus(200);

    let body;
    try {
      body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body || {};
    } catch {
      return;
    }

    if (process.env.WHATSAPP_DEBUG === 'true') {
      console.log('🐛 Payload Evolution:', JSON.stringify(body));
    }

    const events = extractMessages(body);
    if (events.length > 0) {
      console.log(`📥 Webhook Evolution: ${events.length} mensagem(ns) recebida(s)`);
    }

    for (const ev of events) {
      if (alreadySeen(ev.id)) continue;
      Promise.resolve(onMessage(ev)).catch((err) =>
        console.error('❌ Erro ao processar msg WhatsApp:', err.message)
      );
    }
  });

  return router;
}

// ─── Código de verificação pendente (igual ao whatsappMeta) ──────────────────

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
    if (row.whatsapp_verification_expires && new Date(row.whatsapp_verification_expires) < new Date()) {
      continue;
    }
    const code = String(row.whatsapp_verification_code || '');
    if (!code) continue;

    const result = await sendVerificationCode({ phone: to, code });
    if (result.ok) {
      console.log(`✅ Código de verificação enviado para ${to}`);
      return true;
    }
    return false;
  }
  return false;
}

module.exports = {
  isConfigured,
  checkWhatsAppConnection,
  initializeWhatsApp,
  startWhatsApp,
  disconnectWhatsApp,
  getCurrentQR,
  getWhatsAppSocket: () => createSender(),
  sendText,
  sendTemplate,
  sendWhatsAppMessage,
  sendVerificationCode,
  sendSupportOptions,
  createSender,
  formatVerificationMessage,
  normalizePhone,
  buildWaLink,
  POLICY_ERROR_CODES,
  WINDOW_CLOSED_CODE,
  createWebhookRouter,
  extractMessages,
  maybeSendPendingVerificationCode,
  verifySignature: () => true,
};
