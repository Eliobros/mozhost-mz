import Link from 'next/link'

export default function APIReferencePage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">📡 Referência da API</h1>
        <p className="text-xl text-gray-600">
          Documentação completa da API REST da MozHost para integração com seus sistemas.
        </p>
      </div>

      {/* Base URL */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Base URL</h2>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
          <pre className="text-sm">https://api.mozhost.shop</pre>
        </div>
      </section>

      {/* Autenticação */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔐 Autenticação</h2>
        <p className="text-gray-700 mb-4">
          Todas as rotas protegidas requerem um token JWT no header <code className="bg-gray-100 px-2 py-1 rounded text-sm">Authorization</code>:
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4">
          <pre className="text-sm">Authorization: Bearer SEU_TOKEN_JWT</pre>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Como obter o token:</strong> Faça login via <code className="bg-gray-100 px-1 rounded">POST /api/auth/login</code> e use o token retornado.
          </p>
        </div>
      </section>

      {/* Auth Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">👤 Autenticação</h2>

        {/* Login */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">POST</span>
            <code className="text-sm font-mono">/api/auth/login</code>
          </div>
          <p className="text-gray-700 mb-4">Autentica o usuário e retorna um token JWT.</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-3">
            <pre className="text-sm">{`curl -X POST https://api.mozhost.shop/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username": "meu_user", "password": "minha_senha"}'`}</pre>
          </div>
          <p className="font-medium text-gray-900 mb-2">Resposta:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-sm">{`{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": 1,
    "username": "meu_user",
    "email": "user@email.com",
    "plan": "free",
    "coins": 1500
  }
}`}</pre>
          </div>
        </div>

        {/* Register */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">POST</span>
            <code className="text-sm font-mono">/api/auth/register</code>
          </div>
          <p className="text-gray-700 mb-4">Cria uma nova conta na MozHost.</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-sm">{`curl -X POST https://api.mozhost.shop/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "novo_user",
    "email": "user@email.com",
    "password": "senha_segura"
  }'`}</pre>
          </div>
        </div>
      </section>

      {/* Container Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📦 Containers</h2>

        {/* List */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded">GET</span>
            <code className="text-sm font-mono">/api/containers</code>
          </div>
          <p className="text-gray-700 mb-4">Lista todos os containers do usuário autenticado.</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-3">
            <pre className="text-sm">{`curl https://api.mozhost.shop/api/containers \\
  -H "Authorization: Bearer SEU_TOKEN"`}</pre>
          </div>
          <p className="font-medium text-gray-900 mb-2">Resposta:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-sm">{`{
  "success": true,
  "containers": [
    {
      "id": "abc-123",
      "name": "meu-bot",
      "type": "nodejs",
      "status": "running",
      "domain": "meu-bot.mozhost.topaziocoin.online",
      "port": 3001
    }
  ]
}`}</pre>
          </div>
        </div>

        {/* Create */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">POST</span>
            <code className="text-sm font-mono">/api/containers</code>
          </div>
          <p className="text-gray-700 mb-4">Cria um novo container. Custo: 500 coins.</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-sm">{`curl -X POST https://api.mozhost.shop/api/containers \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "meu-bot", "type": "nodejs"}'`}</pre>
          </div>
        </div>

        {/* Start / Stop */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">POST</span>
            <code className="text-sm font-mono">/api/containers/:id/start</code>
          </div>
          <p className="text-gray-700 mb-2">Inicia um container parado.</p>
          <div className="flex items-center gap-3 mb-3 mt-4">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">POST</span>
            <code className="text-sm font-mono">/api/containers/:id/stop</code>
          </div>
          <p className="text-gray-700 mb-4">Para um container em execução.</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-sm">{`curl -X POST https://api.mozhost.shop/api/containers/abc-123/start \\
  -H "Authorization: Bearer SEU_TOKEN"`}</pre>
          </div>
        </div>

        {/* Delete */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">DELETE</span>
            <code className="text-sm font-mono">/api/containers/:id</code>
          </div>
          <p className="text-gray-700 mb-4">Remove um container permanentemente.</p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p className="text-sm text-gray-700">
              <strong>⚠️ Atenção:</strong> Esta ação é irreversível. Todos os arquivos e dados do container serão apagados.
            </p>
          </div>
        </div>
      </section>

      {/* Email Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📧 Emails</h2>

        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">POST</span>
            <code className="text-sm font-mono">/api/emails/send</code>
          </div>
          <p className="text-gray-700 mb-4">Envia um email transacional.</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-sm">{`curl -X POST https://api.mozhost.shop/api/emails/send \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "cliente@email.com",
    "subject": "Pedido Confirmado",
    "html": "<h1>Obrigado!</h1><p>Seu pedido foi confirmado.</p>",
    "fromName": "Minha Loja"
  }'`}</pre>
          </div>
        </div>

        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded">GET</span>
            <code className="text-sm font-mono">/api/emails/quota</code>
          </div>
          <p className="text-gray-700 mb-4">Verifica a quota de emails do mês atual.</p>
        </div>

        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded">GET</span>
            <code className="text-sm font-mono">/api/emails/stats</code>
          </div>
          <p className="text-gray-700 mb-4">Retorna estatísticas de envio (enviados, falhas, taxa de entrega).</p>
        </div>
      </section>

      {/* Database Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🗄️ Databases</h2>

        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded">GET</span>
            <code className="text-sm font-mono">/api/databases</code>
          </div>
          <p className="text-gray-700 mb-4">Lista todos os databases do usuário.</p>
        </div>

        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">POST</span>
            <code className="text-sm font-mono">/api/databases</code>
          </div>
          <p className="text-gray-700 mb-4">Cria um novo database. Custo: 5 coins/dia.</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-sm">{`curl -X POST https://api.mozhost.shop/api/databases \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "meu-db", "type": "mysql"}'`}</pre>
          </div>
        </div>

        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">DELETE</span>
            <code className="text-sm font-mono">/api/databases/:id</code>
          </div>
          <p className="text-gray-700 mb-4">Remove um database permanentemente.</p>
        </div>
      </section>

      {/* Códigos de Erro */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">⚠️ Códigos de Erro</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Código</th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Significado</th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Solução</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-4 py-3"><code className="bg-yellow-100 px-2 py-1 rounded text-sm">400</code></td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Requisição inválida</td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Verifique os parâmetros enviados</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3"><code className="bg-red-100 px-2 py-1 rounded text-sm">401</code></td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Não autorizado</td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Token inválido ou expirado. Faça login novamente.</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3"><code className="bg-red-100 px-2 py-1 rounded text-sm">403</code></td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Acesso negado</td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Sem permissão para este recurso</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3"><code className="bg-yellow-100 px-2 py-1 rounded text-sm">404</code></td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Não encontrado</td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Recurso não existe ou não pertence a você</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3"><code className="bg-orange-100 px-2 py-1 rounded text-sm">429</code></td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Muitas requisições</td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Aguarde alguns minutos e tente novamente</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3"><code className="bg-red-100 px-2 py-1 rounded text-sm">500</code></td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Erro interno</td>
                <td className="border border-gray-200 px-4 py-3 text-gray-700">Problema no servidor. Contacte o suporte.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Navegação */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs" className="text-blue-600 hover:text-blue-800">
            ← Documentação
          </Link>
          <Link href="/docs/exemplos" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            Próximo: Exemplos →
          </Link>
        </div>
      </div>
    </div>
  )
}
