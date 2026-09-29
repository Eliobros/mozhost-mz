// services/whatsappCloud.js
// Cliente da WhatsApp Cloud API (API oficial da Meta / Graph API) + webhook.
// Requer Node 18+ (fetch global).
//
// .env necessário:
//   WHATSAPP_ACCESS_TOKEN=     (token permanente de utilizador do sistema; aceita também WHATSAPP_TOKEN)
//   WHATSAPP_PHONE_NUMBER_ID=
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN=  (texto qualquer, o MESMO que pões no painel da Meta)
//   WHATSAPP_APP_SECRET=       (opcional — App Secret da app Meta, para validar assinatura do webhook)
//   WHATSAPP_GRAPH_VERSION=    (opcional, padrão v25.0)
//
// Templates (opcional):
//   WHATSAPP_VERIFY_TEMPLATE_NAME=   template aprovado para mensagens iniciadas pelo bot
//   WHATSAPP_VERIFY_TEMPLATE_LANG=   idioma do template (padrão pt_PT)
//
// Consumidores deste módulo:
//   - routes/whatsapp-webhook.js → createWebhookRouter, extractMessages, maybeSendPendingVerificationCode
//   - routes/whatsapp.js         → checkWhatsAppConnection, sendWhatsAppMessage, initializeWhatsApp...
//   - services/supportBridge.js  → isConfigured, sendText, sendTemplate, WINDOW_CLOSED_CODE
//   - routes/auth.js             → sendVerificationCode (via shim utils/whatsapp.js)
//   - utils/notification-manager.js → sendWhatsAppMessage (via shim utils/whatsapp.js)
//   - services/whatsappBotService.js → createSender (objeto "sock" compatível com Baileys)

const crypto = require('crypto');

const API_VERSION =
  process.env.WHATSAPP_GRAPH_VERSION || process.env.WHATSAPP_API_VERSION || 'v25.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN =
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

const MESSAGES_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

// Erros da Meta quando a mensagem é iniciada pelo NEGÓCIO fora da janela de 24h
// (neste caso é obrigatório usar um template aprovado ou o destinatário iniciar a conversa).
const POLICY_ERROR_CODES = [131047, 131026, 132000, 131042, 131056];

// Erro devolvido quando tentas enviar texto livre fora da janela de 24h
const WINDOW_CLOSED_CODE = 131047;

function isConfigured() {
  return Boolean(TOKEN && PHONE_NUMBER_ID);
}

function normalizePhone(phone) {
  if (phone === null || phone === undefined) return '';
  return String(phone).trim().split(/[:@]/)[0].replace(/[^\d]/g, '');
}

