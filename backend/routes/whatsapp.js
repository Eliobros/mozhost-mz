const express = require('express');
const router = express.Router();
const whatsapp = require('../utils/whatsapp');

// Verificar status da conexão (Cloud API: configurado com token + Phone Number ID)
router.get('/status', (req, res) => {
  try {
    const isConnected = whatsapp.checkWhatsAppConnection();
    res.json({
      success: true,
      connected: isConnected,
      provider: 'cloud-api',
      message: isConnected
        ? 'WhatsApp Cloud API configurada e ativa'
        : 'WhatsApp Cloud API não configurada (verifique WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID no .env)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// QR Code NÃO é usado na Cloud API (não existe sessão local)
router.get('/qr', (req, res) => {
  res.json({
    success: false,
    qr: null,
    message: 'QR Code não é usado na API oficial do WhatsApp (Cloud API). Configure o webhook no painel da Meta.'
  });
});

// Enviar mensagem de teste
router.post('/send-test', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Telefone e mensagem são obrigatórios'
      });
    }

    const result = await whatsapp.sendWhatsAppMessage({ phone, message });

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Falha ao enviar mensagem. Verifique a configuração da Cloud API (token, Phone Number ID) e os logs do servidor.'
      });
    }

    res.json({
      success: true,
      result,
      message: 'Mensagem enviada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Desconectar: no Cloud API não há sessão local para desconectar
router.post('/disconnect', (req, res) => {
  try {
    whatsapp.disconnectWhatsApp();
    res.json({
      success: true,
      message: 'A Cloud API não possui sessão local para desconectar. Para pausar o bot, desative o webhook no painel da Meta.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reconectar: apenas revalida a configuração
router.post('/reconnect', async (req, res) => {
  try {
    await whatsapp.initializeWhatsApp();
    res.json({
      success: true,
      message: 'Configuração da Cloud API revalidada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
