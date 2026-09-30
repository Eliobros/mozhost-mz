// routes/whatsapp-webhook.js
// Webhook da WhatsApp Cloud API (Meta / Graph API)
// Montado em server.js em: /webhook/whatsapp
//
//   GET  → verificação (a Meta chama ao salvar a URL de callback)
//   POST → eventos (mensagens recebidas)
//
// No painel do Meta (WhatsApp > Configuration > Webhook):
//   Callback URL : https://api.mozhost.shop/webhook/whatsapp
//   Verify token : WHATSAPP_WEBHOOK_VERIFY_TOKEN (o MESMO do .env)
//   App secret   : WHATSAPP_APP_SECRET (opcional — valida a assinatura X-Hub-Signature-256)
const express = require('express');
const whatsapp = require('../services/whatsappCloud');
const supportBridge = require('../services/supportBridge');
const whatsappBotService = require('../services/whatsappBotService');

const router = express.Router();

// Sender compatível com Baileys, para o bot de comandos do usuário final
const sender = whatsapp.createSender();

// Converte um evento normalizado do whatsappCloud para o formato que o
// whatsappBotService espera (estrutura compatível com Baileys).
function eventToBaileysMessage(ev) {
  const jid = `${whatsapp.normalizePhone(ev.from)}@s.whatsapp.net`;
  return {
    key: {
      fromMe: false,
      remoteJid: jid,
      participant: jid,
      participantPn: jid,
    },
    message: { conversation: ev.text || '' },
  };
}

// Handler central: recebe cada evento normalizado
// { id, from, name, type, text, payload }
const WA_DEBUG = process.env.WHATSAPP_DEBUG === 'true';

async function onMessage(ev) {
  if (!ev.from) return;

  if (WA_DEBUG) {
    console.log(
      `🐛 Msg recebida: id=${ev.id} de=${ev.from} nome=${ev.name || '?'} tipo=${ev.type} ` +
      `texto=${JSON.stringify(ev.text)} payload=${JSON.stringify(ev.payload)}`
    );
  } else {
    console.log(
      `📩 WhatsApp de ${ev.from} (${ev.name || 'sem nome'}): ` +
      `${ev.payload ? `[botão] ${ev.payload}` : ev.text || `[${ev.type}]`}`
    );
  }

  // 1) SupportBridge primeiro (mensagens/botões dos agentes de suporte).
  //    Devolve true se o remetente era um agente e a mensagem foi tratada.
  const handledBySupport = await supportBridge.handleIncomingMessage(ev);
  if (handledBySupport) {
    console.log(`↪️ Tratada pelo supportBridge (remetente é agente)`);
    return;
  }

  // 2) 🆕 Código de verificação pendente → usuário iniciou a conversa.
  //    A janela de 24h abriu, então o código pode ser enviado sem template.
  if (await whatsapp.maybeSendPendingVerificationCode(ev.from)) {
    console.log(`↪️ Tratada pelo fluxo de verificação (código pendente enviado)`);
    return;
  }

  // 3) Bot de usuário final (comandos !menu, !saldo, etc.)
  if (ev.type === 'text' && ev.text) {
    console.log(`↪️ Encaminhada ao bot de comandos`);
    await whatsappBotService.handleMessage(sender, eventToBaileysMessage(ev));
  }
}

// Router completo (GET verificação + POST eventos, com assinatura e dedupe)
module.exports = whatsapp.createWebhookRouter(express, onMessage);
