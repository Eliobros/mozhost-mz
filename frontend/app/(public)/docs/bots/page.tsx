// app/docs/bots/page.tsx
import Link from 'next/link'
import BreadcrumbList from '@/components/SEO/BreadcrumbList'

/**
 * HowTo schema — passos para fazer deploy de um bot (WhatsApp com Baileys).
 */
const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Como hospedar um bot WhatsApp na MozHost',
  description: 'Guia completo para fazer deploy de bots WhatsApp (Baileys), Telegram (Telegraf) e Discord (discord.js) na MozHost.',
  totalTime: 'PT10M',
  tool: [
    { '@type': 'HowToTool', name: 'Container Node.js na MozHost' },
    { '@type': 'HowToTool', name: 'Biblioteca Baileys / Telegraf / discord.js' },
  ],
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Cria um container Node.js', text: 'Vai a /docs/primeiro-container ou directamente ao painel e cria um container do tipo Node.js com nome descritivo (ex: bot-whatsapp-vendas).' },
    { '@type': 'HowToStep', position: 2, name: 'Faz upload do código', text: 'Envia um .zip com o teu projeto (inclui package.json e index.js, mas NÃO envie node_modules) ou conecta o repositório GitHub. As dependências são instaladas automaticamente.' },
    { '@type': 'HowToStep', position: 3, name: 'Configura variáveis de ambiente', text: 'No painel do container adiciona variáveis como BOT_TOKEN, WHATSAPP_SESSION, DATABASE_URL — nunca coloquem tokens directamente no código.' },
    { '@type': 'HowToStep', position: 4, name: 'Inicia o bot', text: 'Clica em "Iniciar" no painel. Para bots WhatsApp com Baileys verás um QR Code nos logs — escaneia com o teu WhatsApp para autenticar. Sessões seguintes são automáticas.' },
  ],
}

