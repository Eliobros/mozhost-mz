import Link from 'next/link'
import BreadcrumbList from '@/components/SEO/BreadcrumbList'

export default function ExemplosPage() {
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'Exemplos', path: '/docs/exemplos' },
        ]}
      />
      <div>
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">💡 Exemplos Práticos</h1>
        <p className="text-xl text-gray-600">
          Projetos prontos para deploy na MozHost. Copie, personalize e publique!
        </p>
      </div>

      {/* 1. Bot WhatsApp */}
      <section className="mb-12 pb-12 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">💬</span>
          <h2 className="text-2xl font-bold text-gray-900">Bot WhatsApp com Baileys</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Um bot simples de WhatsApp que responde mensagens automaticamente usando a biblioteca Baileys.
        </p>

        <h3 className="font-semibold text-gray-900 mb-2">package.json</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`{
  "name": "whatsapp-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.0.0",
    "qrcode-terminal": "^0.12.0"
  }
}`}</pre>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">index.js</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation
      || msg.message.extendedTextMessage?.text
      || '';

    const from = msg.key.remoteJid;

    if (text.toLowerCase() === 'ola' || text.toLowerCase() === 'olá') {
      await sock.sendMessage(from, { text: '👋 Olá! Eu sou o bot da MozHost. Como posso ajudar?' });
    } else if (text.toLowerCase() === 'menu') {
      await sock.sendMessage(from, {
        text: '📋 *Menu do Bot*\\n\\n1️⃣ Informações\\n2️⃣ Preços\\n3️⃣ Suporte\\n\\nDigite o número da opção.'
      });
    } else {
      await sock.sendMessage(from, { text: '🤖 Não entendi. Digite *menu* para ver as opções.' });
    }
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp!');
    }
  });
}

startBot();`}</pre>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-sm text-gray-700">
            <strong>Deploy:</strong> Crie um container Node.js → Faça upload via CLI (<code className="bg-gray-100 px-1 rounded">mozhost deploy</code>) → Escaneie o QR code nos logs do container.
          </p>
        </div>
      </section>

      {/* 2. API REST Express */}
      <section className="mb-12 pb-12 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">🚀</span>
          <h2 className="text-2xl font-bold text-gray-900">API REST com Express.js</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Uma API REST simples com operações CRUD para gerenciar tarefas.
        </p>

        <h3 className="font-semibold text-gray-900 mb-2">package.json</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`{
  "name": "tasks-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
}`}</pre>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">index.js</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let tasks = [
  { id: 1, title: 'Aprender MozHost', done: false },
  { id: 2, title: 'Fazer deploy da API', done: false }
];

// Listar tarefas
app.get('/api/tasks', (req, res) => {
  res.json({ success: true, tasks });
});

// Criar tarefa
app.post('/api/tasks', (req, res) => {
  const task = {
    id: tasks.length + 1,
    title: req.body.title,
    done: false
  };
  tasks.push(task);
  res.status(201).json({ success: true, task });
});

// Atualizar tarefa
app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
  task.title = req.body.title || task.title;
  task.done = req.body.done ?? task.done;
  res.json({ success: true, task });
});

// Deletar tarefa
app.delete('/api/tasks/:id', (req, res) => {
  tasks = tasks.filter(t => t.id !== parseInt(req.params.id));
  res.json({ success: true, message: 'Tarefa removida' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 API rodando na porta \${PORT}\`));`}</pre>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-sm text-gray-700">
            <strong>Acesso:</strong> Após deploy, sua API estará disponível em <code className="bg-gray-100 px-1 rounded">https://seu-container.mozhost.shop/api/tasks</code>
          </p>
        </div>
      </section>

      {/* 3. Bot Telegram */}
      <section className="mb-12 pb-12 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">🤖</span>
          <h2 className="text-2xl font-bold text-gray-900">Bot Telegram com Telegraf</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Um bot de Telegram que responde comandos usando a biblioteca Telegraf.
        </p>

        <h3 className="font-semibold text-gray-900 mb-2">package.json</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`{
  "name": "telegram-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "telegraf": "^4.12.0"
  }
}`}</pre>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">index.js</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('👋 Olá! Eu sou o bot da MozHost no Telegram!\\n\\nComandos:\\n/help - Ajuda\\n/info - Informações\\n/ping - Testar conexão');
});

bot.help((ctx) => {
  ctx.reply('📋 Comandos disponíveis:\\n\\n/start - Iniciar\\n/help - Ajuda\\n/info - Informações sobre MozHost\\n/ping - Verificar se estou online');
});

bot.command('info', (ctx) => {
  ctx.reply('🇲🇿 MozHost - Plataforma moçambicana de hospedagem\\n\\n📦 Hospede bots e APIs\\n💰 A partir de 50 MT\\n🌐 mozhost.shop');
});

