const express = require('express');
const router = express.Router();
const whatsapp = require('../utils/whatsapp');

// Verificar status da conexão
router.get('/status', (req, res) => {
  try {
    const isConnected = whatsapp.checkWhatsAppConnection();
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obter QR Code (se disponível)
router.get('/qr', (req, res) => {
  try {
    const qr = whatsapp.getCurrentQR();
    if (qr) {
      res.json({
        success: true,
        qr: qr,
        message: 'QR Code disponível'
      });
    } else {
      res.json({
        success: false,
        message: 'Nenhum QR Code disponível. WhatsApp pode já estar conectado.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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

// Desconectar WhatsApp
router.post('/disconnect', (req, res) => {
  try {
    whatsapp.disconnectWhatsApp();
    res.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reconectar WhatsApp
router.post('/reconnect', async (req, res) => {
  try {
    await whatsapp.initializeWhatsApp();
    res.json({
      success: true,
      message: 'Tentando reconectar ao WhatsApp...'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
