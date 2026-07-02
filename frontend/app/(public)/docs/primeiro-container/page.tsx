// app/docs/primeiro-container/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import BreadcrumbList from '@/components/SEO/BreadcrumbList'

/**
 * HowTo schema — passos para criar o primeiro container na MozHost.
 */
const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Como criar o teu primeiro container na MozHost',
  description: 'Aprende a criar e configurar um container Docker na MozHost em três passos simples.',
  totalTime: 'PT5M',
  tool: [{ '@type': 'HowToTool', name: 'Conta MozHost com +500 coins' }],
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Acede à página de Containers', text: 'Vai a mozhost.shop/containers e clica em "+ Criar Container" (ou "Criar Primeiro Container" se acabaste de criar a conta).' },
    { '@type': 'HowToStep', position: 2, name: 'Escolhe o nome e a tecnologia', text: 'Dá um nome descritivo (ex: bot-whatsapp-vendas), escolhe o tipo (Node.js para bots, Python para Flask/FastAPI, PHP para sites com MySQL integrado) e clica "Criar".' },
    { '@type': 'HowToStep', position: 3, name: 'Recebe o URL e credenciais', text: 'Após a criação, o teu container recebe um subdomínio gratuito (ex: bot-vendas.mozhost.shop) e — no caso de PHP — credenciais MySQL e URL do phpMyAdmin.' },
  ],
}

