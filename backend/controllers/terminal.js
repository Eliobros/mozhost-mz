// controllers/terminal.js
const jwt = require('jsonwebtoken');
const database = require('../models/database');
const path = require('path');
const dockerManager = require('../utils/docker-manager');

class TerminalController {
  constructor() {
    this.terminals = new Map(); // socketId -> { pty, containerId, userId }
    this.containerTerminals = new Map(); // containerId -> Set of socketIds
  }

  // Autenticar socket connection
  async authenticateSocket(socket) {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        throw new Error('No token provided');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar se usuário existe
      const user = await database.query(
        'SELECT id, username FROM users WHERE id = ? AND is_active = true',
        [decoded.userId]
      );

      if (user.length === 0) {
        throw new Error('User not found');
      }

      return {
        userId: decoded.userId,
        username: decoded.username
      };

    } catch (error) {
      console.error('Socket authentication error:', error);
      return null;
    }
  }

  // Verificar se usuário possui o container
  async verifyContainerAccess(containerId, userId) {
    try {
      const containers = await database.query(
        'SELECT id FROM containers WHERE id = ? AND user_id = ?',
        [containerId, userId]
      );

      return containers.length > 0;
    } catch (error) {
      console.error('Container verification error:', error);
      return false;
    }
  }

  // Handle de conexão WebSocket
  handleConnection(socket, io) {
    console.log(`Terminal connection attempt: ${socket.id}`);

    // Event: Conectar ao terminal de um container
    socket.on('connect-terminal', async (data) => {
      try {
        const { containerId } = data;

        // Autenticar socket
        const user = await this.authenticateSocket(socket);
        if (!user) {
          socket.emit('terminal-error', { error: 'Authentication failed' });
          return;
        }

        // Verificar acesso ao container
        if (!await this.verifyContainerAccess(containerId, user.userId)) {
          socket.emit('terminal-error', { error: 'Container access denied' });
          return;
        }

        // Se já existe um terminal para este socket, fechar
        if (this.terminals.has(socket.id)) {
          this.closeTerminal(socket.id);
        }

        // Obter docker_container_id e criar sessão exec dentro do container
        const rows = await database.query(
          'SELECT docker_container_id FROM containers WHERE id = ? AND user_id = ?',
          [containerId, user.userId]
        );

        if (!rows.length || !rows[0].docker_container_id) {
          socket.emit('terminal-error', { error: 'Container not available' });
          return;
        }

        const dockerContainerId = rows[0].docker_container_id;
        const container = dockerManager.docker.getContainer(dockerContainerId);

        const exec = await container.exec({
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          WorkingDir: '/app/code',
          Cmd: ['sh']
        });

        const stream = await new Promise((resolve, reject) => {
          exec.start({ hijack: true, stdin: true }, (err, s) => {
            if (err) return reject(err);
            resolve(s);
          });
        });

        // Armazenar referência da sessão
        this.terminals.set(socket.id, {
          exec,
          stream,
          dockerContainerId,
          containerId,
          userId: user.userId,
          username: user.username
        });

        // Adicionar à lista de terminais do container
        if (!this.containerTerminals.has(containerId)) {
          this.containerTerminals.set(containerId, new Set());
        }
        this.containerTerminals.get(containerId).add(socket.id);

        // Encaminhar dados do exec para o cliente
        stream.on('data', (chunk) => {
          try {
            socket.emit('terminal-output', { data: chunk.toString('utf8') });
          } catch (_) {}
        });

        const onStreamEnd = () => {
          try { socket.emit('terminal-exit', { code: 0 }); } catch (_) {}
          this.closeTerminal(socket.id);
        };
        stream.on('end', onStreamEnd);
        stream.on('close', onStreamEnd);

        // Confirmar conexão
        socket.emit('terminal-connected', { 
          containerId,
          message: `Connected to container ${containerId.substring(0, 8)}`
        });

        console.log(`Terminal connected: user ${user.username} -> container ${containerId}`);

      } catch (error) {
        console.error('Terminal connection error:', error);
        socket.emit('terminal-error', { error: error.message });
      }
    });

    // Event: Enviar comando para terminal
    socket.on('terminal-input', (data) => {
      try {
        const { input } = data;
        const terminal = this.terminals.get(socket.id);

        if (!terminal) {
          socket.emit('terminal-error', { error: 'Terminal not connected' });
          return;
        }

        // Enviar input para o terminal
        terminal.pty.write(input);

      } catch (error) {
        console.error('Terminal input error:', error);
        socket.emit('terminal-error', { error: error.message });
      }
    });

    // Event: Redimensionar terminal
    socket.on('terminal-resize', (data) => {
      try {
        const { cols, rows } = data;
        const terminal = this.terminals.get(socket.id);

        if (!terminal) {
          socket.emit('terminal-error', { error: 'Terminal not connected' });
          return;
        }

        // Redimensionar PTY
        terminal.pty.resize(cols || 80, rows || 24);

      } catch (error) {
        console.error('Terminal resize error:', error);
        socket.emit('terminal-error', { error: error.message });
      }
    });

    // Event: Desconectar terminal
    socket.on('disconnect-terminal', () => {
      this.closeTerminal(socket.id);
    });

    // Event: Obter logs de container
    socket.on('container-logs', async (data) => {
      try {
        const { containerId, tail = 100 } = data;

        // Autenticar
        const user = await this.authenticateSocket(socket);
        if (!user) {
          socket.emit('logs-error', { error: 'Authentication failed' });
          return;
        }

        // Verificar acesso
        if (!await this.verifyContainerAccess(containerId, user.userId)) {
          socket.emit('logs-error', { error: 'Container access denied' });
          return;
        }

        const dockerManager = require('../utils/docker-manager');
        const logs = await dockerManager.getContainerLogs(containerId, tail);

        socket.emit('container-logs-data', {
          containerId,
          logs: logs.split('\n').filter(line => line.trim()).slice(-tail)
        });

      } catch (error) {
        console.error('Container logs error:', error);
        socket.emit('logs-error', { error: error.message });
      }
    });

    // Event: Stream de logs em tempo real
    socket.on('start-log-stream', async (data) => {
      try {
        const { containerId } = data;

        // Autenticar
        const user = await this.authenticateSocket(socket);
        if (!user) {
          socket.emit('logs-error', { error: 'Authentication failed' });
          return;
        }

        // Verificar acesso
        if (!await this.verifyContainerAccess(containerId, user.userId)) {
          socket.emit('logs-error', { error: 'Container access denied' });
          return;
        }

        // TODO: Implementar stream de logs em tempo real
        // Isso requereria uma conexão contínua com os logs do Docker
        socket.emit('log-stream-started', { containerId });

      } catch (error) {
        console.error('Log stream error:', error);
        socket.emit('logs-error', { error: error.message });
      }
    });
  }

  // Fechar terminal
  closeTerminal(socketId) {
    try {
      const terminal = this.terminals.get(socketId);
      
      if (terminal) {
        // Matar processo PTY
        terminal.pty.kill();
        
        // Remover das listas
        this.terminals.delete(socketId);
        
        if (this.containerTerminals.has(terminal.containerId)) {
          this.containerTerminals.get(terminal.containerId).delete(socketId);
          
          // Se não há mais terminais para o container, limpar
          if (this.containerTerminals.get(terminal.containerId).size === 0) {
            this.containerTerminals.delete(terminal.containerId);
          }
        }

        console.log(`Terminal closed: ${socketId}`);
      }
    } catch (error) {
      console.error('Error closing terminal:', error);
    }
  }

  // Handle de desconexão
  handleDisconnection(socket) {
    this.closeTerminal(socket.id);
  }

  // Broadcast para todos os terminais de um container
  broadcastToContainer(containerId, event, data) {
    const sockets = this.containerTerminals.get(containerId);
    if (sockets) {
      sockets.forEach(socketId => {
        // Em uma implementação real, você teria referência ao io
        // io.to(socketId).emit(event, data);
      });
    }
  }

  // Estatísticas dos terminais ativos
  getStats() {
    return {
      activeTerminals: this.terminals.size,
      activeContainers: this.containerTerminals.size,
      terminalsPerContainer: Array.from(this.containerTerminals.entries()).map(([containerId, sockets]) => ({
        containerId,
        terminalCount: sockets.size
      }))
    };
  }

  // Cleanup: fechar todos os terminais
  cleanup() {
    console.log('Cleaning up terminals...');
    
    this.terminals.forEach((terminal, socketId) => {
      try {
        terminal.pty.kill();
      } catch (error) {
        console.error(`Error killing terminal ${socketId}:`, error);
      }
    });

    this.terminals.clear();
    this.containerTerminals.clear();
  }
}

// Singleton instance
const terminalController = new TerminalController();

// Cleanup na saída do processo
process.on('SIGINT', () => {
  terminalController.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  terminalController.cleanup();
  process.exit(0);
});

module.exports = terminalController;