bot.command('ping', (ctx) => {
  ctx.reply('🏓 Pong! Estou online e funcionando!');
});

bot.on('text', (ctx) => {
  ctx.reply('🤖 Não entendi. Use /help para ver os comandos.');
});

bot.launch().then(() => console.log('✅ Bot Telegram iniciado!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));`}</pre>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-sm text-gray-700">
            <strong>⚠️ Importante:</strong> Configure a variável de ambiente <code className="bg-gray-100 px-1 rounded">BOT_TOKEN</code> com o token obtido do <a href="https://t.me/BotFather" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">@BotFather</a>.
          </p>
        </div>
      </section>

      {/* 4. API Python Flask */}
      <section className="mb-12 pb-12 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">🐍</span>
          <h2 className="text-2xl font-bold text-gray-900">API Python com Flask</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Uma API REST simples construída com Flask (Python).
        </p>

        <h3 className="font-semibold text-gray-900 mb-2">requirements.txt</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`flask==3.0.0
flask-cors==4.0.0`}</pre>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">app.py</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

items = [
    {"id": 1, "name": "Item 1", "price": 100},
    {"id": 2, "name": "Item 2", "price": 200}
]

@app.route('/api/items', methods=['GET'])
def get_items():
    return jsonify({"success": True, "items": items})

@app.route('/api/items', methods=['POST'])
def add_item():
    data = request.get_json()
    item = {
        "id": len(items) + 1,
        "name": data["name"],
        "price": data["price"]
    }
    items.append(item)
    return jsonify({"success": True, "item": item}), 201

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    global items
    items = [i for i in items if i["id"] != item_id]
    return jsonify({"success": True, "message": "Item removido"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)`}</pre>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-sm text-gray-700">
            <strong>Deploy:</strong> Crie um container Python → Faça upload → As dependências do <code className="bg-gray-100 px-1 rounded">requirements.txt</code> são instaladas automaticamente.
          </p>
        </div>
      </section>

      {/* 5. Bot Discord */}
      <section className="mb-12">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">🎮</span>
          <h2 className="text-2xl font-bold text-gray-900">Bot Discord com discord.js</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Um bot de Discord simples que responde comandos e mensagens.
        </p>

        <h3 className="font-semibold text-gray-900 mb-2">package.json</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`{
  "name": "discord-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "discord.js": "^14.14.0"
  }
}`}</pre>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">index.js</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre className="text-sm">{`const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(\`✅ Bot online como \${client.user.tag}\`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('🏓 Pong!');
  }

  if (message.content === '!info') {
    message.reply('🇲🇿 Bot hospedado na MozHost!\\n📦 mozhost.shop');
  }

  if (message.content === '!help') {
    message.reply('📋 Comandos:\\n!ping - Testar\\n!info - Informações\\n!help - Ajuda');
  }
});

client.login(process.env.DISCORD_TOKEN);`}</pre>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-sm text-gray-700">
            <strong>⚠️ Importante:</strong> Configure a variável <code className="bg-gray-100 px-1 rounded">DISCORD_TOKEN</code> com o token do seu bot obtido no <a href="https://discord.com/developers/applications" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Discord Developer Portal</a>.
          </p>
        </div>
      </section>

      {/* Deploy Steps */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🚀 Como Fazer Deploy de Qualquer Exemplo</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <h3 className="font-semibold text-gray-900">Crie um container</h3>
              <p className="text-gray-600 text-sm">No dashboard ou via CLI: <code className="bg-gray-100 px-1 rounded">mozhost create meu-projeto --type nodejs</code></p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <h3 className="font-semibold text-gray-900">Configure variáveis de ambiente</h3>
              <p className="text-gray-600 text-sm">Adicione tokens e secrets nas configurações do container</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <h3 className="font-semibold text-gray-900">Faça deploy do código</h3>
              <p className="text-gray-600 text-sm">Via CLI: <code className="bg-gray-100 px-1 rounded">mozhost deploy</code> ou conecte seu GitHub</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">✓</div>
            <div>
              <h3 className="font-semibold text-gray-900">Pronto!</h3>
              <p className="text-gray-600 text-sm">Seu projeto estará online em <code className="bg-gray-100 px-1 rounded">seu-container.mozhost.shop</code></p>
            </div>
          </div>
        </div>
      </section>

      {/* Navegação */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs/api" className="text-blue-600 hover:text-blue-800">
            ← Referência da API
          </Link>
          <Link href="/docs/faq" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            Próximo: FAQ →
          </Link>
        </div>
      </div>
    </div>
    </div>
  </>
  )
}
