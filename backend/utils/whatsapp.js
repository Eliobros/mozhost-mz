// utils/whatsapp.js
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} = require('baileys');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
require('dotenv').config();

// 🔥 Logger profissional com timestamps e cores
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  },
  level: 'info'
});

// Estado global da conexão
let sock = null;
let isConnected = false;
let connectionPromise = null;

/**
 * Inicializa a conexão com WhatsApp usando Baileys
 */
async function initializeWhatsApp() {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise(async (resolve) => {
    try {
      const authPath = path.join(__dirname, '../.auth/whatsapp');

      // Criar diretório de autenticação se não existir
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger // 👈 Usa o logger do pino
      });

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('📱 QR Code para WhatsApp:');
          qrcode.generate(qr, { small: true });
          console.log('\n🔗 Escaneie o QR Code acima com seu WhatsApp para conectar');
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('🔌 Conexão WhatsApp fechada. Reconectando...', shouldReconnect);

          if (shouldReconnect) {
            isConnected = false;
            connectionPromise = null;
            setTimeout(() => initializeWhatsApp(), 3000);
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp conectado com sucesso!');
          isConnected = true;
          resolve(sock);
        }
      });

      sock.ev.on('creds.update', saveCreds);

      // Timeout para conexão
      setTimeout(() => {
        if (!isConnected) {
          console.log('⏰ Timeout na conexão WhatsApp - usando modo simulação');
          isConnected = false;
          resolve(null);
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp:', error);
      isConnected = false;
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
    // Tentar conectar se não estiver conectado
    if (!isConnected || !sock) {
      console.log('🔌 Conectando ao WhatsApp...');
      await initializeWhatsApp();
    }

    // Se ainda não conseguiu conectar, simular envio
    if (!isConnected || !sock) {
      console.warn('⚠️  WhatsApp não conectado, simulando envio');
      console.log(`📱 WhatsApp simulado para: ${phone}`);
      console.log(`📝 Mensagem: ${message}`);
      return { messageId: 'simulated', status: 'sent' };
    }

    // Formatar número
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const formattedPhone = cleanPhone + '@s.whatsapp.net';

    // Verificar se o número existe no WhatsApp
    const [result] = await sock.onWhatsApp(formattedPhone);
    if (!result?.exists) {
      throw new Error('Número não encontrado no WhatsApp');
    }

    // Enviar mensagem
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
 * Verifica se o WhatsApp está conectado
 */
function checkWhatsAppConnection() {
  return isConnected && sock !== null;
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
  console.log('🚀 Inicializando WhatsApp...');
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
  initializeWhatsApp
};
