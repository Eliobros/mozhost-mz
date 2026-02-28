// routes/ai.js
// Rota da IA MozHost - Chat com Gemini + Function Calling

const express = require('express');
const authMiddleware = require('../middleware/auth');
const mozhostAi = require('../services/mozhostAiService');

const router = express.Router();

// POST /api/ai/chat - Enviar mensagem para a IA
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Mensagem muito longa (máximo 5000 caracteres)' });
    }

    const result = await mozhostAi.chat(userId, message);

    if (!result.success) {
      return res.status(503).json({ error: result.error });
    }

    res.json({
      success: true,
      response: result.response,
      functionCalls: result.functionCalls
    });

  } catch (error) {
    console.error('❌ Erro na rota AI:', error.message);
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

// POST /api/ai/reset - Resetar conversa
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    mozhostAi.resetChat(userId);
    res.json({ success: true, message: 'Conversa resetada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao resetar conversa' });
  }
});

// GET /api/ai/status - Status da IA
router.get('/status', (req, res) => {
  res.json({
    enabled: mozhostAi.enabled,
    model: 'gemini-2.5-flash',
    features: ['function_calling', 'consultas_banco', 'chat_contextual']
  });
});

module.exports = router;
