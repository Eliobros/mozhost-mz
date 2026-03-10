import Link from 'next/link'

export default function PrecosPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">💲 Preços e Planos</h1>
        <p className="text-xl text-gray-600">
          Tudo sobre o sistema de coins, preços dos serviços e métodos de pagamento da MozHost.
        </p>
      </div>

      {/* Sistema de Coins */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 Como Funciona o Sistema de Coins</h2>
        <p className="text-gray-700 mb-4">
          A MozHost utiliza um sistema de <strong>coins</strong> (moeda virtual) para facilitar o pagamento dos serviços.
          Você compra coins com dinheiro real e usa para criar containers, databases e outros serviços.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">🇲🇿</span>
              <div>
                <h3 className="font-bold text-gray-900">Metical (MT)</h3>
                <p className="text-sm text-gray-600">Moçambique</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">1 MT = <span className="text-green-600">10 coins</span></p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">🇧🇷</span>
              <div>
                <h3 className="font-bold text-gray-900">Real (R$)</h3>
                <p className="text-sm text-gray-600">Brasil</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">R$ 1 = <span className="text-green-600">100 coins</span></p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-gray-700">
            <strong>💡 Vantagem:</strong> Os coins são pré-pagos — você só gasta quando precisa e não tem surpresas no final do mês.
          </p>
        </div>
      </section>

      {/* Preços dos Serviços */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📦 Preços dos Serviços</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Container */}
          <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">🖥️</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Container</h3>
                <p className="text-sm text-gray-600">Node.js, Python, PHP</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center mb-4">
              <p className="text-4xl font-bold text-blue-600">500 <span className="text-lg text-gray-600">coins</span></p>
              <p className="text-sm text-gray-500 mt-1">pagamento único para criar</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ 512MB de RAM</li>
              <li>✅ 1GB de armazenamento</li>
              <li>✅ HTTPS automático</li>
              <li>✅ Subdomínio gratuito</li>
            </ul>
            <div className="mt-4 text-xs text-gray-500">
              Equivale a: <strong>50 MT</strong> ou <strong>R$ 5</strong>
            </div>
          </div>

          {/* Database */}
          <div className="border-2 border-purple-500 rounded-lg p-6 bg-purple-50">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">🗄️</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Database</h3>
                <p className="text-sm text-gray-600">MySQL, PostgreSQL, MongoDB, Redis</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center mb-4">
              <p className="text-4xl font-bold text-purple-600">5 <span className="text-lg text-gray-600">coins/dia</span></p>
              <p className="text-sm text-gray-500 mt-1">cobrado diariamente</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ ~150 coins/mês</li>
              <li>✅ Backup manual disponível</li>
              <li>✅ Acesso remoto</li>
              <li>✅ phpMyAdmin (MySQL)</li>
            </ul>
            <div className="mt-4 text-xs text-gray-500">
              Equivale a: <strong>~15 MT/mês</strong> ou <strong>~R$ 1,50/mês</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Email Service */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📧 Planos de Email Service</h2>
        <p className="text-gray-700 mb-6">
          Envie emails transacionais e de marketing diretamente das suas aplicações hospedadas na MozHost.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
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
              <li>✅ API completa</li>
              <li>✅ Logs de envio</li>
              <li>✅ Suporte por email</li>
            </ul>
            <div className="text-center">
              <span className="text-green-600 font-semibold text-sm">Incluído para todos</span>
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
              <li>✅ API completa</li>
              <li>✅ Estatísticas avançadas</li>
              <li>✅ Suporte prioritário</li>
            </ul>
            <div className="text-center text-xs text-gray-500">
              10.000 coins/mês
            </div>
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
              <li>✅ Email dedicado</li>
              <li>✅ Webhooks</li>
              <li>✅ Suporte prioritário</li>
            </ul>
            <div className="text-center text-xs text-gray-500">
              50.000 coins/mês
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Saiba mais na documentação completa:{' '}
          <Link href="/docs/email-service" className="text-blue-600 hover:text-blue-800">
            Email Service →
          </Link>
        </div>
      </section>

      {/* Bônus Coins */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🎁 Bônus por Compras Maiores</h2>
        <p className="text-gray-700 mb-6">
          Quanto mais coins você comprar de uma vez, mais bônus ganha! Confira a tabela:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Valor (MT)</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Valor (R$)</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Coins Base</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Bônus</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">50 MT</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">R$ 5</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">500</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-500">—</td>
                <td className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">500 coins</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">100 MT</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">R$ 10</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">1.000</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-green-600 font-medium">+100</td>
                <td className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">1.100 coins</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">200 MT</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">R$ 20</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">2.000</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-green-600 font-medium">+300</td>
                <td className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">2.300 coins</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 font-medium">500 MT</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 font-medium">R$ 50</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">5.000</td>
                <td className="border border-gray-200 px-4 py-3 text-sm text-green-600 font-bold">+1.000 🎉</td>
                <td className="border border-gray-200 px-4 py-3 text-sm font-bold text-green-700">6.000 coins</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>🎁 Dica:</strong> Comprando 500 MT de uma vez, você ganha <strong>20% a mais</strong> em coins! Ideal para quem precisa de vários containers ou databases.
          </p>
        </div>
      </section>

      {/* Métodos de Pagamento */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">💳 Métodos de Pagamento</h2>

        <div className="grid md:grid-cols-3 gap-4">
          {/* M-Pesa */}
          <div className="border-2 border-red-500 bg-red-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">📱</span>
              <span className="text-xl">🇲🇿</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">M-Pesa</h3>
            <p className="text-sm text-gray-600 mb-3">Vodacom (Moçambique)</p>
            <div className="bg-white rounded p-3 text-sm space-y-1">
              <div className="text-gray-600">Números: <strong>84xxx / 85xxx</strong></div>
              <div className="text-gray-600">Mínimo: <strong>50 MT</strong></div>
              <div className="text-gray-600">Confirmação: <strong>~5 min</strong></div>
            </div>
          </div>

          {/* e-Mola */}
          <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">💳</span>
              <span className="text-xl">🇲🇿</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">e-Mola</h3>
            <p className="text-sm text-gray-600 mb-3">Movitel (Moçambique)</p>
            <div className="bg-white rounded p-3 text-sm space-y-1">
              <div className="text-gray-600">Números: <strong>86xxx / 87xxx</strong></div>
              <div className="text-gray-600">Mínimo: <strong>50 MT</strong></div>
              <div className="text-gray-600">Confirmação: <strong>~5 min</strong></div>
            </div>
          </div>

          {/* MercadoPago */}
          <div className="border-2 border-cyan-500 bg-cyan-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">💰</span>
              <span className="text-xl">🇧🇷</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">MercadoPago</h3>
            <p className="text-sm text-gray-600 mb-3">PIX, Cartão, Boleto (Brasil)</p>
            <div className="bg-white rounded p-3 text-sm space-y-1">
              <div className="text-gray-600">Métodos: <strong>PIX, Cartão, Boleto</strong></div>
              <div className="text-gray-600">Mínimo: <strong>R$ 5</strong></div>
              <div className="text-gray-600">Confirmação: <strong>~5 min</strong></div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/docs/comprar-coins"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            💰 Veja como comprar coins passo a passo →
          </Link>
        </div>
      </section>

      {/* Comparação de Custos */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Comparação de Custos Mensais</h2>
        <p className="text-gray-700 mb-6">
          Veja quanto custa manter seus serviços rodando por mês:
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Básico */}
          <div className="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-3xl">🌱</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Iniciante</h3>
              <p className="text-sm text-gray-500">1 container + 1 database</p>
            </div>
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-gray-900">650 <span className="text-lg text-gray-600">coins</span></p>
              <p className="text-sm text-gray-500">~65 MT ou ~R$ 6,50</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>📦 1 Container — 500 coins</li>
              <li>🗄️ 1 Database — ~150 coins/mês</li>
              <li>📧 500 emails/mês grátis</li>
            </ul>
          </div>

          {/* Intermediário */}
          <div className="border-2 border-blue-500 rounded-lg p-6 hover:shadow-lg transition relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                RECOMENDADO
              </span>
            </div>
            <div className="text-center mb-4">
              <span className="text-3xl">🚀</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Profissional</h3>
              <p className="text-sm text-gray-500">2 containers + 2 databases</p>
            </div>
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-blue-600">1.300 <span className="text-lg text-gray-600">coins</span></p>
              <p className="text-sm text-gray-500">~130 MT ou ~R$ 13</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>📦 2 Containers — 1.000 coins</li>
              <li>🗄️ 2 Databases — ~300 coins/mês</li>
              <li>📧 500 emails/mês grátis</li>
            </ul>
          </div>

          {/* Avançado */}
          <div className="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-center mb-4">
              <span className="text-3xl">⭐</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Empresarial</h3>
              <p className="text-sm text-gray-500">5 containers + 3 databases + Email Basic</p>
            </div>
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-gray-900">12.950 <span className="text-lg text-gray-600">coins</span></p>
              <p className="text-sm text-gray-500">~1.295 MT ou ~R$ 129,50</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>📦 5 Containers — 2.500 coins</li>
              <li>🗄️ 3 Databases — ~450 coins/mês</li>
              <li>📧 Email Basic — 10.000 coins/mês</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-sm text-gray-700">
            <strong>⚠️ Nota:</strong> O custo do container é cobrado <strong>uma única vez</strong> na criação. O database é cobrado <strong>diariamente</strong> (5 coins/dia). Os valores mensais acima são estimativas.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">❓ Perguntas Frequentes sobre Preços</h2>

        <div className="space-y-4">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Os coins expiram?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              <strong>Não!</strong> Seus coins nunca expiram. Você pode comprá-los agora e usá-los quando quiser, sem prazo de validade.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Posso pedir reembolso?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Sim, dentro de <strong>7 dias</strong> após a compra, desde que os coins não tenham sido utilizados. Entre em contato com o suporte pelo email mozhost@topaziocoin.online ou WhatsApp.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Qual o valor mínimo para comprar?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              O mínimo é <strong>500 coins</strong>, que corresponde a 50 MT (Moçambique) ou R$ 5 (Brasil).
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              O container tem cobrança mensal?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Não. O container é cobrado <strong>uma única vez</strong> (500 coins na criação). Já o database tem cobrança diária de 5 coins/dia enquanto estiver ativo.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Posso comprar coins para outra pessoa?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Não. Os coins são creditados apenas na conta de quem realizou o pagamento.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              O que acontece se meus coins acabarem?
            </summary>
            <p className="text-gray-700 mt-2 text-sm">
              Seus containers continuam rodando, mas databases sem saldo serão pausados. Recomendamos manter um saldo mínimo para manter seus databases ativos.
            </p>
          </details>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-8 text-center mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Pronto para começar?</h3>
        <p className="text-gray-700 mb-6">
          Compre seus primeiros coins e comece a hospedar seus projetos na MozHost.
        </p>
        <Link
          href="/docs/comprar-coins"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          💰 Como Comprar Coins →
        </Link>
      </section>

      {/* Navegação */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs" className="text-blue-600 hover:text-blue-800 flex items-center">
            ← Documentação
          </Link>
          <Link href="/docs/comprar-coins" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            Próximo: Comprar Coins →
          </Link>
        </div>
      </div>
    </div>
  )
}
