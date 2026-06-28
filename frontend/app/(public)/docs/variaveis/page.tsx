// app/docs/variaveis/page.tsx
import Link from 'next/link'

export default function VariaveisPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Variáveis de Ambiente</h1>
        <p className="text-xl text-gray-600">
          Aprenda a configurar e utilizar variáveis de ambiente nos seus containers na MozHost.
        </p>
      </div>

      {/* O que são variáveis de ambiente */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">O Que São Variáveis de Ambiente?</h2>
        <p className="text-gray-700 mb-4">
          Variáveis de ambiente são pares de <strong>chave=valor</strong> que ficam disponíveis para a sua aplicação em tempo de execução. Elas permitem separar configurações sensíveis (como senhas e tokens) do código-fonte do projecto.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mb-6">
          <p className="text-gray-700 mb-2">
            <strong>💡 Por que usar variáveis de ambiente?</strong>
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">🔒</span>
              <span><strong>Segurança</strong> — Senhas e tokens ficam fora do código-fonte</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⚙️</span>
              <span><strong>Flexibilidade</strong> — Altere configurações sem alterar o código</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔄</span>
              <span><strong>Ambientes diferentes</strong> — Use valores distintos para desenvolvimento e produção</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">👥</span>
              <span><strong>Colaboração</strong> — Cada desenvolvedor pode ter suas próprias credenciais</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Configurar via Dashboard */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurar pelo Dashboard</h2>
        <p className="text-gray-700 mb-4">
          A forma mais simples de definir variáveis de ambiente é através do painel de controlo da MozHost:
        </p>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Acesse as configurações do container</h3>
              <p className="text-gray-700">
                No dashboard, clique no container desejado e depois em <strong>"Configurações"</strong> ou <strong>"Settings"</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Encontre a secção de variáveis</h3>
              <p className="text-gray-700">
                Procure pela secção <strong>"Variáveis de Ambiente"</strong> ou <strong>"Environment Variables"</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Adicione as variáveis</h3>
              <p className="text-gray-700 mb-3">
                Preencha o campo <strong>Chave</strong> e o campo <strong>Valor</strong>, depois clique em <strong>"Salvar"</strong>.
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500 mb-1">Chave</p>
                      <code className="text-sm text-gray-900">DATABASE_URL</code>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500 mb-1">Valor</p>
                      <code className="text-sm text-gray-900">mysql://user:pass@host:3306/db</code>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500 mb-1">Chave</p>
                      <code className="text-sm text-gray-900">NODE_ENV</code>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500 mb-1">Valor</p>
                      <code className="text-sm text-gray-900">production</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-6">
          <p className="text-gray-700">
            <strong>✅ Dica:</strong> As variáveis definidas no dashboard ficam disponíveis automaticamente após reiniciar o container.
          </p>
        </div>
      </section>

      {/* Configurar via CLI */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurar pelo CLI</h2>
        <p className="text-gray-700 mb-4">
          Você também pode definir variáveis de ambiente usando o CLI da MozHost:
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Definir uma variável:</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost env:set DATABASE_URL=mysql://user:pass@host:3306/db
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Definir várias de uma vez:</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost env:set NODE_ENV=production PORT=3000 API_KEY=minha-chave
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Listar variáveis definidas:</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost env:list
              <div className="text-gray-400 mt-2">
                <div>DATABASE_URL = mysql://user:***@host:3306/db</div>
                <div>NODE_ENV    = production</div>
                <div>PORT        = 3000</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Remover uma variável:</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
              <span className="text-green-400">$</span> mozhost env:unset API_KEY
            </div>
          </div>
        </div>
      </section>

      {/* Variáveis Comuns */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Variáveis Comuns</h2>
        <p className="text-gray-700 mb-4">
          Estas são as variáveis de ambiente mais utilizadas em projectos hospedados na MozHost:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 border-b">Variável</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 border-b">Descrição</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 border-b">Exemplo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">PORT</code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Porta em que a aplicação escuta</td>
                <td className="px-4 py-3">
                  <code className="text-sm text-gray-600">3000</code>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">DATABASE_URL</code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">String de conexão ao banco de dados</td>
                <td className="px-4 py-3">
                  <code className="text-sm text-gray-600">mysql://user:pass@host:5101/db</code>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">NODE_ENV</code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Ambiente de execução (Node.js)</td>
                <td className="px-4 py-3">
                  <code className="text-sm text-gray-600">production</code>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">API_KEY</code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Chave de API de serviços externos</td>
                <td className="px-4 py-3">
                  <code className="text-sm text-gray-600">sk_live_abc123...</code>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">JWT_SECRET</code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Chave secreta para assinar tokens JWT</td>
                <td className="px-4 py-3">
                  <code className="text-sm text-gray-600">minha-chave-secreta-forte</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Como Acessar no Código */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Como Acessar no Código</h2>
        <p className="text-gray-700 mb-4">
          Depois de definir as variáveis, acesse-as no código da sua aplicação:
        </p>

        <div className="space-y-6">
          {/* Node.js */}
          <div>
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">💚</span>
              <h3 className="text-xl font-semibold text-gray-900">Node.js / JavaScript</h3>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <p className="text-gray-500">// Acessar variáveis de ambiente</p>
              <p><span className="text-green-400">const</span> port = process.env.<span className="text-cyan-400">PORT</span> || <span className="text-yellow-300">3000</span>;</p>
              <p><span className="text-green-400">const</span> dbUrl = process.env.<span className="text-cyan-400">DATABASE_URL</span>;</p>
              <p><span className="text-green-400">const</span> jwtSecret = process.env.<span className="text-cyan-400">JWT_SECRET</span>;</p>
              <br/>
              <p className="text-gray-500">// Exemplo: iniciar servidor</p>
              <p>app.<span className="text-blue-400">listen</span>(port, () =&gt; {'{'}</p>
              <p className="ml-4">console.<span className="text-blue-400">log</span>(<span className="text-yellow-300">{`\`Servidor rodando na porta \${port}\``}</span>);</p>
              <p>{'}'});</p>
            </div>
          </div>

          {/* Python */}
          <div>
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">🐍</span>
              <h3 className="text-xl font-semibold text-gray-900">Python</h3>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <p><span className="text-green-400">import</span> os</p>
              <br/>
              <p className="text-gray-500"># Acessar variáveis de ambiente</p>
              <p>port = os.environ.get(<span className="text-yellow-300">'PORT'</span>, <span className="text-yellow-300">'3000'</span>)</p>
              <p>db_url = os.environ[<span className="text-yellow-300">'DATABASE_URL'</span>]</p>
              <p>jwt_secret = os.environ[<span className="text-yellow-300">'JWT_SECRET'</span>]</p>
              <br/>
              <p className="text-gray-500"># Com valor padrão (não lança erro se não existir)</p>
              <p>api_key = os.environ.get(<span className="text-yellow-300">'API_KEY'</span>, <span className="text-yellow-300">'chave-padrao'</span>)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dicas de Segurança</h2>

        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
            <p className="text-gray-700 mb-2">
              <strong>⚠️ Nunca coloque segredos no código-fonte</strong>
            </p>
            <p className="text-gray-700">
              Tokens, senhas de banco de dados, chaves de API e segredos JWT <strong>nunca</strong> devem ser escritos directamente no código. Sempre use variáveis de ambiente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Errado */}
            <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold text-red-700 mb-3 flex items-center">
                <span className="text-xl mr-2">❌</span>
                Errado
              </h3>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                <p className="text-gray-500">// NÃO faça isso!</p>
                <p><span className="text-green-400">const</span> senha = <span className="text-yellow-300">'minha-senha-123'</span>;</p>
                <p><span className="text-green-400">const</span> token = <span className="text-yellow-300">'sk_live_abc...'</span>;</p>
              </div>
            </div>

            {/* Certo */}
            <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-700 mb-3 flex items-center">
                <span className="text-xl mr-2">✅</span>
                Correcto
              </h3>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                <p className="text-gray-500">// Use variáveis de ambiente</p>
                <p><span className="text-green-400">const</span> senha = process.env.<span className="text-cyan-400">DB_PASSWORD</span>;</p>
                <p><span className="text-green-400">const</span> token = process.env.<span className="text-cyan-400">API_KEY</span>;</p>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <p className="text-sm text-gray-700">
              <strong>📁 Desenvolvimento local:</strong> Use um ficheiro <code className="bg-white px-2 py-1 rounded">.env</code> na raiz do projecto para guardar variáveis localmente. Adicione <code className="bg-white px-2 py-1 rounded">.env</code> ao seu <code className="bg-white px-2 py-1 rounded">.gitignore</code> para nunca enviar segredos ao repositório.
            </p>
          </div>

          <div className="border-l-4 border-purple-500 bg-purple-50 p-4">
            <p className="text-sm text-gray-700">
              <strong>🚀 Produção:</strong> Sempre defina as variáveis de ambiente pelo <strong>dashboard</strong> ou pelo <strong>CLI</strong> da MozHost. Nunca suba ficheiros <code className="bg-white px-2 py-1 rounded">.env</code> para o servidor.
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
            <p className="text-sm text-gray-700">
              <strong>🔑 Chaves fortes:</strong> Para variáveis como <code className="bg-white px-2 py-1 rounded">JWT_SECRET</code>, use strings longas e aleatórias com pelo menos 32 caracteres.
            </p>
          </div>
        </div>
      </section>

      {/* Exemplo Prático */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Exemplo Prático: Conectar ao Database MozHost</h2>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🎯 Objectivo: Conectar um container Node.js ao database MySQL da MozHost</h3>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Definir variáveis via CLI</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
                  <p><span className="text-green-400">$</span> mozhost env:set \</p>
                  <p className="ml-4">DB_HOST=meu-db-mysql.mozhost.shop \</p>
                  <p className="ml-4">DB_PORT=5101 \</p>
                  <p className="ml-4">DB_USER=user_tevfao6tux \</p>
                  <p className="ml-4">DB_PASS=minha-senha-segura \</p>
                  <p className="ml-4">DB_NAME=db_a4vcv35wm9</p>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Usar no código (Node.js com mysql2)</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
                  <p><span className="text-green-400">const</span> mysql = <span className="text-blue-400">require</span>(<span className="text-yellow-300">'mysql2'</span>);</p>
                  <br/>
                  <p><span className="text-green-400">const</span> connection = mysql.<span className="text-blue-400">createConnection</span>({'{'}</p>
                  <p className="ml-4">host: process.env.<span className="text-cyan-400">DB_HOST</span>,</p>
                  <p className="ml-4">port: process.env.<span className="text-cyan-400">DB_PORT</span>,</p>
                  <p className="ml-4">user: process.env.<span className="text-cyan-400">DB_USER</span>,</p>
                  <p className="ml-4">password: process.env.<span className="text-cyan-400">DB_PASS</span>,</p>
                  <p className="ml-4">database: process.env.<span className="text-cyan-400">DB_NAME</span></p>
                  <p>{'}'});</p>
                  <br/>
                  <p>connection.<span className="text-blue-400">connect</span>((err) =&gt; {'{'}</p>
                  <p className="ml-4"><span className="text-purple-400">if</span> (err) {'{'}</p>
                  <p className="ml-8">console.<span className="text-blue-400">error</span>(<span className="text-yellow-300">'Erro ao conectar:'</span>, err);</p>
                  <p className="ml-8"><span className="text-purple-400">return</span>;</p>
                  <p className="ml-4">{'}'}</p>
                  <p className="ml-4">console.<span className="text-blue-400">log</span>(<span className="text-yellow-300">'✅ Conectado ao database MozHost!'</span>);</p>
                  <p>{'}'});</p>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Fazer deploy</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm">
                  <span className="text-green-400">$</span> mozhost deploy
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white border border-green-500 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong className="text-green-600">🎉 Pronto!</strong> A sua aplicação vai conectar ao database usando as variáveis de ambiente, sem nenhuma senha exposta no código.
            </p>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-6">
          Agora que você sabe configurar variáveis de ambiente, explore mais:
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <Link
            href="/docs/criar-database"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-center"
          >
            🗄️ Criar Database
          </Link>
          <Link
            href="/docs/cli"
            className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium text-center"
          >
            💻 CLI da MozHost
          </Link>
          <Link
            href="/docs/cli/deploy"
            className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium text-center"
          >
            📤 Deploy
          </Link>
        </div>
      </section>
    </div>
  )
}
