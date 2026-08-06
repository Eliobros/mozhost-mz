// utils/whatsapp.js
// 🟢 INTEGRAÇÃO: WhatsApp Cloud API (API OFICIAL da Meta / Graph API)
// ---------------------------------------------------------------------
// Substitui a antiga integração com Baileys (WhatsApp Web não oficial,
// com QR Code). Todas as funções exportadas mantêm a MESMA assinatura
// para que o resto do backend continue funcionando sem alterações:
//   - routes/auth.js  → sendVerificationCode, checkWhatsAppConnection
//   - routes/whatsapp.js → status / qr / send-test / disconnect / reconnect
//   - utils/notification-manager.js → sendWhatsAppMessage
//   - server.js → startWhatsApp, disconnectWhatsApp, getWhatsAppSocket
//
// FLUXO DE VERIFICAÇÃO SEM TEMPLATE (empresa ainda não verificada na Meta):
//   1. auth.js tenta enviar o código com sendVerificationCode();
//   2. Se a Meta bloquear (política 24h, erro 131047 e afins), a resposta
//      volta com { reason: 'policy_24h', waLink } → o frontend mostra o link;
//   3. O usuário abre o wa.me e manda a 1ª mensagem → o webhook
//      (processWebhookEvent → maybeSendPendingVerificationCode) encontra o
//      código pendente no banco e o envia automaticamente (janela de 24h aberta).
//
// Configuração (no .env do backend):
//   WHATSAPP_ACCESS_TOKEN          → Token permanente (System User) gerado no painel da Meta
//   WHATSAPP_PHONE_NUMBER_ID       → Phone Number ID do número (WABA)
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN  → Verify token do webhook (o MESMO cadastrado no painel Meta)
//   WHATSAPP_GRAPH_VERSION         → Versão da Graph API (padrão: v25.0)
//   WHATSAPP_VERIFY_TEMPLATE_NAME  → (opcional) Template aprovado p/ mensagens iniciadas pelo bot
//   WHATSAPP_VERIFY_TEMPLATE_LANG  → (opcional) Idioma do template (padrão pt_MZ)
//
// Webhook: montado em server.js em  /webhook/whatsapp  (ver routes/whatsapp-webhook.js)
//   GET  → verificação de webhook feita pela Meta (hub.mode / hub.verify_token / hub.challenge)
//   POST → recebimento de mensagens
require('dotenv').config();
const axios = require('axios');

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v25.0';

// Erros da Meta quando a mensagem é iniciada pelo NEGÓCIO fora da janela de 24h
// (neste caso é obrigatório usar um template aprovado).
const POLICY_ERROR_CODES = [131047, 131026, 132000, 131042, 131056];

function getConfig() {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  };
}

let connected = false;

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

// ─── POST genérico para a Graph API ───────────────────────────────────────────
async function postMessage(phone, payload) {
  const cfg = getConfig();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`;
  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(phone),
      ...payload
    },
    {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  );
  return res.data;
}

// Envia template aprovado (necessário para mensagens iniciadas pelo negócio,
// ex.: código de verificação de conta para um usuário que ainda não falou com o bot).
async function sendTemplate(phone, templateName, lang, bodyParams) {
  return postMessage(phone, {
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        { type: 'body', parameters: (bodyParams || []).map(p => ({ type: 'text', text: String(p) })) }
      ]
    }
  });
}

// ─── Envio de texto (helper compartilhado) ─────────────────────────────────────
// Tenta enviar texto puro e devolve um resultado estruturado para que o
// chamador consiga DETECTAR o erro de política da janela de 24h (código 131047
// e afins) e decidir o próximo passo (template aprovado ou link wa.me).
//   Retorno: { ok: true, data } | { ok: false, code, errorData }
async function trySendText(phone, message) {
  try {
    const data = await postMessage(phone, {
      type: 'text',
      text: { body: String(message), preview_url: false }
    });
    return { ok: true, data };
  } catch (err) {
    const code = err.response?.data?.error?.code;
    return { ok: false, code, errorData: err.response?.data || null, error: err };
  }
}

// Gera o link wa.me para o usuário INICIAR a conversa (abre a janela de 24h,
// permitindo o envio de texto livre sem template).
function buildWaLink(phone, text) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const qs = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${p}${qs}`;
}

