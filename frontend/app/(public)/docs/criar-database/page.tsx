// app/docs/criar-database/page.tsx - PARTE 1
import Link from 'next/link'
import BreadcrumbList from '@/components/SEO/BreadcrumbList'
import Image from 'next/image'

export default function CriarDatabasePage() {
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'Criar Database', path: '/docs/criar-database' },
        ]}
      />
      <div>
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="mb-8">
        <Link href="/docs/primeiro-container" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Criar Container
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Como Criar um Database</h1>
        <p className="text-xl text-gray-600">
          Aprenda a criar e configurar bancos de dados independentes na MozHost.
        </p>
      </div>

      {/* Importante */}
      <section className="mb-12">
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <p className="text-gray-700 mb-2">
            <strong>💡 Informação Importante:</strong>
          </p>
          <p className="text-gray-700">
            Se você criou um container <strong>PHP</strong>, ele já vem automaticamente com um banco de dados MySQL configurado. Esta página é para criar databases independentes adicionais.
          </p>
        </div>

        <div className="bg-green-50 border-l-4 border-green-600 p-4">
          <p className="text-gray-700">
            <strong>✅ Quando criar um database independente?</strong>
          </p>
          <ul className="mt-2 space-y-1 text-gray-700 list-disc list-inside">
            <li>Para usar com containers Node.js ou Python</li>
            <li>Para projetos que precisam de MongoDB, Redis ou PostgreSQL</li>
            <li>Para ter múltiplos bancos de dados separados</li>
            <li>Para centralizar dados de vários containers</li>
          </ul>
        </div>
      </section>

      {/* Como Acessar */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Como Acessar a Página de Databases</h2>
        <p className="text-gray-700 mb-4">
          Acesse diretamente a página de databases através do link:
        </p>
        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 mb-4">
          <a 
            href="https://mozhost.shop/#database" 
            className="text-blue-600 hover:text-blue-800 font-mono text-lg break-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            mozhost.shop/#database
          </a>
        </div>

        <p className="text-gray-700 mb-4">
          Ou você pode criar o banco de dados pela{' '}
          <a 
            href="https://mozhost.shop/#database" 
            className="text-blue-600 hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            página de database clicando aqui
          </a>.
        </p>

        {/* Screenshot */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem da página "Meus Databases" aqui</p>
          <p className="text-gray-400 text-xs">Screenshot mostrando a lista de databases e botão "Criar Database"</p>
        </div>
      </section>

      {/* Passo a Passo - Passos 1-3 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Passo a Passo para Criar Database</h2>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Clique em "Criar Database"</h3>
              <p className="text-gray-700 mb-4">
                Na página de databases, clique no botão azul "+ Criar Database" no canto superior direito.
              </p>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do botão "Criar Database" aqui</p>
                <p className="text-gray-400 text-xs">Screenshot destacando o botão de criar database</p>
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
              <h3 className="text-xl font-semibold mb-3">Escolha o Nome do Database</h3>
              <p className="text-gray-700 mb-4">
                Digite um nome único e descritivo para identificar seu banco de dados:
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Exemplos de bons nomes:</p>
                <div className="space-y-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <code className="text-sm text-gray-700">meu-banco</code>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <code className="text-sm text-gray-700">teste-final</code>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <code className="text-sm text-gray-700">producao-db</code>
                  </div>
                </div>
              </div>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do formulário de criação aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o campo de nome do database</p>
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
              <h3 className="text-xl font-semibold mb-3">Escolha o Tipo de Database</h3>
              <p className="text-gray-700 mb-4">
                Selecione o tipo de banco de dados que melhor atende seu projeto:
              </p>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* MySQL */}
                <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">🐬</span>
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Popular</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">MySQL</h4>
                  <p className="text-xs text-gray-600">Banco relacional tradicional</p>
                </div>

                {/* PostgreSQL */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer">
                  <span className="text-3xl block mb-2">🐘</span>
                  <h4 className="font-semibold text-gray-900 mb-1">PostgreSQL</h4>
                  <p className="text-xs text-gray-600">Banco relacional avançado</p>
                </div>

                {/* MongoDB */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer">
                  <span className="text-3xl block mb-2">🍃</span>
                  <h4 className="font-semibold text-gray-900 mb-1">MongoDB</h4>
                  <p className="text-xs text-gray-600">Banco NoSQL documental</p>
                </div>

                {/* Redis */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer">
                  <span className="text-3xl block mb-2">⚡</span>
                  <h4 className="font-semibold text-gray-900 mb-1">Redis</h4>
                  <p className="text-xs text-gray-600">Cache em memória</p>
                </div>

                {/* MariaDB */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer">
                  <span className="text-3xl block mb-2">🦭</span>
                  <h4 className="font-semibold text-gray-900 mb-1">MariaDB</h4>
                  <p className="text-xs text-gray-600">Fork otimizado do MySQL</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2"><strong>Qual escolher?</strong></p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>MySQL/MariaDB:</strong> Sites, blogs, e-commerce</li>
                  <li>• <strong>PostgreSQL:</strong> Aplicações empresariais complexas</li>
                  <li>• <strong>MongoDB:</strong> Apps modernos, APIs REST, dados flexíveis</li>
                  <li>• <strong>Redis:</strong> Cache, sessões, filas de mensagens</li>
                </ul>
              </div>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mt-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem da seleção de tipo aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando as opções de tipos de databases</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-gray-700">
          ⬇️ Continue lendo os próximos passos abaixo ⬇️
        </p>
      </div>

	// app/docs/criar-database/page.tsx - PARTE 2 (Continue do código anterior)

// Cole este código após a Parte 1

      {/* Passo a Passo - Passos 4-6 */}
      <section className="mb-12">
        {/* Passo 4 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Configure o Nome de Usuário</h3>
              <p className="text-gray-700 mb-4">
                Digite o nome de usuário que será usado para acessar o banco de dados:
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Exemplo:</p>
                <div className="bg-gray-50 p-3 rounded">
                  <code className="text-sm text-gray-700">user_tevfao6tux</code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * O sistema pode gerar um username automaticamente
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 5 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              5
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Defina a Senha</h3>
              <p className="text-gray-700 mb-4">
                Você pode digitar uma senha personalizada ou usar o botão "Gerar" para criar uma senha segura automaticamente:
              </p>
              
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Opção 1: Senha Manual</p>
                  <div className="bg-gray-50 p-3 rounded mb-2">
                    <code className="text-sm text-gray-700">SuaSenhaSegura123!</code>
                  </div>
                  <p className="text-xs text-gray-500">Mínimo 8 caracteres, inclua letras, números e símbolos</p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Opção 2: Gerar Senha Automática (Recomendado)</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                    🔄 Gerar Senha Segura
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    Clique no botão "Gerar" para criar uma senha forte automaticamente
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="text-sm text-gray-700">
                  <strong>⚠️ Importante:</strong> Guarde sua senha em um local seguro. Você precisará dela para conectar seu container ao database.
                </p>
              </div>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mt-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do campo de senha e botão gerar aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o campo de senha e botão "Gerar"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 6 */}
        <div className="mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              6
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Criar o Database</h3>
              <p className="text-gray-700 mb-4">
                Após preencher todos os campos, clique no botão "Criar Database". O banco será criado em poucos segundos.
              </p>

              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
                Criar Database
              </button>

              {/* Screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mt-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do processo de criação aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o loading ou confirmação de criação</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Informações do Database Criado */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Informações do Database Criado</h2>
        <p className="text-gray-700 mb-6">
          Após a criação, você verá um card com todas as informações de conexão do seu database:
        </p>

        {/* Screenshot Real */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do card completo do database aqui</p>
          <p className="text-gray-400 text-xs">Screenshot mostrando o card com todas as informações</p>
        </div>

        {/* Exemplo do Card */}
        <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-4xl">🐬</span>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">teste-final</h3>
                <p className="text-sm text-gray-500">MYSQL</p>
              </div>
            </div>
            <span className="flex items-center text-sm bg-green-100 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-green-700 font-medium">Rodando</span>
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Host:</p>
                  <code className="text-sm font-mono text-gray-900 break-all">teste-final-mysql.mozhost.shop</code>
                </div>
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  📋
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Porta:</p>
                  <code className="text-sm font-mono text-gray-900">5101</code>
                </div>
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  📋
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Database:</p>
                  <code className="text-sm font-mono text-gray-900">db_a4vcv35wm9</code>
                </div>
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  📋
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Username:</p>
                  <code className="text-sm font-mono text-gray-900">user_tevfao6tux</code>
                </div>
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  📋
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Password:</p>
                  <code className="text-sm font-mono text-gray-900">••••••••</code>
                </div>
                <div className="flex space-x-2">
                  <button className="text-gray-400 hover:text-gray-600">
                    👁️
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>💾 Guarde estas informações:</strong>
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Use o ícone de copiar (📋) ao lado de cada campo para copiar facilmente</li>
            <li>• Você precisará destas credenciais para conectar seu container ao database</li>
            <li>• O ícone de olho (👁️) mostra/oculta a senha</li>
          </ul>
        </div>
      </section>

      {/* Como Conectar */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Como Conectar ao Database</h2>
        <p className="text-gray-700 mb-4">
          Use as credenciais fornecidas para conectar seu container ao database. Aqui estão exemplos de conexão:
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">String de Conexão (MySQL/MariaDB):</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <p>mysql://user_tevfao6tux:sua_senha@teste-final-mysql.mozhost.shop:5101/db_a4vcv35wm9</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Exemplo Node.js:</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <p className="text-gray-500">// Usando mysql2</p>
              <p className="text-green-400">const</p> mysql = <p className="text-blue-400">require</p>(<p className="text-yellow-300">'mysql2'</p>);
              <br/><br/>
              <p className="text-green-400">const</p> connection = mysql.<p className="text-blue-400">createConnection</p>(&#123;
              <br/>
              <span className="ml-4">host: <span className="text-yellow-300">'teste-final-mysql.mozhost.shop'</span>,</span>
              <br/>
              <span className="ml-4">port: <span className="text-yellow-300">5101</span>,</span>
              <br/>
              <span className="ml-4">user: <span className="text-yellow-300">'user_tevfao6tux'</span>,</span>
              <br/>
              <span className="ml-4">password: <span className="text-yellow-300">'sua_senha'</span>,</span>
              <br/>
              <span className="ml-4">database: <span className="text-yellow-300">'db_a4vcv35wm9'</span></span>
              <br/>
              &#125;);
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Exemplo Python:</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <p className="text-green-400">import</p> pymysql
              <br/><br/>
              connection = pymysql.<p className="text-blue-400">connect</p>(
              <br/>
              <span className="ml-4">host=<span className="text-yellow-300">'teste-final-mysql.mozhost.shop'</span>,</span>
              <br/>
              <span className="ml-4">port=<span className="text-yellow-300">5101</span>,</span>
              <br/>
              <span className="ml-4">user=<span className="text-yellow-300">'user_tevfao6tux'</span>,</span>
              <br/>
              <span className="ml-4">password=<span className="text-yellow-300">'sua_senha'</span>,</span>
              <br/>
              <span className="ml-4">database=<span className="text-yellow-300">'db_a4vcv35wm9'</span></span>
              <br/>
              )
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Exemplo PHP:</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <p className="text-purple-400">&lt;?php</p>
              <br/>
              <p className="text-green-400">$host</p> = <span className="text-yellow-300">'teste-final-mysql.mozhost.shop'</span>;
              <br/>
              <p className="text-green-400">$port</p> = <span className="text-yellow-300">5101</span>;
              <br/>
              <p className="text-green-400">$user</p> = <span className="text-yellow-300">'user_tevfao6tux'</span>;
              <br/>
              <p className="text-green-400">$pass</p> = <span className="text-yellow-300">'sua_senha'</span>;
              <br/>
              <p className="text-green-400">$db</p> = <span className="text-yellow-300">'db_a4vcv35wm9'</span>;
              <br/><br/>
              <p className="text-green-400">$conn</p> = <span className="text-blue-400">new</span> mysqli(<p className="text-green-400">$host</p>, <p className="text-green-400">$user</p>, <p className="text-green-400">$pass</p>, <p className="text-green-400">$db</p>, <p className="text-green-400">$port</p>);
              <br/>
              <p className="text-purple-400">?&gt;</p>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-4">
          Agora que você criou seu database, você pode:
        </p>
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Conectar seu container ao database usando as credenciais</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Importar dados existentes para o novo database</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Gerenciar o database através do painel de controle</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Criar backups regulares dos seus dados</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/docs/variaveis" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Configurar Variáveis de Ambiente →
          </Link>
          <Link 
            href="/docs/bots" 
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Ver Guia de Bots →
          </Link>
        </div>
      </section>
    </div>
    </div>
  </>
  )
}