/** Link wa.me para o destinatário INICIAR a conversa (abre a janela de 24h). */
function buildWaLink(phone, text) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const qs = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${p}${qs}`;
}

async function callApi(payload) {
  const res = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const e = data.error || {};
    const err = new Error(e.message || `HTTP ${res.status}`);
    err.code = e.code;
    err.details = e.error_data?.details;
    throw err;
  }
  return data;
}

// Variáveis de template não aceitam \n, \t nem 4+ espaços seguidos, e não podem ser vazias.
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
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'text',
    text: { body: String(body).slice(0, 4096), preview_url: false },
  });
}

/**
 * Template aprovado.
 * params:  { nome: 'Joao', ... }  → variáveis NOMEADAS (templates novos da Meta)
 *          ['Joao', '12']         → variáveis POSICIONAIS {{1}}, {{2}} (templates antigos)
 * buttonPayloads: ['aceitar:12', 'recusar:12']  (na ordem dos botões)
 */
async function sendTemplate({ to, name, language = 'pt_BR', params = {}, buttonPayloads = [] }) {
  const components = [];

  const bodyParams = Array.isArray(params)
    ? params.map((value) => ({ type: 'text', text: sanitizeParam(value) }))
    : Object.entries(params).map(([key, value]) => ({
        type: 'text',
        parameter_name: key,
        text: sanitizeParam(value),
      }));

  if (bodyParams.length > 0) {
    components.push({ type: 'body', parameters: bodyParams });
  }

  buttonPayloads.forEach((payload, index) => {
    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: String(index),
      parameters: [{ type: 'payload', payload: String(payload) }],
    });
  });

  return callApi({
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'template',
    template: { name, language: { code: language }, components },
  });
}

// ─── Envio com fallback de janela 24h / template ─────────────────────────────

/**
 * 📩 Envia mensagem de texto simples. Compatível com o contrato antigo:
 * devolve os dados da Meta em sucesso e `null` em falha (não lança erro),
 * para não quebrar send-test / notificações / bot.
 * Se a janela de 24h estiver fechada, tenta o template aprovado
 * (WHATSAPP_VERIFY_TEMPLATE_NAME) ou registra o link wa.me no log.
 */
async function sendWhatsAppMessage({ phone, message }) {
  if (!isConfigured()) {
    console.warn(`⚠️ WhatsApp Cloud API não configurada — mensagem ignorada (para ${phone})`);
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
    if (isPolicy && process.env.WHATSAPP_VERIFY_TEMPLATE_NAME) {
      console.log(`🟡 Política 24h (erro ${err.code}) — tentando template para ${to}`);
      try {
        return await sendTemplate({
          to,
          name: process.env.WHATSAPP_VERIFY_TEMPLATE_NAME,
          language: process.env.WHATSAPP_VERIFY_TEMPLATE_LANG || 'pt_PT',
          params: [String(message)],
        });
      } catch (tErr) {
        console.error('❌ Erro ao enviar template:', tErr.message, tErr.details || '');
      }
    } else if (isPolicy) {
      console.warn(
        `🟡 Política 24h (erro ${err.code}) — mensagem NÃO enviada para ${to}. ` +
        `Peça ao destinatário para iniciar a conversa: ${buildWaLink(to)}`
      );
    } else {
      console.error('❌ Erro ao enviar WhatsApp:', err.message, err.details || '');
    }
    return null;
  }
}

// Mensagem de verificação de conta por WhatsApp (contrato do antigo utils/whatsapp.js).
function formatVerificationMessage(code) {
  return `🔐 MozHost — Seu código de verificação: ${code}. Válido por 15 minutos.`;
}

/**
 * 📩 Envia código de verificação de conta com resultado estruturado (contrato
 * usado por routes/auth.js e pelo frontend):
 *   { ok: true, method: 'text' | 'template' }
 *   { ok: false, reason: 'policy_24h', metaCode, waLink }  → frontend mostra o link wa.me
 *   { ok: false, reason: 'not_configured' | 'no_phone' | 'error', metaCode? }
 */
async function sendVerificationCode({ phone, code }) {
  if (!isConfigured()) {
    console.warn(`⚠️ WhatsApp Cloud API não configurada — código não enviado (para ${phone})`);
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
    if (isPolicy && process.env.WHATSAPP_VERIFY_TEMPLATE_NAME) {
      console.log(`🟡 Política 24h (erro ${err.code}) — tentando template de verificação para ${to}`);
      try {
        await sendTemplate({
          to,
          name: process.env.WHATSAPP_VERIFY_TEMPLATE_NAME,
          language: process.env.WHATSAPP_VERIFY_TEMPLATE_LANG || 'pt_PT',
          params: [message],
        });
        return { ok: true, method: 'template' };
      } catch (tErr) {
        console.error('❌ Erro ao enviar template de verificação:', tErr.message, tErr.details || '');
      }
    }
    if (isPolicy) {
      console.warn(
        `🟡 Política 24h (erro ${err.code}) — código de verificação NÃO enviado para ${to}. ` +
        `Usuário precisa iniciar a conversa: ${buildWaLink(to, 'verificar')}`
      );
      return { ok: false, reason: 'policy_24h', metaCode: err.code, waLink: buildWaLink(to, 'verificar') };
    }
    console.error('❌ Erro ao enviar código de verificação:', err.message, err.details || '');
    return { ok: false, reason: 'error', metaCode: err.code || null };
  }
}

// 📩 Envia botões interativos de suporte (aceitar/recusar ticket) — formato Baileys-compat.
async function sendSupportOptions(phone) {
  if (!isConfigured()) {
    console.warn(`⚠️ WhatsApp Cloud API não configurada — opções de suporte ignoradas (para ${phone})`);
    return null;
  }
  const to = normalizePhone(phone);
  if (!to) {
    console.warn('⚠️ Número de telefone vazio — opções de suporte ignoradas');
    return null;
  }
  try {
    return await callApi({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Deseja assumir este ticket de suporte?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'aceitar_suporte', title: 'Aceitar' } },
            { type: 'reply', reply: { id: 'recusar_suporte', title: 'Recusar' } },
          ],
        },
      },
    });
  } catch (err) {
    console.error('❌ Erro ao enviar botões de suporte:', err.message);
    return null;
  }
}

// ─── Sender compatível com o padrão Baileys (sock.sendMessage(jid, { text })) ──
// Permite que whatsappBotService continue funcionando SEM alterações.
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
// No Cloud API não existe sessão local nem QR Code: "conectado" significa que
// o token e o Phone Number ID estão configurados.

function checkWhatsAppConnection() {
  return isConfigured();
}

async function initializeWhatsApp() {
  if (!isConfigured()) {
    console.warn(
      '⚠️ WhatsApp Cloud API NÃO configurada.\n' +
      '   Adicione no .env: WHATSAPP_ACCESS_TOKEN (ou WHATSAPP_TOKEN) e WHATSAPP_PHONE_NUMBER_ID'
    );
    return null;
  }
  console.log(
    `✅ WhatsApp Cloud API configurada (Phone Number ID: ${PHONE_NUMBER_ID}, Graph ${API_VERSION})`
  );
  return createSender();
}

function startWhatsApp() {
  initializeWhatsApp().catch((err) =>
    console.error('❌ Erro ao inicializar WhatsApp:', err.message)
  );
}

function disconnectWhatsApp() {
  console.log('ℹ️ WhatsApp Cloud API não possui sessão local para desconectar.');
}

function getCurrentQR() {
  return null; // Cloud API não usa QR Code
}

// ─── Código de verificação pendente (usuário iniciou a conversa) ──────────────
// Quando o usuário manda a 1ª mensagem ao número do bot, a janela de 24h abre e
// o código de verificação que estava pendente no banco é enviado automaticamente.
// Retorna true se um código pendente foi encontrado e enviado.
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

  // Aceita tanto country_code + phone quanto o phone sozinho (caso o usuário já
  // tenha registrado o número com o DDI incluído no campo phone).
  const matchesPhone = (row) => {
    const combined = normalizePhone(String(row.country_code || '') + String(row.phone || ''));
    const alone = normalizePhone(String(row.phone || ''));
    return combined === to || (alone && alone === to);
  };

  for (const row of rows) {
    if (!matchesPhone(row)) continue; // não é o dono deste número

    // Código expirado → não envia (o usuário deve pedir reenvio no site)
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
    // Se falhou (ex.: janela fechada mesmo assim), tenta o próximo usuário
    return false;
  }

  return false;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

function verifySignature(rawBody, header) {
  if (!header) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody || '').digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Normaliza o payload da Meta em eventos simples:
 * { id, from, name, type, text, payload }
 *  - text     → mensagem de texto normal
 *  - payload  → toque em botão de template (type "button") ou interativo
 */
function extractMessages(body) {
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      const names = {};
      for (const c of value.contacts || []) names[c.wa_id] = c.profile?.name || null;

      for (const m of value.messages || []) {
        const ev = {
          id: m.id,
          from: m.from, // número em dígitos (ex: 258840075123), sem LID
          name: names[m.from] || null,
          type: m.type,
          text: null,
          payload: null,
        };

        if (m.type === 'text') {
          ev.text = m.text?.body || null;
        } else if (m.type === 'button') {
          ev.payload = m.button?.payload || null;
          ev.text = m.button?.text || null;
        } else if (m.type === 'interactive') {
          const r = m.interactive?.button_reply || m.interactive?.list_reply;
          ev.payload = r?.id || null;
          ev.text = r?.title || null;
        }

        out.push(ev);
      }
    }
  }
  return out;
}

// A Meta pode reenviar o mesmo webhook — evita processar duas vezes.
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

/**
 * Router Express do webhook.
 *
 * O body cru para validar a assinatura vem de req.rawBody, capturado pelo
 * verify() do express.json() no server.js — por isso o router pode ser montado
 * DEPOIS do body parser (é a ordem atual do server.js). A assinatura só é
 * validada se WHATSAPP_APP_SECRET estiver configurado (opt-in).
 *
 * onMessage(ev) recebe cada evento normalizado (pode ser async).
 */
function createWebhookRouter(express, onMessage) {
  const router = express.Router();

  // Verificação inicial (a Meta chama uma vez ao configurar o webhook)
  router.get('/', (req, res) => {
    if (
      req.query['hub.mode'] === 'subscribe' &&
      VERIFY_TOKEN &&
      req.query['hub.verify_token'] === VERIFY_TOKEN
    ) {
      console.log('✅ Webhook WhatsApp verificado pela Meta!');
      return res.status(200).send(req.query['hub.challenge']);
    }
    console.warn('⚠️  Verificação de webhook rejeitada (hub.mode / verify_token inválidos)');
    return res.sendStatus(403);
  });

  // Eventos
  router.post('/', (req, res) => {
    // Body cru: rawBody do express.json({ verify }) ou, em fallback, o próprio req.body em Buffer
    const raw = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.rawBody != null ? String(req.rawBody) : '', 'utf8');

    if (APP_SECRET && !verifySignature(raw, req.get('x-hub-signature-256'))) {
      console.warn('⚠️  Webhook WhatsApp com assinatura inválida — ignorado');
      return res.sendStatus(401);
    }

    // Responde já (a Meta reenvia se demorar) e processa depois
    res.sendStatus(200);

    let body;
    try {
      body = Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString('utf8'))
        : req.body || {};
    } catch {
      return;
    }

    for (const ev of extractMessages(body)) {
      if (alreadySeen(ev.id)) continue;
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
