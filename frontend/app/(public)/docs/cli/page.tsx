// app/docs/cli/page.tsx
import React from 'react';
import BreadcrumbList from '@/components/SEO/BreadcrumbList';

export default function CLIPage() {
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'CLI MozHost', path: '/docs/cli' },
        ]}
      />
      <div>
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <a href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </a>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">CLI da MozHost</h1>
        <p className="text-xl text-gray-600">
          Gerencie seus containers, faça deploy e monitore suas aplicações direto do terminal com o CLI da MozHost.
        </p>
      </div>

      {/* Badge de versão */}
      <div className="mb-8">
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          📦 Versão atual: 2.1.1
        </span>
      </div>

      {/* Pré-requisitos */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Antes de Começar</h2>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
          <p className="text-gray-700 mb-4">
            <strong>📋 Você precisará de:</strong>
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">1️⃣</span>
              <span><strong>Uma conta na MozHost</strong> - Crie sua conta gratuitamente</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2️⃣</span>
              <span><strong>Node.js instalado</strong> - Versão 14 ou superior</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3️⃣</span>
              <span><strong>Terminal/Prompt de comando</strong> - Acesso ao terminal do seu sistema</span>
            </li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Card: Criar conta */}
          <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-2xl mr-2">🌐</span>
              Criar Conta no Website
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Acesse o site da MozHost e crie sua conta gratuitamente em menos de 1 minuto.
            </p>
            <a
              href="https://mozhost.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Criar Conta Agora →
            </a>
          </div>

          {/* Card: Placeholder para vídeo */}
          <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-2xl mr-2">🎥</span>
              Tutorial em Vídeo
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Assista ao tutorial completo logo abaixo ↓
            </p>
            <a
              href="#video-tutorial"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Ir para o Vídeo ↓
            </a>
          </div>
        </div>

        {/* Vídeo Tutorial Embed */}
        <div id="video-tutorial" className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🎬</span>
            Tutorial Completo
          </h3>
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-gray-700 mb-4">
              Assista ao vídeo completo sobre como criar sua conta e fazer seu primeiro deploy:
            </p>
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/hjTLY0nCJdI?si=CPuu96Ctqo3Ghrd5" 
                title="Tutorial MozHost - Como Criar Conta e Primeiro Deploy"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="mt-4 bg-white border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <strong>📺 Neste vídeo você aprenderá:</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                <li>• Como criar sua conta na MozHost</li>
                <li>• Instalação e configuração do CLI</li>
                <li>• Seu primeiro deploy passo a passo</li>
                <li>• Dicas e melhores práticas</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Instalação */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Instalação do CLI</h2>

        {/* Windows */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <span className="text-3xl mr-3">🪟</span>
            <h3 className="text-xl font-semibold text-gray-900">Windows</h3>
          </div>
          <p className="text-gray-700 mb-3">
            Abra o <strong>Prompt de Comando</strong> ou <strong>PowerShell</strong> e execute:
          </p>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
            <span className="text-green-400">C:\Users\Você&gt;</span> npm i -g mozhost-cli
          </div>
        </div>

        {/* Linux/Mac */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <span className="text-3xl mr-3">🐧</span>
            <h3 className="text-xl font-semibold text-gray-900">Linux / macOS</h3>
          </div>
          <p className="text-gray-700 mb-3">
            Abra o <strong>Terminal</strong> e execute com <code className="bg-gray-100 px-2 py-1 rounded">sudo</code>:
          </p>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-3">
            <span className="text-green-400">$</span> sudo npm i -g mozhost-cli
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <strong>💡 Dica:</strong> O sistema pedirá sua senha de administrador. Digite-a e pressione Enter (a senha não aparecerá enquanto você digita, isso é normal).
            </p>
          </div>
        </div>

        {/* Screenshot do terminal */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do terminal durante instalação aqui</p>
          <p className="text-gray-400 text-xs">Screenshot mostrando o comando npm install sendo executado</p>
        </div>

        {/* Aguardar instalação */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-gray-700">
            <strong>⏳ Aguarde:</strong> A instalação pode levar alguns segundos. Você verá o progresso no terminal.
          </p>
        </div>
      </section>

      {/* Verificar Instalação */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Verificar Instalação</h2>

        <p className="text-gray-700 mb-4">
          Após a instalação, verifique se o CLI foi instalado corretamente:
        </p>

        <div className="space-y-4">
          {/* Verificar versão */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Verificar versão instalada:</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-2">
              <span className="text-green-400">$</span> mozhost -V
              <div className="text-cyan-400 mt-1">2.1.1</div>
            </div>
          </div>

          {/* Ver ajuda */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Ver comandos disponíveis:</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-2">
              <span className="text-green-400">$</span> mozhost -h
              <div className="text-gray-400 mt-2">
                <div>Usage: mozhost [options] [command]</div>
                <div className="mt-1">CLI for MozHost - Hospedagem de Bots e APIs</div>
                <div className="mt-2">Commands:</div>
                <div className="ml-4 mt-1">auth          Autenticar na MozHost</div>
                <div className="ml-4">containers|ls  Listar containers</div>
                <div className="ml-4">create         Criar novo container</div>
                <div className="ml-4">deploy         Fazer deploy do projeto</div>
                <div className="ml-4">...</div>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshot */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center my-4">
          <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do output do mozhost -h aqui</p>
          <p className="text-gray-400 text-xs">Screenshot mostrando a lista completa de comandos</p>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <p className="text-gray-700">
            <strong>✅ Sucesso!</strong> Se você vê a versão ou a lista de comandos, o CLI está instalado corretamente.
          </p>
        </div>
      </section>

      {/* Autenticação */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Autenticação</h2>

        <p className="text-gray-700 mb-4">
          Antes de usar o CLI, você precisa fazer login com sua conta da MozHost:
        </p>

        {/* Passo 1: Comando auth */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">1. Execute o comando de autenticação:</h3>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
            <span className="text-green-400">$</span> mozhost auth
          </div>
        </div>

        {/* Passo 2: Digite usuário */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">2. Digite seu nome de usuário:</h3>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
            <div className="text-cyan-400">🔐 Login MozHost</div>
            <div className="mt-2">
              <span className="text-gray-400">? Username:</span> <span className="text-yellow-300">seu-usuario</span>
            </div>
          </div>
        </div>

        {/* Passo 3: Digite senha */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">3. Digite sua senha:</h3>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-3">
            <div className="text-cyan-400">🔐 Login MozHost</div>
            <div className="mt-2">
              <span className="text-gray-400">? Username:</span> <span className="text-yellow-300">seu-usuario</span>
            </div>
            <div>
              <span className="text-gray-400">? Password:</span> <span className="text-gray-600">••••••••</span>
            </div>
            <div className="mt-2 text-green-400">✅ Login realizado com sucesso!</div>
            <div className="text-gray-400">Bem-vindo, seu-usuario!</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <strong>🔒 Segurança:</strong> Sua senha não aparecerá enquanto você digita. Isso é normal e protege sua privacidade.
            </p>
          </div>
        </div>

        {/* Screenshot */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do processo de login aqui</p>
          <p className="text-gray-400 text-xs">Screenshot mostrando o mozhost auth completo</p>
        </div>

        {/* Verificar login */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">4. Verificar usuário autenticado:</h3>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
            <span className="text-green-400">$</span> mozhost whoami
            <div className="text-cyan-400 mt-1">👤 Usuário: seu-usuario</div>
          </div>
        </div>
      </section>

      {/* Comandos Principais */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Comandos Principais</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Containers */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">📦</span>
              <h3 className="font-semibold text-gray-900">Gerenciar Containers</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost ls
            </div>
            <p className="text-sm text-gray-600">Listar todos os seus containers</p>
          </div>

          {/* Criar */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">➕</span>
              <h3 className="font-semibold text-gray-900">Criar Container</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost create -n meu-bot -t nodejs
            </div>
            <p className="text-sm text-gray-600">Criar novo container</p>
          </div>

          {/* Deploy */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🚀</span>
              <h3 className="font-semibold text-gray-900">Deploy</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost deploy
            </div>
            <p className="text-sm text-gray-600">Fazer deploy do projeto atual</p>
          </div>

          {/* Logs */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">📝</span>
              <h3 className="font-semibold text-gray-900">Ver Logs</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost logs meu-container
            </div>
            <p className="text-sm text-gray-600">Visualizar logs em tempo real</p>
          </div>

          {/* Start/Stop */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">⚡</span>
              <h3 className="font-semibold text-gray-900">Iniciar/Parar</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost start meu-container
            </div>
            <p className="text-sm text-gray-600">Controlar estado do container</p>
          </div>

          {/* Database */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🗄️</span>
              <h3 className="font-semibold text-gray-900">Databases</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost db:list
            </div>
            <p className="text-sm text-gray-600">Gerenciar bancos de dados</p>
          </div>
        </div>
      </section>

      {/* Exemplo Prático */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Exemplo Prático: Deploy de um Bot</h2>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🎯 Objetivo: Fazer deploy de um bot Discord</h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div className="flex-1">
                <div className="bg-gray-900 text-gray-300 p-3 rounded font-mono text-sm">
                  <span className="text-green-400">$</span> mozhost create -n discord-bot -t nodejs
                </div>
                <p className="text-sm text-gray-600 mt-1">Criar container Node.js</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div className="flex-1">
                <div className="bg-gray-900 text-gray-300 p-3 rounded font-mono text-sm">
                  <span className="text-green-400">$</span> cd ~/meu-bot-discord
                </div>
                <p className="text-sm text-gray-600 mt-1">Navegar até o projeto</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div className="flex-1">
                <div className="bg-gray-900 text-gray-300 p-3 rounded font-mono text-sm">
                  <span className="text-green-400">$</span> mozhost init
                </div>
                <p className="text-sm text-gray-600 mt-1">Vincular projeto ao container</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div className="flex-1">
                <div className="bg-gray-900 text-gray-300 p-3 rounded font-mono text-sm">
                  <span className="text-green-400">$</span> mozhost deploy
                </div>
                <p className="text-sm text-gray-600 mt-1">Fazer deploy!</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
              <div className="flex-1">
                <div className="bg-gray-900 text-gray-300 p-3 rounded font-mono text-sm">
                  <span className="text-green-400">$</span> mozhost logs discord-bot
                </div>
                <p className="text-sm text-gray-600 mt-1">Acompanhar logs</p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white border border-green-500 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong className="text-green-600">🎉 Pronto!</strong> Seu bot está rodando na MozHost!
            </p>
          </div>
        </div>
      </section>

      {/* Dicas Úteis */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dicas Úteis</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <p className="text-sm text-gray-700">
              <strong>💡 Tab completion:</strong> Pressione <kbd className="bg-white px-2 py-1 rounded border">Tab</kbd> após digitar <code>mozhost</code> para autocompletar comandos
            </p>
          </div>

          <div className="border-l-4 border-green-500 bg-green-50 p-4">
            <p className="text-sm text-gray-700">
              <strong>📋 Copiar comandos:</strong> Clique nos blocos de código desta documentação para copiar automaticamente
            </p>
          </div>

          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <p className="text-sm text-gray-700">
              <strong>🔄 Atualizar CLI:</strong> Execute <code className="bg-white px-2 py-1 rounded">npm i -g mozhost-cli@latest</code> para obter a versão mais recente
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
            <p className="text-sm text-gray-700">
              <strong>❓ Ajuda:</strong> Use <code className="bg-white px-2 py-1 rounded">mozhost &lt;comando&gt; -h</code> para ver ajuda específica de cada comando
            </p>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-6">
          Agora que você instalou e configurou o CLI, explore a documentação completa:
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <a
            href="/docs/cli/deploy"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-center"
          >
            📤 Deploy
          </a>
          <a
            href="/docs/criar-database"
            className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium text-center"
          >
            🗄️ Databases
          </a>
          <a
            href="/docs/variaveis"
            className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium text-center"
          >
            ⚙️ Variáveis
          </a>
        </div>
      </section>
    </div>
    </div>
  </>
  );
}
