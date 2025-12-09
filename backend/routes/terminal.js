// routes/terminal.js
const express = require('express');
const router = express.Router();
const { handleTerminalWebSocket, executeCommand } = require('../controllers/terminal');
const authMiddleware = require('../middleware/auth');

/**
 * WebSocket endpoint para terminal interativo
 * ws://api.mozhost.topaziocoin.online/api/terminal/:containerId?token=XXX
 * 
 * Usar apenas authMiddleware que já suporta query string
 */
router.ws('/:containerId', (ws, req, next) => {
  // Aplicar auth manualmente para ter melhor controle
  authMiddleware(req, null, (err) => {
    if (err || !req.user) {
      console.error('[Terminal Route] Erro de autenticação:', err?.message || 'Sem usuário');
      ws.send(JSON.stringify({
        type: 'error',
        message: '❌ Não autenticado'
      }));
      ws.close();
      return;
    }
    
    console.log('[Terminal Route] WebSocket autenticado, iniciando handler');
    handleTerminalWebSocket(ws, req);
  });
});

/**
 * Rota HTTP alternativa (fallback)
 * POST /api/terminal/:containerId/exec
 */
router.post('/:containerId/exec', authMiddleware, executeCommand);

module.exports = router;
