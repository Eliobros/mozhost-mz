import React from 'react';
import BreadcrumbList from '@/components/SEO/BreadcrumbList';

export default function CLICreateDatabasePage() {
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'CLI MozHost', path: '/docs/cli' },
          { name: 'Criar Database', path: '/docs/cli/create-database' },
        ]}
      />
      <div>
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <a href="/docs/cli" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para CLI
        </a>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Gerenciar Databases via CLI</h1>
        <p className="text-xl text-gray-600">
          Crie, liste e gerencie seus bancos de dados diretamente do terminal com comandos simples.
        </p>
      </div>

      {/* Comandos Disponíveis */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Comandos Disponíveis</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">📋</span>
              <h3 className="font-semibold text-gray-900">Listar</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost db:list
            </div>
            <p className="text-sm text-gray-600">Listar todos os databases</p>
          </div>

          <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">➕</span>
              <h3 className="font-semibold text-gray-900">Criar</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost db:create
            </div>
            <p className="text-sm text-gray-600">Criar novo database</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">ℹ️</span>
              <h3 className="font-semibold text-gray-900">Informações</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost db:info &lt;db&gt;
            </div>
            <p className="text-sm text-gray-600">Ver detalhes completos</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🔑</span>
              <h3 className="font-semibold text-gray-900">Credenciais</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost db:credentials &lt;db&gt;
            </div>
            <p className="text-sm text-gray-600">Ver host, porta, senha</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🔗</span>
              <h3 className="font-semibold text-gray-900">Vincular</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost db:link &lt;db&gt; &lt;container&gt;
            </div>
            <p className="text-sm text-gray-600">Vincular a container</p>
          </div>

          <div className="border border-red-200 rounded-lg p-4 hover:border-red-500 transition">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🗑️</span>
              <h3 className="font-semibold text-gray-900">Deletar</h3>
            </div>
            <div className="bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs mb-2">
              mozhost db:delete &lt;db&gt;
            </div>
            <p className="text-sm text-gray-600">Remover database</p>
          </div>
        </div>
      </section>

      {/* Listar Databases */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Listar Databases</h2>

        <p className="text-gray-700 mb-4">
          Para ver todos os seus databases com informações básicas:
        </p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-green-400">$</span> mozhost db:list
        </div>

        <p className="text-sm text-gray-600 mb-4">Ou use o atalho:</p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-6">
          <span className="text-green-400">$</span> mozhost db:ls
        </div>

        {/* Exemplo de output */}
        <div className="bg-gray-900 text-gray-300 p-6 rounded-lg font-mono text-sm">
          <div className="text-cyan-400 font-bold mb-3">💾 Databases (2)</div>
          
          <div className="mb-4">
            <div className="text-green-400">● 🐬 <span className="text-white font-bold">meu-banco</span> <span className="text-gray-500">(8c4c48eb)</span></div>
            <div className="ml-4 text-gray-400">Tipo: mysql</div>
            <div className="ml-4 text-gray-400">Status: <span className="text-green-400">running</span></div>
            <div className="ml-4 text-gray-400">Host: <span className="text-cyan-400">meu-banco-mysql.mozhost.shop</span></div>
            <div className="ml-4 text-gray-400">Porta: 5101</div>
            <div className="ml-4 text-gray-400">Database: db_a4vcv35wm9</div>
          </div>

          <div>
            <div className="text-green-400">● 🍃 <span className="text-white font-bold">api-mongo</span> <span className="text-gray-500">(7b3a92cd)</span></div>
            <div className="ml-4 text-gray-400">Tipo: mongodb</div>
            <div className="ml-4 text-gray-400">Status: <span className="text-green-400">running</span></div>
            <div className="ml-4 text-gray-400">Host: <span className="text-cyan-400">api-mongo-mongodb.mozhost.shop</span></div>
            <div className="ml-4 text-gray-400">Porta: 5102</div>
            <div className="ml-4 text-gray-400">Database: db_mongo_xyz</div>
            <div className="ml-4 text-gray-400">Containers: meu-bot, api-rest</div>
          </div>

          <div className="mt-4 text-yellow-400">💰 Custo total: 10 coins/dia</div>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Ícones por tipo:</strong> 🐬 MySQL, 🦭 MariaDB, 🐘 PostgreSQL, 🍃 MongoDB, 🔴 Redis
          </p>
        </div>
      </section>

      {/* Criar Database */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">➕ Criar Database</h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Comando básico:</h3>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
            <span className="text-green-400">$</span> mozhost db:create <span className="text-blue-400">--name</span> <span className="text-yellow-300">&lt;nome&gt;</span> <span className="text-blue-400">--type</span> <span className="text-yellow-300">&lt;tipo&gt;</span>
          </div>
        </div>

        {/* Tipos disponíveis */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">📚 Tipos disponíveis:</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl mb-1">🐬</div>
              <code className="text-sm font-bold">mysql</code>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl mb-1">🦭</div>
              <code className="text-sm font-bold">mariadb</code>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl mb-1">🐘</div>
              <code className="text-sm font-bold">postgres</code>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl mb-1">🍃</div>
              <code className="text-sm font-bold">mongodb</code>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-2xl mb-1">🔴</div>
              <code className="text-sm font-bold">redis</code>
            </div>
          </div>
        </div>

        {/* Exemplos */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Exemplo 1: MySQL</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost db:create --name meu-banco --type mysql
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Exemplo 2: MongoDB</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost db:create --name api-mongo --type mongodb
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Exemplo 3: Criar e vincular a container</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost db:create --name bot-db --type postgres <span className="text-blue-400">--container</span> meu-bot
            </div>
          </div>
        </div>

        {/* Output esperado */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">📤 Output esperado:</h3>
          <div className="bg-gray-900 text-gray-300 p-6 rounded-lg font-mono text-sm">
            <div className="text-cyan-400 font-bold mb-3">🔨 Criando database...</div>
            <div className="text-gray-400 mb-1">  Nome: meu-banco</div>
            <div className="text-gray-400 mb-3">  Tipo: mysql</div>
            
            <div className="text-green-400 mb-3">✅ Database criado com sucesso!</div>
            
            <div className="text-gray-400 mb-2">📋 Informações do Database:</div>
            <div className="ml-2 text-white mb-1">  ID: 8c4c48eb-cf4c-4ba5-b8e6-74a5c0e4f642</div>
            <div className="ml-2 text-white mb-1">  Nome: meu-banco</div>
            <div className="ml-2 text-white mb-1">  Tipo: mysql</div>
            <div className="ml-2 text-white mb-1">  Status: running</div>
            <div className="ml-2 text-cyan-400 mb-1">  Host: meu-banco-mysql.mozhost.shop</div>
            <div className="ml-2 text-white mb-1">  Porta: 5101</div>
            <div className="ml-2 text-white mb-1">  Database: db_a4vcv35wm9</div>
            <div className="ml-2 text-white mb-1">  Username: user_tevfao6tux</div>
            <div className="ml-2 text-yellow-400 mb-1">  Password: Abc123!@#XyZ</div>
            <div className="ml-2 text-yellow-400 mb-3">  💰 Custo: 5 coins/dia</div>
            
            <div className="text-gray-400 mb-1">🔗 Connection String:</div>
            <div className="ml-2 text-cyan-400 mb-3">  mysql://user_tevfao6tux:Abc123!@#XyZ@meu-banco-mysql.mozhost.shop:5101/db_a4vcv35wm9</div>
            
            <div className="text-gray-400 mb-1">💡 Dicas:</div>
            <div className="ml-2 text-white mb-1">  • Guarde a senha em local seguro</div>
            <div className="ml-2 text-white mb-1">  • Use: mozhost db:credentials meu-banco para ver novamente</div>
            <div className="ml-2 text-white">  • Use: mozhost db:link meu-banco &lt;container&gt; para vincular</div>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-gray-700">
            <strong>⚠️ Importante:</strong> Guarde a senha! Ela só é mostrada uma vez na criação. Use <code className="bg-white px-2 py-1 rounded">mozhost db:credentials</code> para visualizar novamente.
          </p>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>💰 Custo:</strong> Cada database custa <strong>5 coins por dia</strong>. Certifique-se de ter coins suficientes antes de criar.
          </p>
        </div>
      </section>

      {/* Ver Credenciais */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🔑 Ver Credenciais</h2>

        <p className="text-gray-700 mb-4">
          Para visualizar host, porta, username e password de um database:
        </p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-green-400">$</span> mozhost db:credentials <span className="text-yellow-300">&lt;database&gt;</span>
        </div>

        <p className="text-sm text-gray-600 mb-4">Ou use o atalho:</p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-6">
          <span className="text-green-400">$</span> mozhost db:creds meu-banco
        </div>

        {/* Output */}
        <div className="bg-gray-900 text-gray-300 p-6 rounded-lg font-mono text-sm">
          <div className="text-cyan-400 font-bold mb-3">🔑 Credenciais de meu-banco</div>
          <div className="text-white mb-1">  Host: <span className="text-cyan-400">meu-banco-mysql.mozhost.shop</span></div>
          <div className="text-white mb-1">  Porta: <span className="text-cyan-400">5101</span></div>
          <div className="text-white mb-1">  Database: <span className="text-cyan-400">db_a4vcv35wm9</span></div>
          <div className="text-white mb-1">  Username: <span className="text-cyan-400">user_tevfao6tux</span></div>
          <div className="text-white mb-3">  Password: <span className="text-yellow-400">Abc123!@#XyZ</span></div>
          
          <div className="text-gray-400 mb-1">🔗 Connection String:</div>
          <div className="text-cyan-400 mb-3">  mysql://user_tevfao6tux:Abc123!@#XyZ@meu-banco-mysql.mozhost.shop:5101/db_a4vcv35wm9</div>
          
          <div className="text-gray-400">💡 Copie e cole em suas variáveis de ambiente</div>
        </div>
      </section>

      {/* Vincular Database */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🔗 Vincular Database a Container</h2>

        <p className="text-gray-700 mb-4">
          Para permitir que um container acesse um database:
        </p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-green-400">$</span> mozhost db:link <span className="text-yellow-300">&lt;database&gt;</span> <span className="text-yellow-300">&lt;container&gt;</span>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Exemplo: Vincular MySQL ao bot</h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost db:link meu-banco meu-bot
              <div className="text-green-400 mt-2">✅ Database meu-banco vinculado com sucesso!</div>
              <div className="text-gray-400 mt-1">💡 O container agora pode acessar este database</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> Você pode usar o nome ou ID (completo ou parcial) tanto do database quanto do container.
          </p>
        </div>
      </section>

      {/* Informações Detalhadas */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">ℹ️ Informações Detalhadas</h2>

        <p className="text-gray-700 mb-4">
          Para ver todas as informações de um database, incluindo containers vinculados:
        </p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-6">
          <span className="text-green-400">$</span> mozhost db:info meu-banco
        </div>

        {/* Output */}
        <div className="bg-gray-900 text-gray-300 p-6 rounded-lg font-mono text-sm">
          <div className="text-cyan-400 font-bold mb-3">🐬 Informações do Database</div>
          <div className="text-white mb-1">  ID: 8c4c48eb-cf4c-4ba5-b8e6-74a5c0e4f642</div>
          <div className="text-white mb-1">  Nome: meu-banco</div>
          <div className="text-white mb-1">  Tipo: mysql</div>
          <div className="text-white mb-1">  Status: <span className="text-green-400">running</span></div>
          <div className="text-cyan-400 mb-1">  Host: meu-banco-mysql.mozhost.shop</div>
          <div className="text-white mb-1">  Porta: 5101</div>
          <div className="text-white mb-1">  Database: db_a4vcv35wm9</div>
          <div className="text-white mb-1">  Username: user_tevfao6tux</div>
          <div className="text-yellow-400 mb-1">  Password: Abc123!@#XyZ</div>
          <div className="text-yellow-400 mb-3">  💰 Custo: 5 coins/dia</div>
          
          <div className="text-gray-400 mb-1">📦 Containers vinculados:</div>
          <div className="text-white mb-1">  • meu-bot (4ce2ebcd)</div>
          <div className="text-white mb-3">  • api-rest (7b3a92cd)</div>
          
          <div className="text-gray-400 mb-1">📅 Criado em: 21/12/2025, 15:30:45</div>
          <div className="text-gray-400 mb-3">   Atualizado em: 21/12/2025, 17:45:12</div>
          
          <div className="text-gray-400 mb-1">🔗 Connection String:</div>
          <div className="text-cyan-400">  mysql://user_tevfao6tux:Abc123!@#XyZ@meu-banco-mysql.mozhost.shop:5101/db_a4vcv35wm9</div>
        </div>
      </section>

      {/* Deletar Database */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🗑️ Deletar Database</h2>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-800 font-semibold mb-2">⚠️ ATENÇÃO: Esta ação é irreversível!</p>
          <p className="text-red-700 text-sm">
            Todos os dados serão perdidos permanentemente. O CLI pedirá confirmação dupla para evitar acidentes.
          </p>
        </div>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-6">
          <span className="text-green-400">$</span> mozhost db:delete <span className="text-yellow-300">&lt;database&gt;</span>
        </div>

        <p className="text-sm text-gray-600 mb-4">Ou use o atalho:</p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-6">
          <span className="text-green-400">$</span> mozhost db:rm meu-banco
        </div>

        {/* Processo de confirmação */}
        <div className="bg-gray-900 text-gray-300 p-6 rounded-lg font-mono text-sm">
          <div className="text-yellow-400 mb-2">⚠️  ATENÇÃO: Esta ação é irreversível!</div>
          <div className="text-gray-400 mb-3">   Todos os dados serão perdidos permanentemente.</div>
          
          <div className="text-gray-400 mb-1">? Tem certeza que deseja deletar "meu-banco"? <span className="text-white">(y/N)</span> <span className="text-green-400">y</span></div>
          
          <div className="mt-3 text-red-400 mb-1">? Digite o nome do database "meu-banco" para confirmar:</div>
          <div className="text-gray-400 mb-3">  <span className="text-yellow-300">meu-banco</span></div>
          
          <div className="text-green-400">✅ Database meu-banco deletado com sucesso!</div>
        </div>
      </section>

      {/* Atalhos e Dicas */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 Atalhos e Dicas</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>💡 Use nomes ou IDs parciais:</strong>
            </p>
            <div className="bg-white rounded p-2 font-mono text-sm text-gray-900">
              mozhost db:info 8c4c48eb  # ID parcial<br/>
              mozhost db:info meu-banco  # Nome completo
            </div>
          </div>

          <div className="border-l-4 border-green-500 bg-green-50 p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>📋 Comandos curtos:</strong>
            </p>
            <div className="bg-white rounded p-2 font-mono text-sm text-gray-900">
              db:ls = db:list<br/>
              db:rm = db:delete<br/>
              db:creds = db:credentials
            </div>
          </div>

          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>🔗 Connection string pronta:</strong>
            </p>
            <p className="text-sm text-gray-600">
              O CLI já fornece a string de conexão formatada. Copie e cole direto no seu código!
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>💰 Gerencie seus coins:</strong>
            </p>
            <p className="text-sm text-gray-600">
              Cada database custa 5 coins/dia. Use <code className="bg-white px-2 py-1 rounded">mozhost db:list</code> para ver o custo total.
            </p>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-6">
          Agora que você sabe gerenciar databases via CLI, explore:
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/docs/cli/deploy"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Deploy de Projetos →
          </a>
          <a
            href="/docs/variaveis"
            className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Variáveis de Ambiente →
          </a>
          <a
            href="/docs/criar-database"
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Criar pelo Website →
          </a>
        </div>
      </section>
    </div>
    </div>
  </>
  );
}
