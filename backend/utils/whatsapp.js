// utils/whatsapp.js
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('baileys');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
require('dotenv').config();

// Estado global da conexão
let sock = null;
let isConnected = false;
let connectionPromise = null;
let currentQR = null;

/**
 * Inicializa a conexão com WhatsApp usando Baileys
 */
async function initializeWhatsApp() {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise(async (resolve) => {
    try {
      console.log('🚀 Inicializando WhatsApp...');

      const authPath = path.join(__dirname, '../.auth');

      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
        console.log('📁 Pasta de autenticação criada:', authPath);
      }

      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WhatsApp Web v${version.join('.')}, última versão: ${isLatest}`);

      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['MozHost', 'Chrome', '1.0.0'],
        defaultQueryTimeoutMs: undefined,
      });

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          currentQR = qr;
          console.log('\n========================================');
          console.log('📱 QR CODE GERADO!');
          console.log('========================================');
          console.log('🔗 Escaneie o QR Code acima com seu WhatsApp');
          console.log('📲 Abra o WhatsApp > Aparelhos conectados > Conectar');
          console.log('========================================\n');

          fs.writeFileSync(path.join(authPath, 'qr.txt'), qr);
          console.log('💾 QR Code salvo em: .auth/qr.txt\n');
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

          console.log('🔌 Conexão WhatsApp fechada. Reconectando...', shouldReconnect);

          if (shouldReconnect) {
            isConnected = false;
            currentQR = null;
            connectionPromise = null;
            setTimeout(() => initializeWhatsApp(), 3000);
          } else {
            console.log('🚪 Logout detectado. Limpando sessão...');
            if (fs.existsSync(authPath)) {
              fs.rmSync(authPath, { recursive: true, force: true });
            }
            isConnected = false;
            currentQR = null;
            connectionPromise = null;
            setTimeout(() => initializeWhatsApp(), 2000);
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp conectado com sucesso!');
          isConnected = true;
          currentQR = null;

          const qrFile = path.join(authPath, 'qr.txt');
          if (fs.existsSync(qrFile)) {
            fs.unlinkSync(qrFile);
          }

          // ✅ NOVO: ligar o supportBridge ao socket logo que conectar
          // (resolve o problema do setTimeout de 5s no server.js)
          try {
            const supportBridge = require('../services/supportBridge');
            supportBridge.attachSocket(sock);
            console.log('🤝 SupportBridge ligado ao Baileys');
          } catch (e) {
            // supportBridge pode não estar disponível em todos os ambientes
          }

          resolve(sock);
        }
      });

      sock.ev.on('creds.update', saveCreds);

      // ============================================
      // 🤖 SISTEMA DE MENSAGENS — Bot + SupportBridge
      // ============================================
      const whatsappBotService = require('../services/whatsappBotService');

      sock.ev.on('messages.upsert', async (payload) => {
        const { messages } = payload;

        for (const msg of messages) {
          try {
            // ✅ NOVO: SupportBridge processa primeiro (comandos ACEITAR/ENCERRAR e bridge)
            const supportBridge = require('../services/supportBridge');
            const handled = await supportBridge.handleIncomingWhatsApp(payload);

            // Se o bridge não tratou (não é agente), passa ao bot normal
            if (!handled) {
              await whatsappBotService.handleMessage(sock, msg);
            }
          } catch (error) {
            console.error('❌ Erro no handler WhatsApp:', error.message);
          }
        }
      });

      setTimeout(() => {
        if (!isConnected) {
          console.log('⏰ Timeout na conexão WhatsApp (60s)');
          console.log('💡 Dica: Certifique-se de escanear o QR Code a tempo');
          resolve(null);
        }
      }, 60000);

    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp:', error);
      isConnected = false;
      currentQR = null;
      connectionPromise = null;
      resolve(null);
    }
  });

  return connectionPromise;
}

/**
 * Envia mensagem via WhatsApp usando Baileys
 */
async function sendWhatsAppMessage({ phone, message }) {
  try {
    if (!isConnected || !sock) {
      console.log('🔌 WhatsApp não conectado, tentando conectar...');
      await initializeWhatsApp();
    }

    if (!isConnected || !sock) {
      console.warn('⚠️  WhatsApp não conectado, simulando envio');
      console.log(`📱 WhatsApp simulado para: ${phone}`);
      console.log(`📝 Mensagem: ${message}`);
      return { messageId: 'simulated', status: 'sent' };
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');
    const formattedPhone = cleanPhone + '@s.whatsapp.net';

    const [result] = await sock.onWhatsApp(formattedPhone);
    if (!result?.exists) {
      throw new Error('Número não encontrado no WhatsApp');
    }

    const sentMessage = await sock.sendMessage(formattedPhone, { text: message });

    console.log('✅ WhatsApp enviado com sucesso:', sentMessage.key.id);
    return {
      messageId: sentMessage.key.id,
      status: 'sent',
      response: sentMessage
    };

  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error.message);
    console.log('📱 Simulando envio devido a erro...');
    return { messageId: 'simulated_error', status: 'sent' };
  }
}

/**
 * Retorna o socket Baileys activo (para o supportBridge e outros serviços)
 */
function getWhatsAppSocket() {
  return sock;
}

/**
 * Verifica se o WhatsApp está conectado
 */
function checkWhatsAppConnection() {
  return isConnected && sock !== null;
}

/**
 * Retorna o QR Code atual (se existir)
 */
function getCurrentQR() {
  return currentQR;
}

/**
 * Formata código de verificação para WhatsApp
 */
function formatVerificationMessage(code, serviceName = 'MozHost') {
  return `🔐 *${serviceName} - Código de Verificação*

Seu código de verificação é: *${code}*

⏰ Este código é válido por 15 minutos.
🔒 Não compartilhe este código com ninguém.

Se você não solicitou este código, ignore esta mensagem.`;
}

/**
 * Inicializa WhatsApp quando o servidor iniciar
 */
function startWhatsApp() {
  console.log('📱 Inicializando WhatsApp...');
  initializeWhatsApp().catch(error => {
    console.error('❌ Erro ao inicializar WhatsApp:', error);
  });
}

/**
 * Desconecta do WhatsApp
 */
function disconnectWhatsApp() {
  if (sock) {
    sock.end();
    sock = null;
    isConnected = false;
    currentQR = null;
    connectionPromise = null;
    console.log('🔌 WhatsApp desconectado');
  }
}

module.exports = {
  sendWhatsAppMessage,
  checkWhatsAppConnection,
  formatVerificationMessage,
  startWhatsApp,
  disconnectWhatsApp,
  initializeWhatsApp,
  getCurrentQR,
  getWhatsAppSocket, // ✅ NOVO
};
