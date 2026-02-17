// utils/template-manager.js
const fs = require('fs-extra');
const path = require('path');

class TemplateManager {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  /**
   * Obter template baseado no tipo
   * @param {string} type - 'api', 'bot-baileys', 'bot-wwebjs'
   */
  async getTemplate(type) {
    const templates = {
      'api': this.getApiTemplate(),
      'bot-baileys': this.getBaileysTemplate(),
      'bot-wwebjs': this.getWWEBJSTemplate()
    };

    if (!templates[type]) {
      throw new Error(`Template type "${type}" not found`);
    }

    return templates[type];
  }

  /**
   * Aplicar template ao container
   * @param {string} containerPath - Caminho do container
   * @param {string} templateType - Tipo do template
   */
  async applyTemplate(containerPath, templateType) {
    const template = await this.getTemplate(templateType);

    // Criar diretórios necessários
    for (const dir of template.directories || []) {
      await fs.ensureDir(path.join(containerPath, dir));
    }

    // Criar arquivos
    for (const [filename, content] of Object.entries(template.files)) {
      const filePath = path.join(containerPath, filename);
      await fs.writeFile(filePath, content);
    }

    console.log(`✅ Template "${templateType}" aplicado em ${containerPath}`);

    return {
      packageJson: template.packageJson,
      startCommand: template.startCommand,
      readme: template.readme
    };
  }