// 📩 Envia mensagem de texto simples (comportamento original preservado: retorna
// null em caso de falha, para não quebrar send-test / bot / notificações).
async function sendWhatsAppMessage({ phone, message }) {
  const cfg = getConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    console.warn(`⚠️ WhatsApp Cloud API não configurada — mensagem ignorada (para ${phone})`);
    return null;
  }
  if (!normalizePhone(phone)) {
    console.warn('⚠️ Número de telefone vazio — mensagem ignorada');
    return null;
  }

  const res = await trySendText(phone, message);
  if (res.ok) return res.data;

  const isPolicy = POLICY_ERROR_CODES.includes(res.code);
  if (isPolicy && process.env.WHATSAPP_VERIFY_TEMPLATE_NAME) {
    // Fora da janela de 24h → tenta o template aprovado
    console.log(`🟡 Política 24h (erro ${res.code}) — tentando template para ${phone}`);
    try {
      return await sendTemplate(
        phone,
        process.env.WHATSAPP_VERIFY_TEMPLATE_NAME,
        process.env.WHATSAPP_VERIFY_TEMPLATE_LANG || 'pt_PT',
        [String(message)]
      );
    } catch (tErr) {
      console.error('❌ Erro ao enviar template:', tErr.response?.data || tErr.message);
    }
  } else if (isPolicy) {
    // Detecção do erro de política 24h SEM template configurado → o usuário
    // precisa iniciar a conversa. Logamos o link wa.me para diagnóstico.
    console.warn(
      `🟡 Política 24h (erro ${res.code}) — mensagem NÃO enviada para ${phone}. ` +
      `Peça ao destinatário para iniciar a conversa: ${buildWaLink(phone)}`
    );
  } else {
    console.error('❌ Erro ao enviar WhatsApp:', res.errorData || res.error?.message);
  }
  return null;
}

// 📩 Envia código de verificação de conta com resultado estruturado para o
// auth.js poder avisar o frontend quando for necessário o usuário iniciar a
// conversa (link wa.me).
//   Retorno: { ok: true, method: 'text' | 'template' }
//          | { ok: false, reason: 'policy_24h', metaCode, waLink }
//          | { ok: false, reason: 'not_configured' | 'no_phone' | 'error', metaCode? }
async function sendVerificationCode({ phone, code }) {
  const cfg = getConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    console.warn(`⚠️ WhatsApp Cloud API não configurada — código não enviado (para ${phone})`);
    return { ok: false, reason: 'not_configured' };
  }
  const normalized = normalizePhone(phone);
  if (!normalized) {
    console.warn('⚠️ Número de telefone vazio — código não enviado');
    return { ok: false, reason: 'no_phone' };
  }

  const message = formatVerificationMessage(code);
  const res = await trySendText(phone, message);
  if (res.ok) return { ok: true, method: 'text' };

  const isPolicy = POLICY_ERROR_CODES.includes(res.code);
  if (isPolicy && process.env.WHATSAPP_VERIFY_TEMPLATE_NAME) {
    // Janela fechada → tenta template aprovado
    console.log(`🟡 Política 24h (erro ${res.code}) — tentando template de verificação para ${phone}`);
    try {
      await sendTemplate(
        phone,
        process.env.WHATSAPP_VERIFY_TEMPLATE_NAME,
        process.env.WHATSAPP_VERIFY_TEMPLATE_LANG || 'pt_PT',
        [String(message)]
      );
      return { ok: true, method: 'template' };
    } catch (tErr) {
      console.error('❌ Erro ao enviar template de verificação:', tErr.response?.data || tErr.message);
    }
  }

  if (isPolicy) {
    // SEM template → o código só pode ser enviado depois que o usuário mandar
    // a primeira mensagem. Devolvemos o link wa.me para o frontend.
    console.warn(
      `🟡 Política 24h (erro ${res.code}) — código de verificação NÃO enviado para ${normalized}. ` +
      `Usuário precisa iniciar a conversa: ${buildWaLink(normalized, 'verificar')}`
    );
    return { ok: false, reason: 'policy_24h', metaCode: res.code, waLink: buildWaLink(normalized, 'verificar') };
  }

  console.error('❌ Erro ao enviar código de verificação:', res.errorData || res.error?.message);
  return { ok: false, reason: 'error', metaCode: res.code || null };
}

