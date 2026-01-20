// app/docs/email-service/page.tsx
import Link from 'next/link'

export default function EmailServicePage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar à introdução
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">📧 Email Service</h1>
        <p className="text-xl text-gray-600">
          Envie emails transacionais e de marketing diretamente dos seus bots e APIs hospedados na MozHost.
        </p>
      </div>

      {/* Introdução */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">O que é o Email Service?</h2>
        <p className="text-gray-700 mb-4">
          O MozHost Email Service permite que você envie emails profissionais diretamente das suas aplicações sem precisar configurar servidores SMTP ou contratar serviços externos separadamente.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-gray-700">
            <strong>Ideal para:</strong>
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
            <li>Bots de WhatsApp que enviam confirmações de pedidos</li>
            <li>APIs que precisam enviar emails de boas-vindas</li>
            <li>Sistemas de recuperação de senha</li>
            <li>Notificações por email</li>
            <li>Newsletters e campanhas de marketing</li>
          </ul>
        </div>
      </section>

      {/* Planos */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Planos Disponíveis</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Free */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-3xl">🆓</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Free</h3>
            </div>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-gray-900">0 MT</p>
              <p className="text-sm text-gray-600">por mês</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li>✅ 500 emails/mês</li>
              <li>✅ Suporte por email</li>
              <li>✅ API completa</li>
              <li>✅ Logs de envio</li>
            </ul>
            <div className="text-center">
              <span className="text-green-600 font-semibold">Incluído para todos</span>
            </div>
          </div>

          {/* Basic */}
          <div className="border-2 border-blue-600 rounded-lg p-6 hover:shadow-lg transition relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                POPULAR
              </span>
            </div>
            <div className="text-center mb-4">
              <span className="text-3xl">💼</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Basic</h3>
            </div>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-blue-600">1.000 MT</p>
              <p className="text-sm text-gray-600">por mês</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li>✅ 5.000 emails/mês</li>
              <li>✅ Suporte prioritário</li>
              <li>✅ API completa</li>
              <li>✅ Estatísticas avançadas</li>
            </ul>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
              Fazer Upgrade
            </button>
          </div>

          {/* Pro */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-3xl">🚀</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Pro</h3>
            </div>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-gray-900">5.000 MT</p>
              <p className="text-sm text-gray-600">por mês</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li>✅ 50.000 emails/mês</li>
              <li>✅ Suporte prioritário</li>
              <li>✅ Email dedicado</li>
              <li>✅ Webhooks</li>
            </ul>
            <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">
              Fazer Upgrade
            </button>
          </div>

          {/* Business */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-3xl">⭐</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Business</h3>
            </div>
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-gray-900">Custom</p>
              <p className="text-sm text-gray-600">sob consulta</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li>✅ Emails ilimitados</li>
              <li>✅ IP dedicado</li>
              <li>✅ SLA garantido</li>
              <li>✅ Suporte 24/7</li>
            </ul>
            <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition">
              Contactar
            </button>
          </div>
        </div>
      </section>

      {/* Como Usar - API REST */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Como Usar a API</h2>

        {/* Autenticação */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-xl font-semibold mb-3">1. Autenticação</h3>
          <p className="text-gray-700 mb-4">
            Todas as requisições precisam incluir sua <strong>MozHost API Key</strong> no header de autorização:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`Authorization: Bearer SUA_MOZHOST_API_KEY`}
            </pre>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
            <p className="text-sm text-gray-700">
              <strong>⚠️ Onde encontrar sua API Key:</strong> Vá no Dashboard → Configurações → API Keys
            </p>
          </div>
        </div>

        {/* Enviar Email */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-xl font-semibold mb-3">2. Enviar Email</h3>
          <p className="text-gray-700 mb-4">
            <strong>Endpoint:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-sm">POST /api/emails/send</code>
          </p>

          {/* Exemplo Node.js */}
          <div className="mb-6">
            <p className="font-medium text-gray-900 mb-2">Exemplo em Node.js:</p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`const fetch = require('node-fetch');

async function enviarEmail() {
  const response = await fetch('https://api.mozhost.topaziocoin.online/api/emails/send', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer SUA_MOZHOST_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: 'cliente@example.com',
      subject: 'Pedido Confirmado',
      html: '<h1>Obrigado!</h1><p>Seu pedido foi confirmado!</p>',
      fromName: 'Minha Loja' // opcional
    })
  });

  const result = await response.json();
  console.log(result);
}

enviarEmail();`}
              </pre>
            </div>
          </div>

          {/* Exemplo Python */}
          <div className="mb-6">
            <p className="font-medium text-gray-900 mb-2">Exemplo em Python:</p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`import requests

url = 'https://api.mozhost.topaziocoin.online/api/emails/send'

headers = {
    'Authorization': 'Bearer SUA_MOZHOST_API_KEY',
    'Content-Type': 'application/json'
}

data = {
    'to': 'cliente@example.com',
    'subject': 'Pedido Confirmado',
    'html': '<h1>Obrigado!</h1><p>Seu pedido foi confirmado!</p>',
    'fromName': 'Minha Loja'
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`}
              </pre>
            </div>
          </div>

          {/* Resposta de Sucesso */}
          <div>
            <p className="font-medium text-gray-900 mb-2">Resposta de sucesso:</p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`{
  "success": true,
  "messageId": "abc123...",
  "message": "Email enviado com sucesso",
  "quota": {
    "used": 10,
    "limit": 500,
    "remaining": 490
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Ver Quota */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-xl font-semibold mb-3">3. Verificar Quota</h3>
          <p className="text-gray-700 mb-4">
            <strong>Endpoint:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /api/emails/quota</code>
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`curl https://api.mozhost.topaziocoin.online/api/emails/quota \\
  -H "Authorization: Bearer SUA_MOZHOST_API_KEY"`}
            </pre>
          </div>
          <p className="font-medium text-gray-900 mt-4 mb-2">Resposta:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`{
  "success": true,
  "data": {
    "used": 234,
    "limit": 500,
    "remaining": 266,
    "percentage": "46.80",
    "plan": "free"
  }
}`}
            </pre>
          </div>
        </div>

        {/* Ver Estatísticas */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-xl font-semibold mb-3">4. Ver Estatísticas</h3>
          <p className="text-gray-700 mb-4">
            <strong>Endpoint:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /api/emails/stats</code>
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`curl https://api.mozhost.topaziocoin.online/api/emails/stats \\
  -H "Authorization: Bearer SUA_MOZHOST_API_KEY"`}
            </pre>
          </div>
          <p className="font-medium text-gray-900 mt-4 mb-2">Resposta:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`{
  "success": true,
  "data": {
    "thisMonth": {
      "sent": 228,
      "failed": 6,
      "total": 234,
      "quota": 500,
      "remaining": 266,
      "deliveryRate": 97.44
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Ver Histórico */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3">5. Ver Histórico de Emails</h3>
          <p className="text-gray-700 mb-4">
            <strong>Endpoint:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /api/emails/logs?page=1&limit=20</code>
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`curl "https://api.mozhost.topaziocoin.online/api/emails/logs?page=1&limit=20" \\
  -H "Authorization: Bearer SUA_MOZHOST_API_KEY"`}
            </pre>
          </div>
          <p className="font-medium text-gray-900 mt-4 mb-2">Resposta:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "recipient_email": "cliente@example.com",
        "subject": "Pedido confirmado",
        "status": "sent",
        "sent_at": "2026-01-08T02:29:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 234,
      "pages": 12
    }
  }
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Casos de Uso */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Casos de Uso Comuns</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bot de E-commerce */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🛒</span>
              <h3 className="text-lg font-semibold">Bot de E-commerce</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              Envie confirmações de pedidos, atualizações de rastreamento e notas fiscais automaticamente.
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs">
              <code className="text-gray-700">
                Cliente faz pedido → Bot confirma → Email enviado
              </code>
            </div>
          </div>

          {/* Sistema de Autenticação */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🔐</span>
              <h3 className="text-lg font-semibold">Autenticação</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              Emails de boas-vindas, verificação de conta e recuperação de senha.
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs">
              <code className="text-gray-700">
                Novo usuário → Email de verificação → Conta ativada
              </code>
            </div>
          </div>

          {/* Notificações */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🔔</span>
              <h3 className="text-lg font-semibold">Notificações</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              Alertas de sistema, avisos importantes e lembretes automáticos.
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs">
              <code className="text-gray-700">
                Evento importante → Sistema detecta → Email de alerta
              </code>
            </div>
          </div>

          {/* Newsletter */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">📰</span>
              <h3 className="text-lg font-semibold">Newsletter</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              Campanhas de marketing, promoções e atualizações de produtos.
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs">
              <code className="text-gray-700">
                Nova promoção → Lista de clientes → Emails em massa
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Boas Práticas */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Boas Práticas</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Use HTML bem formatado</p>
              <p className="text-sm text-gray-600">Estruture seus emails com tags HTML semânticas para melhor renderização</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Personalize o fromName</p>
              <p className="text-sm text-gray-600">Use um nome reconhecível (ex: "Loja do João") ao invés de "MozHost"</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Monitore sua quota</p>
              <p className="text-sm text-gray-600">Verifique regularmente quantos emails você já enviou no mês</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-red-600 text-xl">❌</span>
            <div>
              <p className="font-medium text-gray-900">Não envie spam</p>
              <p className="text-sm text-gray-600">Só envie emails para pessoas que autorizaram receber suas mensagens</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-red-600 text-xl">❌</span>
            <div>
              <p className="font-medium text-gray-900">Evite conteúdo suspeito</p>
              <p className="text-sm text-gray-600">Palavras como "GRÁTIS", "GANHE DINHEIRO" podem fazer seus emails irem pro spam</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Perguntas Frequentes</h2>
        <div className="space-y-4">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Os emails vão pro spam?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Usamos servidores com boa reputação (Brevo) e seguimos as melhores práticas de deliverability. 
              A taxa de entrega típica é de 95-98% na caixa de entrada.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Posso enviar anexos?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Atualmente não suportamos anexos diretamente. Você pode incluir links para download de arquivos hospedados na sua aplicação.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              O que acontece se exceder a quota?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              As requisições retornarão erro 429 (Quota Excedida). Você precisará fazer upgrade do plano ou aguardar o próximo mês.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Posso rastrear aberturas e cliques?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Nos planos Pro e Business, oferecemos webhooks que notificam quando emails são abertos ou links são clicados.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Quanto tempo leva para enviar?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Os emails são enviados instantaneamente (em média 1-3 segundos). A entrega na caixa de entrada do destinatário depende do provedor dele.
            </p>
          </details>
        </div>
      </section>

      {/* Suporte */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Precisa de Ajuda?</h2>
        <p className="text-gray-700 mb-4">
          Nossa equipe de suporte está disponível para ajudar com qualquer dúvida sobre o Email Service.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="mailto:suporte@mozhost.co.mz" className="inline-flex items-center bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            <span className="mr-2">📧</span>
            suporte@mozhost.co.mz
          </a>
          <a href="https://wa.me/258..." className="inline-flex items-center bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            <span className="mr-2">💬</span>
            WhatsApp
          </a>
        </div>
      </section>
    </div>
  )
}
