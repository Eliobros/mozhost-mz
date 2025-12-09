// routes/logs.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dockerManager = require('../utils/docker-manager');
const database = require('../models/database');

// WebSocket route para logs
router.ws('/:containerId', async (ws, req) => {
  const { containerId } = req.params;
  const token = req.query.token;
  
  console.log(`[Logs] Nova conexão WebSocket para container: ${containerId}`);

  try {
    // Autenticação
    if (!token) {
      console.error('[Logs] Token não fornecido');
      ws.send(JSON.stringify({ type: 'error', message: 'Token não fornecido' }));
      ws.close();
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      console.error('[Logs] Token inválido:', jwtErr.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Token inválido' }));
      ws.close();
      return;
    }

    const users = await database.query(
      "SELECT id, email, username FROM users WHERE email = ? LIMIT 1",
      [decoded.email]
    );

    if (users.length === 0) {
      console.error('[Logs] Usuário não encontrado');
      ws.send(JSON.stringify({ type: 'error', message: 'Usuário inválido' }));
      ws.close();
      return;
    }

    const user = users[0];
    console.log(`[Logs] Usuário autenticado: ${user.id} (${user.email})`);

    // Verificar se container existe e pertence ao usuário
    const containers = await database.query(
      'SELECT * FROM containers WHERE id = ? AND user_id = ?',
      [containerId, user.id]
    );

    if (containers.length === 0) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Container não encontrado'
      }));
      ws.close();
      return;
    }

    const container = containers[0];

    if (!container.docker_container_id) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Container não tem Docker ID'
      }));
      ws.close();
      return;
    }

    // Pegar container do Docker
    const dockerContainer = dockerManager.docker.getContainer(container.docker_container_id);

    // Enviar logs históricos (últimas 100 linhas)
    try {
      const logsHistory = await dockerContainer.logs({
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: true
      });

      const historyLines = logsHistory.toString('utf8').split('\n').filter(line => line.trim());
      
      ws.send(JSON.stringify({
        type: 'history',
        data: historyLines
      }));

      console.log(`[Logs] Enviadas ${historyLines.length} linhas de histórico`);

    } catch (histError) {
      console.error('[Logs] Erro ao buscar histórico:', histError);
    }

    // Stream de logs em tempo real
    const logStream = await dockerContainer.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: true,
      since: Math.floor(Date.now() / 1000)
    });

    logStream.on('data', (chunk) => {
      try {
        const logLine = chunk.toString('utf8').replace(/[\x00-\x08]/g, '');
        
        if (ws.readyState === 1 && logLine.trim()) {
          ws.send(JSON.stringify({
            type: 'log',
            data: logLine
          }));
        }
      } catch (err) {
        console.error('[Logs] Erro ao enviar log:', err);
      }
    });

    logStream.on('error', (err) => {
      console.error('[Logs] Erro no stream:', err);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Erro ao receber logs'
        }));
      }
    });

    // Cleanup quando WebSocket fechar
    ws.on('close', () => {
      console.log(`[Logs] Conexão fechada para container: ${containerId}`);
      logStream.destroy();
    });

    ws.on('error', (error) => {
      console.error('[Logs] Erro no WebSocket:', error);
      logStream.destroy();
    });

  } catch (error) {
    console.error('[Logs] Erro ao configurar stream:', error);
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
    ws.close();
  }
});

module.exports = router;