// 📩 Envia botões de suporte (aceitar/recusar ticket) — botões interativos do Cloud API
async function sendSupportOptions(phone) {
  const cfg = getConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    console.warn(`⚠️ WhatsApp Cloud API não configurada — opções de suporte ignoradas (para ${phone})`);
    return null;
  }
  if (!normalizePhone(phone)) {
    console.warn('⚠️ Número de telefone vazio — opções de suporte ignoradas');
    return null;
  }
  try {
    return await postMessage(phone, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Deseja assumir este ticket de suporte?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'aceitar_suporte', title: 'Aceitar' } },
            { type: 'reply', reply: { id: 'recusar_suporte', title: 'Recusar' } }
          ]
        }
      }
    });
  } catch (err) {
    console.error('❌ Erro ao enviar botões de suporte:', err.response?.data || err.message);
    return null;
  }
}

// ─── Sender compatível com o padrão Baileys (sock.sendMessage(jid, { text })) ──
// Cria um objeto "sock" falso que fala com a Cloud API. Isso permite que
// whatsappBotService e supportBridge continuem funcionando SEM alterações.
function createSender() {
  return {
    sendMessage: async (jid, content = {}) => {
      const phone = String(jid || '').split(/[:@]/)[0].replace(/[^\d]/g, '');
      if (!phone) return null;
      if (Array.isArray(content.buttons) && content.buttons.length > 0) {
        return sendSupportOptions(phone);
      }
      if (content.text !== undefined) {
        return sendWhatsAppMessage({ phone, message: content.text });
      }
      return null;
    }
  };
}

const sender = createSender();

// ─── Estado da conexão ────────────────────────────────────────────────────────
// No Cloud API não existe sessão local nem QR Code: "conectado" significa que
// o token e o Phone Number ID estão configurados.

async function initializeWhatsApp() {
  const cfg = getConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    connected = false;
    console.warn(
      '⚠️ WhatsApp Cloud API NÃO configurada.\n' +
      '   Adicione no .env: WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID'
    );
    return null;
  }
  connected = true;
  console.log(
    `✅ WhatsApp Cloud API configurada (Phone Number ID: ${cfg.phoneNumberId}, Graph ${GRAPH_VERSION})`
  );
  return sender;
}

function startWhatsApp() {
  initializeWhatsApp()
    .then(() => {
      // Liga o sender ao supportBridge (mesmo papel do antigo attachSocket do Baileys)
      const supportBridge = require('../services/supportBridge');
      supportBridge.attachSocket(sender);
    })
    .catch(err => console.error('❌ Erro ao inicializar WhatsApp:', err.message));
}

function disconnectWhatsApp() {
  console.log('ℹ️ WhatsApp Cloud API não possui sessão local para desconectar.');
}

function checkWhatsAppConnection() {
  return connected;
}

function getCurrentQR() {
  return null; // Cloud API não usa QR Code
}

// ─── Formatação de mensagens ──────────────────────────────────────────────────

// Mensagem de verificação de conta por WhatsApp (usada em routes/auth.js).
// Implementa o formatVerificationMessage que era importado mas não existia.
function formatVerificationMessage(code) {
  return `🔐 MozHost — Seu código de verificação: ${code}. Válido por 15 minutos.`;
}

// ─── Webhook (verificação + eventos) ──────────────────────────────────────────

// GET — verificação do webhook chamada pela Meta ao salvar a URL de callback
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = getConfig().verifyToken;

  if (mode === 'subscribe' && token && expected && token === expected) {
    console.log('✅ Webhook WhatsApp verificado pela Meta!');
    return res.status(200).send(challenge);
  }
  console.warn(
    `⚠️ Verificação de webhook rejeitada (mode=${mode || 'ausente'}, verify_token=${token ? 'fornecido' : 'ausente'})`
  );
  return res.sendStatus(403);
}

