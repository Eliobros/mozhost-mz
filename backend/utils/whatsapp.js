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

      // Criar diretório de autenticação se não existir
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
        console.log('📁 Pasta de autenticação criada:', authPath);
      }

      // Busca a versão mais recente do WhatsApp Web
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WhatsApp Web v${version.join('.')}, última versão: ${isLatest}`);

      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // 👈 Isso vai imprimir no terminal automaticamente
        logger: pino({ level: 'silent' }), // 👈 'silent' para não poluir, ou 'info' para debug
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
          
          // Também salva o QR em arquivo para backup
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
            // Limpa a pasta de auth quando há logout
            if (fs.existsSync(authPath)) {
              fs.rmSync(authPath, { recursive: true, force: true });
            }
            isConnected = false;
            currentQR = null;
            connectionPromise = null;
            // Reinicia após 2 segundos para gerar novo QR
            setTimeout(() => initializeWhatsApp(), 2000);
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp conectado com sucesso!');
          isConnected = true;
          currentQR = null;
          
          // Remove o arquivo de QR quando conectar
          const qrFile = path.join(authPath, 'qr.txt');
          if (fs.existsSync(qrFile)) {
            fs.unlinkSync(qrFile);
          }
          
          resolve(sock);
        }
      });

      sock.ev.on('creds.update', saveCreds);

      // ============================================
      // 🤖 SISTEMA DE COMANDOS BOT
      // ============================================
      const whatsappBotService = require('../services/whatsappBotService');

      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          try {
            await whatsappBotService.handleMessage(sock, msg);
          } catch (error) {
            console.error('❌ Erro no bot WhatsApp:', error.message);
          }
        }
      });

      // Timeout para conexão (60 segundos)
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
    // Tentar conectar se não estiver conectado
    if (!isConnected || !sock) {
      console.log('🔌 WhatsApp não conectado, tentando conectar...');
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
  getCurrentQR
};
