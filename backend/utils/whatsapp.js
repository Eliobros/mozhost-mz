// utils/whatsapp.js
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@leifermendez/baileys-mod'); // 👈 usando baileys-mod
const fs = require('fs');
const path = require('path');
const pino = require('pino');
require('dotenv').config();

let sock = null;
let isConnected = false;
let connectionPromise = null;
let currentQR = null;

async function initializeWhatsApp() {
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise(async (resolve) => {
    try {
      console.log('🚀 Inicializando WhatsApp...');

      const authPath = path.join(__dirname, '../.auth');
      if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

      const { version } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WhatsApp Web v${version.join('.')}`);

      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['MozHost', 'Chrome', '1.0.0'],
      });

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          currentQR = qr;
          fs.writeFileSync(path.join(authPath, 'qr.txt'), qr);
          console.log('📱 QR Code gerado e salvo em .auth/qr.txt');
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            isConnected = false;
            connectionPromise = null;
            setTimeout(() => initializeWhatsApp(), 3000);
          } else {
            fs.rmSync(authPath, { recursive: true, force: true });
            isConnected = false;
            connectionPromise = null;
            setTimeout(() => initializeWhatsApp(), 2000);
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp conectado com sucesso!');
          isConnected = true;
          currentQR = null;

          try {
            const supportBridge = require('../services/supportBridge');
            supportBridge.attachSocket(sock);
            console.log('🤝 SupportBridge ligado ao Baileys');
          } catch {}

          resolve(sock);
        }
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const btnResponse = msg.message.buttonsResponseMessage;
        if (btnResponse) {
          const id = btnResponse.selectedButtonId;
          if (id === 'aceitar_suporte') {
            console.log('🎟️ Ticket aceito!');
          } else if (id === 'recusar_suporte') {
            console.log('🚫 Ticket recusado!');
          }
        } else {
          const whatsappBotService = require('../services/whatsappBotService');
          await whatsappBotService.handleMessage(sock, msg);
        }
      });

    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp:', error);
      isConnected = false;
      connectionPromise = null;
      resolve(null);
    }
  });

  return connectionPromise;
}

// 📩 Envia mensagem simples
async function sendWhatsAppMessage({ phone, message }) {
  if (!isConnected || !sock) await initializeWhatsApp();
  const formattedPhone = phone.replace(/[^\d]/g, '') + '@s.whatsapp.net';
  return await sock.sendMessage(formattedPhone, { text: message });
}

// 📩 Envia botões de suporte
async function sendSupportOptions(phone) {
  const formattedPhone = phone.replace(/[^\d]/g, '') + '@s.whatsapp.net';

  const buttons = [
    { buttonId: 'aceitar_suporte', buttonText: { displayText: '✅ Aceitar' }, type: 1 },
    { buttonId: 'recusar_suporte', buttonText: { displayText: '❌ Recusar' }, type: 1 }
  ];

  const buttonMessage = {
    text: "Deseja assumir este ticket de suporte?",
    footer: "MozHost Bot",
    buttons,
    headerType: 1
  };

  return await sock.sendMessage(formattedPhone, buttonMessage, { quoted: null });
}

// 📱 Wrapper para inicializar no server.js
function startWhatsApp() {
  console.log('📱 Inicializando WhatsApp...');
  initializeWhatsApp().catch(error => {
    console.error('❌ Erro ao inicializar WhatsApp:', error);
  });
}

module.exports = {
  sendWhatsAppMessage,
  sendSupportOptions,
  initializeWhatsApp,
  startWhatsApp, // 👈 reinserido para o server.js
  getWhatsAppSocket: () => sock,
  checkWhatsAppConnection: () => isConnected,
  getCurrentQR: () => currentQR,
};
