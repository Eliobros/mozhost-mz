// utils/whatsapp.js
// ⚠️ SHIM DE COMPATIBILIDADE — a implementação real vive em services/whatsappCloud.js
// ---------------------------------------------------------------------------
// Este módulo existia quando o backend usava Baileys (WhatsApp Web não oficial)
// e depois uma versão própria da Cloud API. Agora tudo foi centralizado em
// services/whatsappCloud.js. Aqui ficam apenas reexports com as MESMAS
// assinaturas, para que estes consumidores continuem funcionando sem alteração:
//
//   - routes/auth.js                → sendVerificationCode, checkWhatsAppConnection
//   - utils/notification-manager.js → sendWhatsAppMessage
//   - server.js                     → startWhatsApp, disconnectWhatsApp, getWhatsAppSocket
//
// FLUXO DE VERIFICAÇÃO SEM TEMPLATE (empresa ainda não verificada na Meta):
//   1. auth.js tenta enviar o código com sendVerificationCode();
//   2. Se a Meta bloquear (política 24h, erro 131047 e afins), a resposta
//      volta com { reason: 'policy_24h', waLink } → o frontend mostra o link;
//   3. O usuário abre o wa.me e manda a 1ª mensagem → o webhook
//      (routes/whatsapp-webhook.js → maybeSendPendingVerificationCode) encontra
//      o código pendente no banco e o envia automaticamente (janela de 24h aberta).
//
// Configuração (no .env do backend):
//   WHATSAPP_ACCESS_TOKEN          → Token permanente (System User) gerado no painel da Meta
//   WHATSAPP_PHONE_NUMBER_ID       → Phone Number ID do número (WABA)
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN  → Verify token do webhook (o MESMO cadastrado no painel Meta)
//   WHATSAPP_GRAPH_VERSION         → Versão da Graph API (padrão: v25.0)
//   WHATSAPP_VERIFY_TEMPLATE_NAME  → (opcional) Template aprovado p/ mensagens iniciadas pelo bot
//   WHATSAPP_VERIFY_TEMPLATE_LANG  → (opcional) Idioma do template (padrão pt_PT)
require('dotenv').config();

const whatsappCloud = require('../services/whatsappCloud');

module.exports = {
  // Envio
  sendWhatsAppMessage: whatsappCloud.sendWhatsAppMessage,
  sendVerificationCode: whatsappCloud.sendVerificationCode,
  sendSupportOptions: whatsappCloud.sendSupportOptions,
  formatVerificationMessage: whatsappCloud.formatVerificationMessage,
  buildWaLink: whatsappCloud.buildWaLink,
  maybeSendPendingVerificationCode: whatsappCloud.maybeSendPendingVerificationCode,

  // Estado da conexão / ciclo de vida
  sendVerification: whatsappCloud.sendVerificationCode,
  initializeWhatsApp: whatsappCloud.initializeWhatsApp,
  startWhatsApp: whatsappCloud.startWhatsApp,
  getWhatsAppSocket: whatsappCloud.getWhatsAppSocket,
  checkWhatsAppConnection: whatsappCloud.checkWhatsAppConnection,
  getCurrentQR: whatsappCloud.getCurrentQR,
  disconnectWhatsApp: whatsappCloud.disconnectWhatsApp,

  // Webhook (mantidos por compatibilidade — o webhook novo usa routes/whatsapp-webhook.js)
  verifyWebhook: (req, res) => {
    // GET — verificação do webhook chamada pela Meta ao salvar a URL de callback
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const expected =
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && expected && token === expected) {
      console.log('✅ Webhook WhatsApp verificado pela Meta!');
      return res.status(200).send(req.query['hub.challenge']);
    }
    console.warn('⚠️ Verificação de webhook rejeitada (mode / verify_token inválidos)');
    return res.sendStatus(403);
  },
  verifyWebhookSignature: (req) =>
    whatsappCloud.verifySignature(
      Buffer.from(req.rawBody || '', 'utf8'),
      req.headers['x-hub-signature-256']
    ),
  processWebhookEvent: async (req, res) => {
    // Compat legado: processa eventos já parseados pelo express.json.
    // O fluxo novo (supportBridge → verificação pendente → bot) vive em routes/whatsapp-webhook.js.
    res.sendStatus(200);
    try {
      const events = whatsappCloud.extractMessages(req.body || {});
      const supportBridge = require('../services/supportBridge');
      const whatsappBotService = require('../services/whatsappBotService');
      const sender = whatsappCloud.createSender();

      for (const ev of events) {
        const handled = await supportBridge.handleIncomingMessage(ev);
        if (handled) continue;
        if (await whatsappCloud.maybeSendPendingVerificationCode(ev.from)) continue;
        if (ev.type === 'text' && ev.text) {
          const jid = `${whatsappCloud.normalizePhone(ev.from)}@s.whatsapp.net`;
          await whatsappBotService.handleMessage(sender, {
            key: { fromMe: false, remoteJid: jid, participant: jid },
            message: { conversation: ev.text },
          });
        }
      }
    } catch (err) {
      console.error('❌ Erro ao processar webhook WhatsApp:', err.message);
    }
  },
  cloudToBaileysMessage: (cloudMsg) => {
    const jid = `${whatsappCloud.normalizePhone(cloudMsg.from)}@s.whatsapp.net`;
    return {
      key: { fromMe: false, remoteJid: jid, participant: jid, participantPn: jid },
      message: { conversation: cloudMsg.text?.body || '' },
    };
  },
  normalizePhone: whatsappCloud.normalizePhone,
};
