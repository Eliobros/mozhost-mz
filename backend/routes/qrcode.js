// routes/qrcode.js
const express = require('express');
const router = express.Router();
const authenticateWs = require('../middleware/auth-ws');
const database = require('../models/database');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ========================================
// CONFIGURAÇÕES
// ========================================
const CONFIG = {
  FAST_POLL_INTERVAL: 1000,      // 1 segundo
  SLOW_POLL_INTERVAL: 5000,      // 5 segundos
  FAST_POLL_DURATION: 45,        // 45 segundos
  HEARTBEAT_INTERVAL: 30000,     // 30 segundos
  MAX_FILE_READ_RETRIES: 3,      // Tentativas de leitura
  TIMEOUT_QR_GENERATION: 60000   // 60 segundos timeout
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Lê arquivo do container com retry e timeout
 */
const readFileFromContainer = async (containerDockerName, filePath, retries = CONFIG.MAX_FILE_READ_RETRIES) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { stdout } = await execPromise(
        `docker exec ${containerDockerName} cat ${filePath} 2>/dev/null || echo ""`,
        { timeout: 5000 }
      );
      
      const content = stdout.trim();
      if (content) return content;
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[QR Code WS] ⚠️ Tentativa ${i + 1}/${retries} falhou:`, error.message);
      if (i === retries - 1) return null;
    }
  }
  return null;
};

/**
 * Verifica se o container está realmente rodando
 */
const isContainerRunning = async (containerDockerName) => {
  try {
    const { stdout } = await execPromise(
      `docker inspect -f '{{.State.Running}}' ${containerDockerName} 2>/dev/null || echo "false"`
    );
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
};

/**
 * Valida dados de QR Code
 */
const isValidQRCode = (qr) => {
  return qr && 
         typeof qr === 'string' && 
         qr.startsWith('data:image') && 
         qr.length > 100;
};

/**
 * Valida estado de conexão
 */
const isValidState = (state) => {
  return state && 
         typeof state === 'object' && 
         (state.connected !== undefined || state.qr !== undefined);
};

// ========================================
// CLASSE PARA GERENCIAR CONEXÃO
// ========================================
class QRCodeConnection {
  constructor(ws, containerDockerName, userId) {
    this.ws = ws;
    this.containerDockerName = containerDockerName;
    this.userId = userId;
    
    // Estados
    this.lastStateHash = null;
    this.qrSent = false;
    this.connectedSent = false;
    this.pollCount = 0;
    this.startTime = Date.now();
    
    // Intervalos
    this.mainInterval = null;
    this.slowInterval = null;
    this.heartbeatInterval = null;
    this.timeoutTimer = null;
  }

  /**
   * Envia mensagem pro cliente
   */
  send(data) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Verifica timeout geral
   */
  checkTimeout() {
    const elapsed = Date.now() - this.startTime;
    if (elapsed > CONFIG.TIMEOUT_QR_GENERATION && !this.qrSent && !this.connectedSent) {
      console.log('[QR Code WS] ⏱️ Timeout atingido sem QR ou conexão');
      this.send({
        type: 'timeout',
        message: 'Tempo esgotado. O bot pode estar com problemas. Tente reiniciar o container.'
      });
      this.cleanup();
      this.ws.close();
      return true;
    }
    return false;
  }

  /**
   * Lê e processa estado do bot
   */
  async readBotState() {
    try {
      // 1. Tentar ler estado completo
      const stateData = await readFileFromContainer(this.containerDockerName, '/app/code/bot-state.json');

      if (stateData && stateData.length > 2) {
        try {
          const state = JSON.parse(stateData);
          
          if (!isValidState(state)) {
            return { success: false, reason: 'invalid_state' };
          }

          const stateHash = JSON.stringify(state);

          // Evitar envios duplicados
          if (stateHash === this.lastStateHash) {
            return { success: true, reason: 'no_change' };
          }

          this.lastStateHash = stateHash;

          console.log('[QR Code WS] 📊 Estado atualizado:', {
            connected: state.connected,
            hasQR: !!state.qr,
            number: state.number,
            pollCount: this.pollCount
          });

          // Bot conectado
          if (state.connected && !this.connectedSent) {
            console.log('[QR Code WS] ✅ Bot conectado!');
            this.connectedSent = true;
            this.qrSent = false;

            return {
              success: true,
              action: 'send',
              data: {
                type: 'connected',
                number: state.number || 'Desconhecido',
                name: state.name || 'Bot',
                device: state.device || 'WhatsApp',
                timestamp: state.timestamp || new Date().toISOString()
              }
            };
          }

          // QR Code disponível
          if (state.qr && !state.connected && !this.qrSent) {
            if (!isValidQRCode(state.qr)) {
              console.log('[QR Code WS] ⚠️ QR Code inválido no estado');
              return { success: false, reason: 'invalid_qr' };
            }

            console.log('[QR Code WS] 📱 QR Code encontrado no estado!');
            this.qrSent = true;
            this.connectedSent = false;

            return {
              success: true,
              action: 'send',
              data: {
                type: 'qr',
                qr: state.qr,
                timestamp: state.timestamp || new Date().toISOString()
              }
            };
          }

          // Se desconectou, resetar flags
          if (!state.connected && this.connectedSent) {
            this.connectedSent = false;
            this.qrSent = false;
            console.log('[QR Code WS] 🔄 Bot desconectado, aguardando novo QR');
            
            return {
              success: true,
              action: 'send',
              data: {
                type: 'disconnected',
                message: 'Bot desconectado. Aguardando novo QR Code...'
              }
            };
          }

        } catch (parseError) {
          console.error('[QR Code WS] ❌ Erro ao parsear estado:', parseError.message);
          return { success: false, reason: 'parse_error' };
        }
      }

      // 2. Fallback: tentar ler arquivo QR direto
      if (!this.qrSent && !this.connectedSent) {
        const qrData = await readFileFromContainer(this.containerDockerName, '/app/code/qr.txt');

        if (isValidQRCode(qrData)) {
          console.log('[QR Code WS] 📱 QR encontrado em qr.txt!');
          this.qrSent = true;

          return {
            success: true,
            action: 'send',
            data: {
              type: 'qr',
              qr: qrData,
              timestamp: new Date().toISOString()
            }
          };
        }
      }

      // 3. Enviar update de "waiting" periodicamente (a cada 5 polls)
      if (!this.qrSent && !this.connectedSent && this.pollCount % 5 === 0) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        console.log(`[QR Code WS] ⏳ Aguardando... (${elapsed}s)`);
        
        return {
          success: true,
          action: 'send',
          data: {
            type: 'waiting',
            message: 'Aguardando geração do QR Code. Isso pode levar até 30 segundos...',
            elapsed: elapsed
          }
        };
      }

      return { success: true, reason: 'no_data_yet' };

    } catch (error) {
      console.error('[QR Code WS] ❌ Erro ao ler estado:', error.message);
      return { success: false, reason: 'read_error', error: error.message };
    }
  }

  /**
   * Processa estado e envia resposta
   */
  async processState() {
    // Verificar se conexão ainda está aberta
    if (this.ws.readyState !== this.ws.OPEN) {
      console.log('[QR Code WS] 🔴 Conexão fechada');
      this.cleanup();
      return false;
    }

    // Verificar timeout
    if (this.checkTimeout()) {
      return false;
    }

    // Verificar se container ainda está rodando (a cada 10 polls)
    if (this.pollCount % 10 === 0 && this.pollCount > 0) {
      const isRunning = await isContainerRunning(this.containerDockerName);
      if (!isRunning) {
        console.log('[QR Code WS] ⚠️ Container não está mais rodando');
        this.send({
          type: 'error',
          message: 'Container parou de funcionar. Por favor, reinicie-o.'
        });
        this.cleanup();
        this.ws.close();
        return false;
      }
    }

    // Ler estado
    const result = await this.readBotState();

    if (result.action === 'send' && result.data) {
      this.send(result.data);
    }

    return result.success !== false;
  }

  /**
   * Inicia polling
   */
  async startPolling() {
    console.log('[QR Code WS] 🔄 Iniciando monitoramento...');

    // Primeira verificação imediata
    await this.processState();

    // Polling rápido inicial (1 segundo por 45 segundos ou até obter QR/conexão)
    this.mainInterval = setInterval(async () => {
      this.pollCount++;
      const shouldContinue = await this.processState();

      if (!shouldContinue) {
        this.cleanup();
        return;
      }

      // Mudar para polling lento após condições
      if (this.pollCount >= CONFIG.FAST_POLL_DURATION || this.qrSent || this.connectedSent) {
        console.log('[QR Code WS] 🔄 Mudando para polling lento');
        clearInterval(this.mainInterval);
        this.mainInterval = null;

        // Polling lento
        this.slowInterval = setInterval(async () => {
          const ok = await this.processState();
          if (!ok) {
            this.cleanup();
          }
        }, CONFIG.SLOW_POLL_INTERVAL);
      }

    }, CONFIG.FAST_POLL_INTERVAL);

    // Heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === this.ws.OPEN) {
        this.ws.ping();
      } else {
        this.cleanup();
      }
    }, CONFIG.HEARTBEAT_INTERVAL);

    // Timeout geral
    this.timeoutTimer = setTimeout(() => {
      this.checkTimeout();
    }, CONFIG.TIMEOUT_QR_GENERATION);
  }

  /**
   * Limpa todos os intervalos e timers
   */
  cleanup() {
    console.log('[QR Code WS] 🧹 Limpando recursos...');
    
    if (this.mainInterval) {
      clearInterval(this.mainInterval);
      this.mainInterval = null;
    }
    
    if (this.slowInterval) {
      clearInterval(this.slowInterval);
      this.slowInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}

// ========================================
// ROTA WEBSOCKET
// ========================================

router.ws('/:containerId', (ws, req, next) => {
  authenticateWs(ws, req, async () => {
    const { containerId } = req.params;
    const userId = req.user.id;

    console.log(`[QR Code WS] 🔗 Conectado - User: ${userId}, Container: ${containerId}`);

    let connection = null;

    try {
      // ========================================
      // 1. VERIFICAR SE CONTAINER PERTENCE AO USUÁRIO
      // ========================================
      const containers = await database.query(
        'SELECT id, name, type, status FROM containers WHERE id = ? AND user_id = ?',
        [containerId, userId]
      );

      if (containers.length === 0) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Container não encontrado ou você não tem permissão para acessá-lo'
        }));
        ws.close();
        return;
      }

      const container = containers[0];
      
      // ✅ USAR O UUID COM PREFIXO mozhost_
      const containerDockerName = `mozhost_${containerId}`;

      console.log(`[QR Code WS] 📦 Container: ${container.name} → Docker: ${containerDockerName}`);

      // ========================================
      // 2. VERIFICAR SE É UM BOT WHATSAPP
      // ========================================
      const whatsappBotTypes = ['bot-baileys', 'bot-wwebjs'];
      if (!whatsappBotTypes.includes(container.type)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Este container não é um bot WhatsApp'
        }));
        ws.close();
        return;
      }

      // ========================================
      // 3. VERIFICAR STATUS REAL DO CONTAINER NO DOCKER
      // ========================================
      const isRunning = await isContainerRunning(containerDockerName);
      
      if (!isRunning) {
        console.error('[QR Code WS] ❌ Container não está rodando:', containerDockerName);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Container não está rodando. Inicie-o e aguarde pelo menos 10 segundos antes de tentar conectar novamente.'
        }));
        ws.close();
        return;
      }

      console.log('[QR Code WS] ✅ Container validado e rodando');

      // ========================================
      // 4. ENVIAR MENSAGEM INICIAL IMEDIATAMENTE
      // ========================================
      ws.send(JSON.stringify({
        type: 'waiting',
        message: 'Conectado! Aguardando geração do QR Code...',
        elapsed: 0
      }));

      // ========================================
      // 5. CRIAR CONEXÃO E INICIAR POLLING
      // ========================================
      connection = new QRCodeConnection(ws, containerDockerName, userId);
      await connection.startPolling();

      // ========================================
      // 6. EVENT HANDLERS
      // ========================================
      ws.on('close', () => {
        console.log('[QR Code WS] 🔴 Cliente desconectado');
        if (connection) connection.cleanup();
      });

      ws.on('error', (error) => {
        console.error('[QR Code WS] ❌ Erro no WebSocket:', error.message);
        if (connection) connection.cleanup();
      });

      ws.on('pong', () => {
        // Heartbeat recebido - conexão está viva
      });

    } catch (error) {
      console.error('[QR Code WS] ❌ Erro geral:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Erro interno: ${error.message}`
      }));
      if (connection) connection.cleanup();
      ws.close();
    }
  });
});

module.exports = router;
