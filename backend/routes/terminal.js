// routes/terminal.js
const express = require('express');
const router = express.Router();
const { handleTerminalWebSocket, executeCommand } = require('../controllers/terminal');
const authMiddleware = require('../middleware/auth');
const database = require('../models/database');

/**
 * Helper: Resolver container por ID ou nome
 */
async function resolveContainer(identifier, userId) {
  try {
    // Tentar buscar por ID primeiro
    let containers = await database.query(
      'SELECT id, docker_container_id, user_id, name, status FROM containers WHERE id = ? AND user_id = ?',
      [identifier, userId]
    );

    // Se não encontrou, buscar por nome
    if (containers.length === 0) {
      containers = await database.query(
        'SELECT id, docker_container_id, user_id, name, status FROM containers WHERE name = ? AND user_id = ?',
        [identifier, userId]
      );
    }

    return containers.length > 0 ? containers[0] : null;
  } catch (error) {
    console.error('[resolveContainer] Erro:', error);
    return null;
  }
}

/**
 * WebSocket endpoint para terminal interativo
 * ws://api.mozhost.shop/api/terminal/:containerId?token=XXX
 *
 * Aceita tanto ID quanto NOME do container
 */
router.ws('/:containerId', (ws, req, next) => {
  // Aplicar auth manualmente para ter melhor controle
  authMiddleware(req, null, async (err) => {
    if (err || !req.user) {
      console.error('[Terminal Route] Erro de autenticação:', err?.message || 'Sem usuário');
      ws.send(JSON.stringify({
        type: 'error',
        message: '❌ Não autenticado'
      }));
      ws.close();
      return;
    }

    const identifier = req.params.containerId;
    const userId = req.user.id || req.user.userId;

    console.log(`[Terminal Route] Resolvendo container: "${identifier}" para user ${userId}`);

    // Resolver container por ID ou nome
    const container = await resolveContainer(identifier, userId);

    if (!container) {
      console.error(`[Terminal Route] Container "${identifier}" não encontrado`);
      ws.send(JSON.stringify({
        type: 'error',
        message: `❌ Container "${identifier}" não encontrado`
      }));
      ws.close();
      return;
    }

    console.log(`[Terminal Route] Container resolvido: ${container.name} (ID: ${container.id})`);

    // Substituir o containerId no req.params pelo ID real
    req.params.containerId = container.id;

    // Chamar o handler
    handleTerminalWebSocket(ws, req);
  });
});

/**
 * Rota HTTP alternativa (fallback)
 * POST /api/terminal/:containerId/exec
 * 
 * Também aceita ID ou nome
 */
router.post('/:containerId/exec', authMiddleware, async (req, res, next) => {
  const identifier = req.params.containerId;
  const userId = req.user.id || req.user.userId;

  console.log(`[Terminal Exec] Resolvendo container: "${identifier}" para user ${userId}`);

  // Resolver container por ID ou nome
  const container = await resolveContainer(identifier, userId);

  if (!container) {
    return res.status(404).json({ 
      error: `Container "${identifier}" não encontrado` 
    });
  }

  console.log(`[Terminal Exec] Container resolvido: ${container.name} (ID: ${container.id})`);

  // Substituir o containerId no req.params pelo ID real
  req.params.containerId = container.id;

  // Chamar o executeCommand
  executeCommand(req, res);
});

module.exports = router;