export default function BotsPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* SEO: BreadcrumbList + HowTo schemas */}
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'Hospedar Bots', path: '/docs/bots' },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_SCHEMA) }}
      />
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar à introdução
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🤖 Hospedar Bots na MozHost</h1>
        <p className="text-xl text-gray-600">
          Guia completo para fazer deploy de bots de WhatsApp, Telegram e Discord na MozHost.
        </p>
      </div>

      {/* Tipos de Bots Suportados */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tipos de Bots Suportados</h2>
        <p className="text-gray-700 mb-6">
          A MozHost suporta os principais tipos de bots usados em Moçambique e no mundo. Escolha a plataforma que melhor se adapta ao seu projecto.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* WhatsApp */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-4xl">💬</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">WhatsApp</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Crie bots para atendimento ao cliente, vendas e automações via WhatsApp.
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <code className="text-gray-700">Baileys</code> — Leve e rápido
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <code className="text-gray-700">Venom-bot</code> — Fácil de usar
              </div>
            </div>
          </div>

          {/* Telegram */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-4xl">✈️</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Telegram</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Bots com comandos, inline queries, teclados personalizados e mais.
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <code className="text-gray-700">telegraf</code> — Framework moderno
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <code className="text-gray-700">node-telegram-bot-api</code> — Simples e directo
              </div>
            </div>
          </div>

          {/* Discord */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-4xl">🎮</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Discord</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Bots para servidores Discord com slash commands, eventos e moderação.
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <code className="text-gray-700">discord.js</code> — A biblioteca mais popular
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-6">
          <p className="text-gray-700">
            <strong>💡 Dica:</strong> Todos os bots acima funcionam com <strong>Node.js</strong>. Ao criar o container, escolha o tipo <strong>Node.js</strong> para ter o ambiente já configurado.
          </p>
        </div>
      </section>

      {/* Passo a Passo para Deploy */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Passo a Passo para Deploy</h2>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Criar um Container Node.js</h3>
              <p className="text-gray-700 mb-4">
                Acesse a página de containers e crie um novo container do tipo <strong>Node.js</strong>. Dê um nome descritivo, por exemplo: <code className="bg-gray-100 px-2 py-1 rounded text-sm">bot-whatsapp-vendas</code>.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                <p className="text-sm text-gray-700">
                  <strong>💡 Lembre-se:</strong> Você precisa de no mínimo <strong>500 coins</strong> para criar um container. Novos utilizadores recebem 600 coins gratuitos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 2 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Fazer Upload do Código</h3>
              <p className="text-gray-700 mb-4">
                Após criar o container, faça upload dos ficheiros do seu bot. Você pode enviar um arquivo <code className="bg-gray-100 px-2 py-1 rounded text-sm">.zip</code> com todo o projecto ou conectar directamente ao seu repositório GitHub.
              </p>
              <p className="text-gray-700 mb-4">
                Certifique-se de que o seu projecto inclui:
              </p>
              <div className="space-y-2">
                <div className="bg-gray-50 p-3 rounded flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <code className="text-sm text-gray-700">package.json</code>
                  <span className="text-sm text-gray-500">— com as dependências</span>
                </div>
                <div className="bg-gray-50 p-3 rounded flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <code className="text-sm text-gray-700">index.js</code> ou <code className="text-sm text-gray-700">bot.js</code>
                  <span className="text-sm text-gray-500">— ficheiro principal</span>
                </div>
                <div className="bg-gray-50 p-3 rounded flex items-center space-x-2">
                  <span className="text-red-600">✗</span>
                  <code className="text-sm text-gray-700">node_modules/</code>
                  <span className="text-sm text-gray-500">— não envie, será instalado automaticamente</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 3 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Configurar Variáveis de Ambiente</h3>
              <p className="text-gray-700 mb-4">
                No painel do container, adicione as variáveis de ambiente que o seu bot precisa. Nunca coloque tokens ou senhas directamente no código.
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
{`# Exemplos de variáveis de ambiente
BOT_TOKEN=seu_token_do_telegram_aqui
WHATSAPP_SESSION=nome_da_sessao
DISCORD_TOKEN=seu_token_do_discord
DATABASE_URL=mongodb://localhost:27017/meubot
PORT=3000`}
                </pre>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="text-sm text-gray-700">
                  <strong>⚠️ Segurança:</strong> Nunca faça commit de tokens ou senhas no GitHub. Use sempre variáveis de ambiente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 4 */}
        <div className="mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Iniciar o Bot</h3>
              <p className="text-gray-700 mb-4">
                Clique em <strong>"Iniciar"</strong> no painel do container. A MozHost irá instalar as dependências (<code className="bg-gray-100 px-2 py-1 rounded text-sm">npm install</code>) e executar o seu bot automaticamente.
              </p>
              <p className="text-gray-700">
                Acompanhe o estado do bot nos logs em tempo real. Se tudo correr bem, verá o status <span className="inline-flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span><span className="text-green-600 font-medium">Online</span></span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Exemplo: Bot WhatsApp */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exemplo: Bot de WhatsApp com Baileys</h2>
        <p className="text-gray-700 mb-4">
          Um bot simples que responde a mensagens recebidas no WhatsApp usando a biblioteca <strong>Baileys</strong>.
        </p>

        <p className="font-medium text-gray-900 mb-2">1. <code className="bg-gray-100 px-2 py-1 rounded text-sm">package.json</code></p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <pre className="text-sm">
{`{
  "name": "bot-whatsapp",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.0.0",
    "qrcode-terminal": "^0.12.0"
  }
}`}
          </pre>
        </div>

        <p className="font-medium text-gray-900 mb-2">2. <code className="bg-gray-100 px-2 py-1 rounded text-sm">index.js</code></p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <pre className="text-sm">
{`const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('Reconectando...');
        iniciarBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const texto = msg.message.conversation
      || msg.message.extendedTextMessage?.text
      || '';

    if (texto.toLowerCase() === 'oi') {
      await sock.sendMessage(msg.key.remoteJid, {
        text: 'Olá! 👋 Sou o bot da MozHost. Como posso ajudar?'
      });
    }

    if (texto.toLowerCase() === '!menu') {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '*📋 Menu do Bot*\\n\\n'
          + '1️⃣ Informações\\n'
          + '2️⃣ Suporte\\n'
          + '3️⃣ Preços\\n\\n'
          + 'Responda com o número da opção.'
      });
    }
  });
}

iniciarBot();`}
          </pre>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-gray-700">
            <strong>💡 QR Code:</strong> Na primeira execução, o bot irá gerar um QR Code nos logs. Escaneie com o WhatsApp para autenticar. As sessões seguintes serão automáticas.
          </p>
        </div>
      </section>

      {/* Exemplo: Bot Telegram */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exemplo: Bot de Telegram com Telegraf</h2>
        <p className="text-gray-700 mb-4">
          Um bot de Telegram que responde a comandos usando o framework <strong>Telegraf</strong>.
        </p>

        <p className="font-medium text-gray-900 mb-2">1. <code className="bg-gray-100 px-2 py-1 rounded text-sm">package.json</code></p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <pre className="text-sm">
{`{
  "name": "bot-telegram",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "telegraf": "^4.16.0"
  }
}`}
          </pre>
        </div>

        <p className="font-medium text-gray-900 mb-2">2. <code className="bg-gray-100 px-2 py-1 rounded text-sm">index.js</code></p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
          <pre className="text-sm">
{`const { Telegraf } = require('telegraf');

// Use variável de ambiente para o token
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    'Bem-vindo ao Bot MozHost! 🇲🇿\\n\\n'
    + 'Comandos disponíveis:\\n'
    + '/ajuda - Ver comandos\\n'
    + '/info - Sobre a MozHost\\n'
    + '/status - Estado do serviço'
  );
});

bot.command('ajuda', (ctx) => {
  ctx.reply(
    '📋 *Comandos disponíveis:*\\n\\n'
    + '/start - Iniciar o bot\\n'
    + '/ajuda - Lista de comandos\\n'
    + '/info - Informações sobre a MozHost\\n'
    + '/status - Estado do serviço',
    { parse_mode: 'Markdown' }
  );
});

bot.command('info', (ctx) => {
  ctx.reply(
    '🏢 *MozHost*\\n\\n'
    + 'A primeira plataforma moçambicana de hospedagem '
    + 'para Bots e APIs.\\n\\n'
    + '🌐 mozhost.co.mz',
    { parse_mode: 'Markdown' }
  );
});

bot.command('status', (ctx) => {
  ctx.reply('✅ Todos os serviços estão operacionais!');
});

bot.on('text', (ctx) => {
  ctx.reply('Não entendi. Use /ajuda para ver os comandos disponíveis.');
});

bot.launch();
console.log('🤖 Bot do Telegram iniciado!');

// Desligar graciosamente
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));`}
          </pre>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-gray-700">
            <strong>💡 Como obter o token:</strong> Fale com o <a href="https://t.me/BotFather" className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">@BotFather</a> no Telegram. Use o comando <code className="bg-white px-1 rounded">/newbot</code> e siga as instruções. Copie o token e adicione como variável de ambiente <code className="bg-white px-1 rounded">BOT_TOKEN</code>.
          </p>
        </div>
      </section>

      {/* Dicas Importantes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dicas Importantes</h2>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Use <code className="bg-gray-100 px-2 py-1 rounded text-sm">process.env</code> para tokens e senhas</p>
              <p className="text-sm text-gray-600">
                Nunca coloque credenciais directamente no código. Configure-as como variáveis de ambiente no painel do container.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Mantenha o bot sempre activo com auto-restart</p>
              <p className="text-sm text-gray-600">
                A MozHost reinicia automaticamente o seu bot em caso de crash. Certifique-se de que o bot reconecta correctamente ao iniciar (veja o exemplo do WhatsApp acima).
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Monitore os logs regularmente</p>
              <p className="text-sm text-gray-600">
                Use o painel de logs em tempo real para acompanhar erros e comportamento do bot. Logs são essenciais para debuggar problemas.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Adicione tratamento de erros no código</p>
              <p className="text-sm text-gray-600">
                Use <code className="bg-gray-100 px-1 rounded text-sm">try/catch</code> nas funções principais para evitar que o bot pare por erros inesperados.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Defina o script <code className="bg-gray-100 px-2 py-1 rounded text-sm">start</code> no <code className="bg-gray-100 px-2 py-1 rounded text-sm">package.json</code></p>
              <p className="text-sm text-gray-600">
                A MozHost usa <code className="bg-gray-100 px-1 rounded text-sm">npm start</code> para iniciar o seu bot. Certifique-se de que o script está configurado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problemas Comuns */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Problemas Comuns e Soluções</h2>

        <div className="space-y-4">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              O bot inicia mas fica offline depois de alguns minutos
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Verifique se o bot tem lógica de reconexão automática. Para bots de WhatsApp com Baileys, use o evento <code className="bg-gray-100 px-1 rounded">connection.update</code> para reconectar quando a conexão cair (veja o exemplo acima). Para Telegram, o Telegraf já faz isso automaticamente.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Erro: &quot;Cannot find module&quot; ao iniciar
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              As dependências não foram instaladas correctamente. Verifique se o <code className="bg-gray-100 px-1 rounded">package.json</code> lista todas as dependências necessárias. Reinicie o container para forçar um novo <code className="bg-gray-100 px-1 rounded">npm install</code>.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Erro: &quot;TOKEN não definido&quot; ou variável de ambiente vazia
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Confirme que adicionou a variável de ambiente no painel do container. O nome deve ser exactamente o mesmo usado no código (ex: <code className="bg-gray-100 px-1 rounded">BOT_TOKEN</code>). Após adicionar, reinicie o container.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Bot de WhatsApp pede QR Code novamente
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              A sessão do WhatsApp expirou ou foi desconectada. Verifique nos logs se aparece um novo QR Code e escaneie novamente. Certifique-se de que a pasta <code className="bg-gray-100 px-1 rounded">auth_info</code> está a ser guardada no volume persistente do container.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Bot do Telegram não responde aos comandos
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Verifique se o token está correcto. Teste acessando <code className="bg-gray-100 px-1 rounded">https://api.telegram.org/bot&lt;SEU_TOKEN&gt;/getMe</code> no navegador. Se retornar erro, o token é inválido — gere um novo com o @BotFather.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Erro de memória ou container reiniciando constantemente
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              O seu bot pode estar a usar muita memória. Verifique as métricas no dashboard. Evite guardar grandes quantidades de dados em memória. Se necessário, faça upgrade do plano do container para mais recursos.
            </p>
          </details>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-4">
          Agora que o seu bot está hospedado, explore mais funcionalidades:
        </p>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Conectar um domínio personalizado ao seu bot</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Configurar base de dados para guardar informações</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Usar o Email Service para enviar notificações</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Integrar com a CLI da MozHost para deploys rápidos</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/docs/criar-database"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Criar Base de Dados →
          </Link>
          <Link
            href="/docs/email-service"
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Email Service →
          </Link>
        </div>
      </section>
    </div>
  )
}