  // ============================================
  // TEMPLATE: API (Express)
  // ============================================
  getApiTemplate() {
    return {
      directories: [],
      files: {
        'index.js': `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from MozHost!',
    timestamp: new Date().toISOString(),
    status: 'online'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});`,

        'package.json': JSON.stringify({
          name: 'mozhost-api',
          version: '1.0.0',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js'
          },
          dependencies: {
            express: '^4.18.2'
          },
          devDependencies: {
            nodemon: '^3.0.1'
          }
        }, null, 2),

        'README.md': `# MozHost API

API criada automaticamente pelo MozHost.

## Endpoints

- \`GET /\` - Endpoint principal
- \`GET /health\` - Status da aplicação

## Como usar

1. Adicione suas rotas no arquivo \`index.js\`
2. Instale dependências: \`npm install <pacote>\`
3. Reinicie o container para aplicar mudanças

## Documentação

- [Express.js](https://expressjs.com/)
- [MozHost Docs](https://docs.mozhost.topaziocoin.online)
`
      },
      packageJson: {
        name: 'mozhost-api',
        version: '1.0.0',
        main: 'index.js',
        scripts: {
          start: 'node index.js'
        },
        dependencies: {
          express: '^4.18.2'
        }
      },
      startCommand: 'npm start',
      readme: 'API Express básica criada pelo MozHost'
    };
  }

  // ============================================
  // TEMPLATE: Bot Baileys (ATUALIZADO)
  // ============================================
  getBaileysTemplate() {
    return {
      directories: ['commands', 'utils'],
      files: {
        'index.js': `const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');

const prefix = process.env.PREFIX || '!';
const ownerNumber = process.env.OWNER_NUMBER || '';

// Arquivos de estado
const QR_FILE = './qr.txt';
const STATE_FILE = './bot-state.json';

// ============================================
// SALVAR ESTADO
// ============================================
function saveState(state) {
  try {
    const dataToSave = {
      ...state,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2));
    console.log('💾 Estado salvo:', dataToSave.connected ? 'Conectado' : 'Desconectado');
  } catch (error) {
    console.error('❌ Erro ao salvar estado:', error);
  }
}

// ============================================
// SALVAR QR CODE
// ============================================
async function saveQRCode(qr) {
  try {
    console.log('🔄 Gerando QR Code...');
    
    // Gerar QR Code como Data URL
    const qrDataURL = await qrcode.toDataURL(qr);
    
    // Salvar em arquivo separado
    fs.writeFileSync(QR_FILE, qrDataURL);
    console.log('✅ QR Code salvo em qr.txt');

    // Salvar no estado também
    const state = {
      connected: false,
      qr: qrDataURL,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log('📱 QR Code disponível! Verifique o painel.');

  } catch (error) {
    console.error('❌ Erro ao salvar QR Code:', error);
  }
}

// ============================================
// CARREGAR COMANDOS DINAMICAMENTE
// ============================================
const commands = new Map();

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  
  if (!fs.existsSync(commandsPath)) {
    console.warn('⚠️ Pasta de comandos não encontrada. Criando...');
    fs.mkdirSync(commandsPath, { recursive: true });
    return;
  }
  
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  if (commandFiles.length === 0) {
    console.warn('⚠️ Nenhum comando encontrado');
    return;
  }

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));
      commands.set(command.name, command);
      console.log(\`✅ Comando carregado: \${command.name}\`);
    } catch (error) {
      console.error(\`❌ Erro ao carregar comando \${file}:\`, error.message);
    }
  }
}

// ============================================
// HANDLER DE MENSAGENS
// ============================================
async function handleMessage(sock, msg) {
  if (!msg.message || msg.key.fromMe) return;

  const text = msg.message.conversation ||
               msg.message.extendedTextMessage?.text || '';

  if (!text.startsWith(prefix)) return;

  const [cmdName, ...args] = text.slice(prefix.length).trim().split(' ');
  const command = commands.get(cmdName.toLowerCase());

  if (!command) return;

  try {
    console.log(\`📨 Executando comando: \${cmdName}\`);
    await command.execute(sock, msg, args);
  } catch (error) {
    console.error(\`❌ Erro ao executar comando \${cmdName}:\`, error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: \`❌ Erro ao executar comando: \${error.message}\`
    });
  }
}

// ============================================
// CONEXÃO COM WHATSAPP
// ============================================
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'silent' }),
    browser: ['MozHost Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR Code gerado
    if (qr) {
      console.log('📱 Novo QR Code gerado!');
      await saveQRCode(qr);
    }

    // Conexão fechada
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log('❌ Conexão fechada.');
      console.log('🔄 Reconectar?', shouldReconnect);

      // Salvar estado desconectado
      saveState({
        connected: false,
        reason: lastDisconnect?.error?.message || 'Desconectado'
      });

      // Limpar QR Code antigo
      if (fs.existsSync(QR_FILE)) {
        fs.unlinkSync(QR_FILE);
        console.log('🗑️ QR Code antigo removido');
      }

      if (shouldReconnect) {
        console.log('⏳ Reconectando em 3 segundos...');
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log('🛑 Bot deslogado. Remova a pasta ./auth e reinicie.');
      }
    } 
    
    // Conectado
    else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!');

      // Obter informações do bot
      const me = sock.user;
      const botNumber = me.id.split(':')[0];
      const botName = me.name || me.verifiedName || 'Bot';

      console.log(\`📱 Número: \${botNumber}\`);
      console.log(\`👤 Nome: \${botName}\`);

      // Salvar estado conectado
      saveState({
        connected: true,
        number: botNumber,
        name: botName,
        device: 'WhatsApp'
      });

      // Limpar QR Code (não precisa mais)
      if (fs.existsSync(QR_FILE)) {
        fs.unlinkSync(QR_FILE);
        console.log('🗑️ QR Code removido (já conectado)');
      }
    }
    
    // Conectando
    else if (connection === 'connecting') {
      console.log('🔄 Conectando...');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    await handleMessage(sock, msg);
  });

  return sock;
}

// ============================================
// INICIALIZAÇÃO
// ============================================
async function start() {
  console.log('');
  console.log('╔════════════════════════════════════╗');
  console.log('║   🤖 MozHost Bot (Baileys)        ║');
  console.log('╚════════════════════════════════════╝');
  console.log('');
  console.log(\`📌 Prefix: \${prefix}\`);
  console.log(\`👤 Owner: \${ownerNumber || 'Não configurado'}\`);
  console.log('');

  // Criar diretórios necessários
  const dirs = ['./auth', './commands'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(\`📁 Criado: \${dir}\`);
    }
  }

  // Carregar comandos
  loadCommands();
  console.log(\`✅ \${commands.size} comando(s) carregado(s)\`);
  console.log('');

  // Conectar
  console.log('🔄 Iniciando conexão...');
  await connectToWhatsApp();
}

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Promise rejeitada:', err);
});

// Iniciar
start().catch(err => {
  console.error('❌ Erro fatal ao iniciar bot:', err);
  process.exit(1);
});`,

        'commands/ping.js': `module.exports = {
  name: 'ping',
  description: 'Testa a velocidade de resposta do bot',

  async execute(sock, msg, args) {
    const start = Date.now();

    const sentMsg = await sock.sendMessage(msg.key.remoteJid, {
      text: '🏓 Pong!'
    });

    const latency = Date.now() - start;

    await sock.sendMessage(msg.key.remoteJid, {
      text: \`🏓 Pong!\\n⏱️ Latência: \${latency}ms\`,
      edit: sentMsg.key
    });
  }
};`,

        'commands/menu.js': `module.exports = {
  name: 'menu',
  description: 'Mostra o menu de comandos',

  async execute(sock, msg, args) {
    const prefix = process.env.PREFIX || '!';

    const menuText = \`
╭─「 📋 MENU DO BOT 」
│
│ 📌 *Comandos Disponíveis:*
│
│ • \${prefix}ping
│   └ Testa a velocidade do bot
│
│ • \${prefix}menu
│   └ Mostra este menu
│
│ • \${prefix}info
│   └ Informações do bot
│
╰────────────────────

🤖 *Bot criado com MozHost*
🌐 mozhost.topaziocoin.online
    \`.trim();

    await sock.sendMessage(msg.key.remoteJid, {
      text: menuText
    });
  }
};`,

        'commands/info.js': `module.exports = {
  name: 'info',
  description: 'Informações sobre o bot',

  async execute(sock, msg, args) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const infoText = \`
╭─「 ℹ️ INFORMAÇÕES 」
│
│ 🤖 *Bot:* MozHost Baileys
│ ⏱️ *Uptime:* \${hours}h \${minutes}m \${seconds}s
│ 📦 *Versão:* 1.0.0
│ 🔧 *Plataforma:* Baileys
│ 🌐 *Host:* MozHost
│
╰────────────────────
    \`.trim();

    await sock.sendMessage(msg.key.remoteJid, {
      text: infoText
    });
  }
};`,

        'utils/helper.js': `/**
 * Funções auxiliares para o bot
 */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return \`\${days}d \${hours}h \${minutes}m \${secs}s\`;
}

function isOwner(number, ownerNumber) {
  return number.includes(ownerNumber);
}

module.exports = {
  sleep,
  formatUptime,
  isOwner
};`,

        '.env.example': `# Configurações do Bot
PREFIX=!
OWNER_NUMBER=5511999999999

# MozHost
BOT_NAME=MozHost Bot
BOT_VERSION=1.0.0`,

        'package.json': JSON.stringify({
          name: 'mozhost-baileys-bot',
          version: '1.0.0',
          main: 'index.js',
          scripts: {
            start: 'node index.js'
          },
          dependencies: {
            'baileys': 'latest',
            'pino': '^8.16.1',
            'qrcode-terminal': '^0.12.0',
            'qrcode': '^1.5.3'
          }
        }, null, 2),

        'README.md': `# MozHost Bot - Baileys

Bot de WhatsApp criado com Baileys pelo MozHost.

## 🚀 Como Usar

1. Acesse a aba **QR Code** no painel
2. Escaneie o QR Code com seu WhatsApp
3. Pronto! Seu bot está online

## 📋 Comandos Disponíveis

- \`!ping\` - Testa a velocidade do bot
- \`!menu\` - Mostra o menu de comandos
- \`!info\` - Informações do bot

## 🔧 Adicionar Novos Comandos

1. Crie um arquivo em \`commands/seucomando.js\`
2. Use este template:

\`\`\`javascript
module.exports = {
  name: 'seucomando',
  description: 'Descrição do comando',

  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: 'Resposta do comando'
    });
  }
};
\`\`\`

3. Reinicie o bot

## 📚 Documentação

- [Baileys](https://github.com/WhiskeySockets/Baileys)
- [MozHost](https://mozhost.topaziocoin.online)

## 🆘 Suporte

Dúvidas? Entre em contato pelo painel MozHost!
`
      },
      packageJson: {
        name: 'mozhost-baileys-bot',
        version: '1.0.0',
        main: 'index.js',
        scripts: {
          start: 'node index.js'
        },
        dependencies: {
          'baileys': 'latest',
          'pino': '^8.16.1',
          'qrcode-terminal': '^0.12.0',
          'qrcode': '^1.5.3'
        }
      },
      startCommand: 'npm start',
      readme: 'Bot de WhatsApp usando Baileys'
    };
  }

  // ============================================
  // TEMPLATE: Bot WWEB.JS (ATUALIZADO)
  // ============================================
  getWWEBJSTemplate() {
    return {
      directories: ['commands', 'utils'],
      files: {

        'index.js': `const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const prefix = process.env.PREFIX || '!';
const ownerNumber = process.env.OWNER_NUMBER || '';

// Arquivos de estado
const QR_FILE = './qr.txt';
const STATE_FILE = './bot-state.json';

// ============================================
// SALVAR ESTADO
// ============================================
function saveState(state) {
  try {
    const dataToSave = {
      ...state,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2));
    console.log('💾 Estado salvo:', dataToSave.connected ? 'Conectado' : 'Desconectado');
  } catch (error) {
    console.error('❌ Erro ao salvar estado:', error);
  }
}

// ============================================
// SALVAR QR CODE
// ============================================
async function saveQRCode(qr) {
  try {
    console.log('🔄 Gerando QR Code...');
    
    // Gerar QR Code como Data URL
    const qrDataURL = await qrcode.toDataURL(qr);
    
    // Salvar em arquivo separado
    fs.writeFileSync(QR_FILE, qrDataURL);
    console.log('✅ QR Code salvo em qr.txt');

    // Atualizar estado
    const state = {
      connected: false,
      qr: qrDataURL,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log('📱 QR Code disponível! Verifique o painel.');

  } catch (error) {
    console.error('❌ Erro ao salvar QR Code:', error);
  }
}

// ============================================
// CARREGAR COMANDOS DINAMICAMENTE
// ============================================
const commands = new Map();

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  
  if (!fs.existsSync(commandsPath)) {
    console.warn('⚠️ Pasta de comandos não encontrada. Criando...');
    fs.mkdirSync(commandsPath, { recursive: true });
    return;
  }
  
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  if (commandFiles.length === 0) {
    console.warn('⚠️ Nenhum comando encontrado');
    return;
  }

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));
      commands.set(command.name, command);
      console.log(\`✅ Comando carregado: \${command.name}\`);
    } catch (error) {
      console.error(\`❌ Erro ao carregar comando \${file}:\`, error.message);
    }
  }
}

// ============================================
// INICIALIZAR CLIENT
// ============================================
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './auth'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

// ============================================
// EVENTOS
// ============================================
client.on('qr', async (qr) => {
  console.log('📱 QR Code gerado!');
  qrcodeTerminal.generate(qr, { small: true });
  await saveQRCode(qr);
});

client.on('ready', async () => {
  console.log('✅ Bot conectado ao WhatsApp!');

  // Obter informações do bot
  const info = client.info;
  const botNumber = info.wid.user;
  const botName = info.pushname || 'Bot';

  console.log(\`📱 Número: \${botNumber}\`);
  console.log(\`👤 Nome: \${botName}\`);

  // Salvar estado conectado
  saveState({
    connected: true,
    number: botNumber,
    name: botName,
    device: info.platform || 'WhatsApp'
  });

  // Limpar QR Code
  if (fs.existsSync(QR_FILE)) {
    fs.unlinkSync(QR_FILE);
    console.log('🗑️ QR Code removido (já conectado)');
  }

  console.log(\`📌 Prefix: \${prefix}\`);
});

client.on('authenticated', () => {
  console.log('🔐 Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Falha na autenticação:', msg);

  saveState({
    connected: false,
    error: 'Falha na autenticação',
    timestamp: new Date().toISOString()
  });
});

client.on('disconnected', (reason) => {
  console.log('❌ Bot desconectado:', reason);

  saveState({
    connected: false,
    reason: reason
  });

  // Limpar QR Code
  if (fs.existsSync(QR_FILE)) {
    fs.unlinkSync(QR_FILE);
  }
});

// ============================================
// HANDLER DE MENSAGENS
// ============================================
client.on('message', async (msg) => {
  if (!msg.body.startsWith(prefix)) return;

  const [cmdName, ...args] = msg.body.slice(prefix.length).trim().split(' ');
  const command = commands.get(cmdName.toLowerCase());

  if (!command) return;

  try {
    console.log(\`📨 Executando comando: \${cmdName}\`);
    await command.execute(client, msg, args);
  } catch (error) {
    console.error(\`❌ Erro ao executar comando \${cmdName}:\`, error);
    await msg.reply(\`❌ Erro ao executar comando: \${error.message}\`);
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================
async function start() {
  console.log('');
  console.log('╔════════════════════════════════════╗');
  console.log('║   🤖 MozHost Bot (WWEB.JS)        ║');
  console.log('╚════════════════════════════════════╝');
  console.log('');
  console.log(\`📌 Prefix: \${prefix}\`);
  console.log(\`👤 Owner: \${ownerNumber || 'Não configurado'}\`);
  console.log('');

  // Criar diretórios necessários
  const dirs = ['./auth', './commands'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(\`📁 Criado: \${dir}\`);
    }
  }

  // Carregar comandos
  loadCommands();
  console.log(\`✅ \${commands.size} comando(s) carregado(s)\`);
  console.log('');

  // Inicializar cliente
  console.log('🔄 Inicializando cliente WhatsApp...');
  client.initialize();
}

// Tratamento de erros
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Promise rejeitada:', err);
});

// Iniciar
start().catch(err => {
  console.error('❌ Erro fatal ao iniciar bot:', err);
  process.exit(1);
});`,

        'commands/ping.js': `module.exports = {
  name: 'ping',
  description: 'Testa a velocidade de resposta do bot',

  async execute(client, msg, args) {
    const start = Date.now();
    const sentMsg = await msg.reply('🏓 Pong!');
    const latency = Date.now() - start;

    await sentMsg.edit(\`🏓 Pong!\\n⏱️ Latência: \${latency}ms\`);
  }
};`,

        'commands/menu.js': `module.exports = {
  name: 'menu',
  description: 'Mostra o menu de comandos',

  async execute(client, msg, args) {
    const prefix = process.env.PREFIX || '!';

    const menuText = \`
╭─「 📋 MENU DO BOT 」
│
│ 📌 *Comandos Disponíveis:*
│
│ • \${prefix}ping
│   └ Testa a velocidade do bot
│
│ • \${prefix}menu
│   └ Mostra este menu
│
│ • \${prefix}info
│   └ Informações do bot
│
│ • \${prefix}sticker
│   └ Cria sticker (responda imagem)
│
╰────────────────────

🤖 *Bot criado com MozHost*
🌐 mozhost.topaziocoin.online
    \`.trim();

    await msg.reply(menuText);
  }
};`,

        'commands/info.js': `module.exports = {
  name: 'info',
  description: 'Informações sobre o bot',

  async execute(client, msg, args) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const info = await client.getState();

    const infoText = \`
╭─「 ℹ️ INFORMAÇÕES 」
│
│ 🤖 *Bot:* MozHost WWEB.JS
│ ⏱️ *Uptime:* \${hours}h \${minutes}m \${seconds}s
│ 📦 *Versão:* 1.0.0
│ 🔧 *Plataforma:* whatsapp-web.js
│ 📱 *Status:* \${info}
│ 🌐 *Host:* MozHost
│
╰────────────────────
    \`.trim();

    await msg.reply(infoText);
  }
};`,

        'commands/sticker.js': `const { MessageMedia } = require('whatsapp-web.js');

module.exports = {
  name: 'sticker',
  description: 'Cria um sticker a partir de uma imagem',

  async execute(client, msg, args) {
    if (!msg.hasQuotedMsg && !msg.hasMedia) {
      return msg.reply('❌ Responda uma imagem ou envie uma imagem com o comando!');
    }

    let media;

    if (msg.hasQuotedMsg) {
      const quotedMsg = await msg.getQuotedMessage();
      if (!quotedMsg.hasMedia) {
        return msg.reply('❌ A mensagem respondida precisa ser uma imagem!');
      }
      media = await quotedMsg.downloadMedia();
    } else {
      media = await msg.downloadMedia();
    }

    if (!media.mimetype.startsWith('image/')) {
      return msg.reply('❌ Apenas imagens são suportadas!');
    }

    await msg.reply('⏳ Criando sticker...');

    await client.sendMessage(msg.from, media, {
      sendMediaAsSticker: true,
      stickerName: 'MozHost Bot',
      stickerAuthor: 'mozhost.topaziocoin.online'
    });
  }
};`,

        'utils/helper.js': `/**
 * Funções auxiliares para o bot
 */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return \`\${days}d \${hours}h \${minutes}m \${secs}s\`;
}

function isOwner(number, ownerNumber) {
  return number.includes(ownerNumber);
}

module.exports = {
  sleep,
  formatUptime,
  isOwner
};`,

        '.env.example': `# Configurações do Bot
PREFIX=!
OWNER_NUMBER=5511999999999

# MozHost
BOT_NAME=MozHost Bot
BOT_VERSION=1.0.0`,

        'package.json': JSON.stringify({
          name: 'mozhost-wwebjs-bot',
          version: '1.0.0',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js'
          },
          dependencies: {
            'whatsapp-web.js': '^1.23.0',
            'qrcode-terminal': '^0.12.0',
            'qrcode': '^1.5.3'
          },
          devDependencies: {
            'nodemon': '^3.0.1'
          }
        }, null, 2),

        'README.md': `# MozHost Bot - WWEB.JS

Bot de WhatsApp criado com whatsapp-web.js pelo MozHost.

## 🚀 Como Usar

1. Acesse a aba **QR Code** no painel
2. Escaneie o QR Code com seu WhatsApp
3. Pronto! Seu bot está online

## 📋 Comandos Disponíveis

- \`!ping\` - Testa a velocidade do bot
- \`!menu\` - Mostra o menu de comandos
- \`!info\` - Informações do bot
- \`!sticker\` - Cria sticker (responda uma imagem)

## 🔧 Adicionar Novos Comandos

1. Crie um arquivo em \`commands/seucomando.js\`
2. Use este template:

\`\`\`javascript
module.exports = {
  name: 'seucomando',
  description: 'Descrição do comando',

  async execute(client, msg, args) {
    await msg.reply('Resposta do comando');
  }
};
\`\`\`

3. Reinicie o bot

## 📚 Documentação

- [whatsapp-web.js](https://wwebjs.dev/)
- [MozHost](https://mozhost.topaziocoin.online)

## 🆘 Suporte

Dúvidas? Entre em contato pelo painel MozHost!
`
      },
      packageJson: {
        name: 'mozhost-wwebjs-bot',
        version: '1.0.0',
        main: 'index.js',
        scripts: {
          start: 'node index.js'
        },
        dependencies: {
          'whatsapp-web.js': '^1.23.0',
          'qrcode-terminal': '^0.12.0',
          'qrcode': '^1.5.3'
        }
      },
      startCommand: 'npm start',
      readme: 'Bot de WhatsApp usando whatsapp-web.js'
    };
  }

  /**
   * Listar templates disponíveis
   */
  listAvailableTemplates() {
    return [
      {
        id: 'api',
        name: 'API Express',
        description: 'API REST básica com Express.js',
        language: 'nodejs',
        features: ['Express', 'Health Check', 'JSON API']
      },
      {
        id: 'bot-baileys',
        name: 'Bot WhatsApp (Baileys)',
        description: 'Bot de WhatsApp usando Baileys',
        language: 'nodejs',
        features: ['Sistema de Comandos', 'Multi-device', 'QR Code']
      },
      {
        id: 'bot-wwebjs',
        name: 'Bot WhatsApp (WWEB.JS)',
        description: 'Bot de WhatsApp usando whatsapp-web.js',
        language: 'nodejs',
        features: ['Sistema de Comandos', 'Stickers', 'QR Code']
      }
    ];
  }
}

module.exports = new TemplateManager();