export default function PrimeiroContainerPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      {/* SEO: BreadcrumbList + HowTo schemas */}
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'Primeiro Container', path: '/docs/primeiro-container' },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_SCHEMA) }}
      />
      <div className="mb-8">
        <Link href="/docs/criar-conta" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Criar Conta
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Criar seu Primeiro Container</h1>
        <p className="text-xl text-gray-600">
          Aprenda a criar e configurar seu primeiro container para hospedar bots ou APIs na MozHost.
        </p>
      </div>

      {/* O que é um Container */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">O que é um Container?</h2>
        <p className="text-gray-700 mb-4">
          Um container é um ambiente isolado onde seu bot ou API será executado. Cada container tem seus próprios recursos (CPU, RAM, storage) e pode ser configurado independentemente.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-gray-700">
            <strong>💡 Exemplo:</strong> Se você tem um bot de WhatsApp e uma API REST, pode criar dois containers separados, cada um com suas próprias configurações e tecnologias.
          </p>
        </div>
      </section>

      {/* Requisitos */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Antes de Começar</h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-gray-700 mb-2">
            <strong>⚠️ Requisito importante:</strong>
          </p>
          <p className="text-gray-700">
            Você precisa ter <strong>mínimo 500 coins</strong> para criar um container. Se você acabou de criar sua conta, já tem <strong>600 coins gratuitos</strong>, então está pronto para começar! 🎉
          </p>
        </div>
      </section>

      {/* Como Acessar */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Como Acessar a Criação de Container</h2>
        <p className="text-gray-700 mb-4">
          Existem duas formas de acessar a página de criação:
        </p>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Opção 1 */}
          <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-2">1. Página de Containers</h3>
            <p className="text-sm text-gray-700 mb-3">
              Acesse diretamente a página de containers:
            </p>
            <div className="bg-white p-2 rounded border border-gray-200">
              <code className="text-xs break-all text-gray-700">
                mozhost.shop/#containers
              </code>
            </div>
          </div>

          {/* Opção 2 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">2. Pelo Dashboard</h3>
            <p className="text-sm text-gray-700 mb-3">
              Quando não tiver containers, verá um botão no dashboard:
            </p>
            <div className="bg-white p-2 rounded border border-gray-200">
              <code className="text-xs break-all text-gray-700">
                mozhost.shop/#dashboard
              </code>
            </div>
          </div>
        </div>

        {/* Screenshot Dashboard */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do dashboard vazio aqui</p>
          <p className="text-gray-400 text-xs">Screenshot mostrando o botão "Criar Primeiro Container" no dashboard</p>
        </div>
      </section>

      {/* Passo a Passo */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Passo a Passo para Criar</h2>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Clique em "Criar Container"</h3>
              <p className="text-gray-700 mb-4">
                No dashboard ou na página de containers, clique no botão "+ Criar Container" ou "Criar Primeiro Container".
              </p>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem da página de containers aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando a lista de containers e botão de criar</p>
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
              <h3 className="text-xl font-semibold mb-3">Preencha o Nome do Container</h3>
              <p className="text-gray-700 mb-4">
                Escolha um nome descritivo para identificar seu container:
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Exemplos de bons nomes:</p>
                <div className="space-y-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <code className="text-sm text-gray-700">bot-whatsapp-vendas</code>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <code className="text-sm text-gray-700">api-rest-produtos</code>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <code className="text-sm text-gray-700">site-portfolio</code>
                  </div>
                </div>
              </div>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do formulário de criação aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o campo de nome do container</p>
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
              <h3 className="text-xl font-semibold mb-3">Escolha o Tipo de Container</h3>
              <p className="text-gray-700 mb-4">
                Selecione a tecnologia que você vai usar no seu projeto:
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                {/* Node.js */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer">
                  <div className="text-center mb-3">
                    <span className="text-4xl">🟢</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">Node.js</h4>
                  <p className="text-xs text-gray-600 text-center">
                    JavaScript/TypeScript
                  </p>
                </div>

                {/* Python */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer">
                  <div className="text-center mb-3">
                    <span className="text-4xl">🐍</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">Python</h4>
                  <p className="text-xs text-gray-600 text-center">
                    Python 3.x
                  </p>
                </div>

                {/* PHP */}
                <div className="border-2 border-purple-500 bg-purple-50 rounded-lg p-4 cursor-pointer">
                  <div className="text-center mb-3">
                    <span className="text-4xl">🐘</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">PHP</h4>
                  <p className="text-xs text-purple-600 text-center font-medium">
                    + MySQL + phpMyAdmin
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                <p className="text-sm text-gray-700">
                  <strong>🎁 Bônus do PHP:</strong> Ao escolher PHP, seu container já vem automaticamente com:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  <li>✓ MySQL Database configurado</li>
                  <li>✓ phpMyAdmin para gerenciar o banco</li>
                  <li>✓ Credenciais de acesso ao banco de dados</li>
                </ul>
              </div>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mt-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem da seleção de tipo aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando as opções Node.js, Python e PHP</p>
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
              <h3 className="text-xl font-semibold mb-3">Clique em "Criar Container"</h3>
              <p className="text-gray-700 mb-4">
                Após preencher o nome e escolher o tipo, clique no botão "Criar Container". O processo de criação levará alguns segundos.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>💰 Custo:</strong> A criação do container consome <strong>500 coins</strong> da sua conta. Você ainda terá 100 coins restantes dos seus 600 iniciais.
                </p>
              </div>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do processo de criação aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o loading/processo de criação do container</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Informações do Container */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Informações do seu Container</h2>
        <p className="text-gray-700 mb-4">
          Após a criação, você verá um card com as informações do seu container:
        </p>

        {/* Screenshot */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do card do container aqui</p>
          <p className="text-gray-400 text-xs">Screenshot mostrando o card completo do container criado</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">O card do container mostra:</h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
              <span className="text-blue-600 font-bold">📛</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Nome do Container</p>
                <p className="text-sm text-gray-600">O nome que você escolheu (ex: bot-whatsapp-vendas)</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
              <span className="text-green-600 font-bold">🔴</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Status</p>
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Online / 
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mx-1"></span>
                  Offline
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
              <span className="text-purple-600 font-bold">🔌</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Porta</p>
                <p className="text-sm text-gray-600">Porta de acesso (ex: 3000, 8080)</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
              <span className="text-blue-600 font-bold">🌐</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">URL</p>
                <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded mt-1">
                  https://seu-container.mozhost.app
                </p>
              </div>
            </div>

            {/* Info especial para PHP */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-medium text-purple-900 mb-2">📊 Se escolheu PHP, também verá:</p>
              <div className="space-y-2 text-sm">
                <div className="bg-white p-2 rounded">
                  <p className="text-gray-600"><strong>Database Host:</strong> <span className="font-mono">localhost</span></p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-gray-600"><strong>Database Name:</strong> <span className="font-mono">seu_database</span></p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-gray-600"><strong>Database User:</strong> <span className="font-mono">admin</span></p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-gray-600"><strong>Database Password:</strong> <span className="font-mono">••••••••</span></p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-gray-600"><strong>phpMyAdmin URL:</strong> <span className="font-mono text-blue-600">https://seu-container.mozhost.app/phpmyadmin</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exemplo Visual do Card */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exemplo de Card de Container</h2>
        
        {/* Card Node.js */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Container Node.js:</h3>
          <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-white to-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🟢</span>
                <div>
                  <h4 className="font-bold text-gray-900">bot-whatsapp-vendas</h4>
                  <p className="text-xs text-gray-500">Node.js 20</p>
                </div>
              </div>
              <span className="flex items-center text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                <span className="text-green-600 font-medium">Online</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">Porta</p>
                <p className="font-mono font-bold text-gray-900">3000</p>
              </div>
              <div className="bg-white p-3 rounded border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">URL</p>
                <p className="font-mono text-xs text-blue-600 truncate">bot-vendas.mozhost.app</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card PHP */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Container PHP (com MySQL):</h3>
          <div className="border border-purple-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🐘</span>
                <div>
                  <h4 className="font-bold text-gray-900">site-portfolio</h4>
                  <p className="text-xs text-gray-500">PHP 8.2 + MySQL</p>
                </div>
              </div>
              <span className="flex items-center text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                <span className="text-green-600 font-medium">Online</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div className="bg-white p-3 rounded border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">Porta</p>
                <p className="font-mono font-bold text-gray-900">80</p>
              </div>
              <div className="bg-white p-3 rounded border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">URL</p>
                <p className="font-mono text-xs text-blue-600 truncate">portfolio.mozhost.app</p>
              </div>
            </div>
            <div className="bg-white border border-purple-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-900 mb-2">📊 Dados MySQL:</p>
              <div className="space-y-1 text-xs font-mono">
                <p><span className="text-gray-500">DB:</span> portfolio_db</p>
                <p><span className="text-gray-500">User:</span> admin</p>
                <p><span className="text-gray-500">phpMyAdmin:</span> <span className="text-blue-600">/phpmyadmin</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-4">
          Agora que você criou seu container, pode:
        </p>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Fazer upload do seu código ou conectar com GitHub</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Configurar variáveis de ambiente</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Acompanhar os logs em tempo real</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Configurar um domínio personalizado</span>
          </div>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-3">
          <Link 
            href="/docs/bots" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Ver Guia de Bots →
          </Link>
          <Link 
            href="/docs/apis" 
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Ver Guia de APIs →
          </Link>
        </div>
      </section>
    </div>
  )
}