// Converte uma mensagem do Cloud API para o formato que o bot/supportBridge
// esperam (estrutura compatível com Baileys). Mantém toda a lógica intacta.
function cloudToBaileysMessage(cloudMsg) {
  const from = String(cloudMsg.from || '').replace(/[^\d]/g, '');
  const jid = `${from}@s.whatsapp.net`;
  const text = cloudMsg.text?.body || '';

  const msg = {
    key: {
      fromMe: false,
      remoteJid: jid,
      participant: jid,
      participantPn: jid,
      remoteJidAlt: jid
    },
    message: { conversation: text }
  };

  // Resposta de botão interativo (ex.: aceitar/recusar ticket de suporte)
  if (cloudMsg.type === 'interactive' && cloudMsg.interactive?.button_reply) {
    msg.message.buttonsResponseMessage = {
      selectedButtonId: cloudMsg.interactive.button_reply.id
    };
  }

  return msg;
}

// Verifica a assinatura X-Hub-Signature-256 do webhook (recomendado em produção).
// Só valida se WHATSAPP_APP_SECRET estiver configurado no .env (opt-in).
function verifyWebhookSignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // sem secret configurado → não valida (compatibilidade)

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const crypto = require('crypto');
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Envio automático de código de verificação pendente ───────────────────────
// Quando o usuário inicia a conversa (janela de 24h aberta), enviamos o código
// de verificação de conta que estava pendente — sem depender de template.
// Retorna true se um código pendente foi encontrado e enviado.
async function maybeSendPendingVerificationCode(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

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
    return combined === normalized || (alone && alone === normalized);
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

    console.log(`📱 Webhook: código de verificação pendente encontrado para ${normalized} — enviando...`);
    const result = await sendVerificationCode({ phone: normalized, code });
    if (result.ok) {
      console.log(`✅ Código de verificação enviado automaticamente para ${normalized} (via ${result.method})`);
      return true;
    }
    // Se falhou (ex.: janela fechada mesmo assim), tenta o próximo usuário
    return false;
  }

  return false;
}

// POST — recebe eventos (mensagens) e processa exatamente como o antigo fluxo Baileys
async function processWebhookEvent(req, res) {
  // Responde 200 imediatamente para a Meta não reenviar o evento
  res.sendStatus(200);

  try {
    const body = req.body || {};
    const entries = body.entry || [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];
        if (messages.length === 0) continue; // ignora status/delivery receipts

        const baileysMessages = messages.map(cloudToBaileysMessage);

        // 1) SupportBridge primeiro (mensagens de agentes de suporte)
        const supportBridge = require('../services/supportBridge');
        const handled = await supportBridge.handleIncomingWhatsApp({
          messages: baileysMessages,
          type: 'notify'
        });
        if (handled) continue;

        // 1.5) 🆕 Código de verificação pendente → usuário iniciou a conversa.
        // A janela de 24h está aberta, então podemos enviar SEM template.
        // Interrompe após o 1º envio para não duplicar o código num batch.
        let sentVerification = false;
        for (const cloudMsg of messages) {
          const senderPhone = String(cloudMsg.from || '').replace(/[^\d]/g, '');
          if (!senderPhone) continue;
          if (await maybeSendPendingVerificationCode(senderPhone)) {
            sentVerification = true;
            break;
          }
        }
        if (sentVerification) continue;

        // 2) Bot de usuário final (comandos !menu, !saldo, etc.)
        const whatsappBotService = require('../services/whatsappBotService');
        for (const msg of baileysMessages) {
          if (!msg.message || !msg.message.conversation) continue;
          await whatsappBotService.handleMessage(sender, msg);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro ao processar webhook WhatsApp:', err.message);
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendVerificationCode,
  sendSupportOptions,
  initializeWhatsApp,
  startWhatsApp,
  getWhatsAppSocket: () => sender,
  checkWhatsAppConnection,
  getCurrentQR,
  disconnectWhatsApp,
  formatVerificationMessage,
  buildWaLink,
  maybeSendPendingVerificationCode,
  verifyWebhook,
  verifyWebhookSignature,
  processWebhookEvent,
  cloudToBaileysMessage,
  normalizePhone,
};
