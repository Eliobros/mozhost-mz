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
const express = require('express');
const router = express.Router();
const whatsapp = require('../utils/whatsapp');

// Verificação do webhook (GET)
router.get('/', whatsapp.verifyWebhook);

// Recebimento de mensagens (POST)
router.post('/', (req, res) => {
  // Valida a assinatura X-Hub-Signature-256 (se WHATSAPP_APP_SECRET estiver configurado)
  if (!whatsapp.verifyWebhookSignature(req)) {
    console.warn('⚠️ Webhook WhatsApp rejeitado: assinatura inválida');
    return res.sendStatus(401);
  }
  whatsapp.processWebhookEvent(req, res);
});

module.exports = router;
