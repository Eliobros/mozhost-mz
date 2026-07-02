import React from 'react';

export default function ComprarCoinsPage() {
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'Comprar Coins', path: '/docs/comprar-coins' },
        ]}
      />
      <div>
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <a href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </a>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Como Comprar Coins</h1>
        <p className="text-xl text-gray-600">
          Aprenda a adicionar saldo (coins) na sua conta MozHost para criar containers e databases.
        </p>
      </div>

      {/* O que são Coins */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 O que são Coins?</h2>
        
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
          <p className="text-gray-700 mb-4">
            <strong>Coins</strong> são a moeda virtual da MozHost usada para criar e manter seus containers e databases rodando.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">📦 Container</div>
              <div className="text-gray-600">Mínimo: <strong>500 coins</strong></div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">🗄️ Database</div>
              <div className="text-gray-600">Custo: <strong>5 coins/dia</strong></div>
            </div>
          </div>
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
            <div className="bg-white rounded p-2 text-sm">
              <div className="text-gray-600">Números: <strong>84xxx / 85xxx</strong></div>
              <div className="text-gray-600">Mínimo: <strong>50 MT = 500 coins</strong></div>
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
            <div className="bg-white rounded p-2 text-sm">
              <div className="text-gray-600">Números: <strong>86xxx / 87xxx</strong></div>
              <div className="text-gray-600">Mínimo: <strong>50 MT = 500 coins</strong></div>
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
            <div className="bg-white rounded p-2 text-sm">
              <div className="text-gray-600">Métodos: <strong>PIX, Cartão, Boleto</strong></div>
              <div className="text-gray-600">Mínimo: <strong>R$ 5 = 500 coins</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* Taxas de Conversão */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">💱 Taxas de Conversão</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Moçambique */}
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🇲🇿</span>
              <div>
                <h3 className="font-bold text-gray-900">Metical Moçambicano (MT)</h3>
                <p className="text-sm text-gray-600">M-Pesa ou e-Mola</p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 font-mono text-sm">
              <div className="mb-2"><strong>1 MT</strong> = <span className="text-green-600">10 coins</span></div>
              <div className="text-xs text-gray-600 mt-3">Exemplos:</div>
              <div className="text-xs text-gray-600">• 50 MT = 500 coins</div>
              <div className="text-xs text-gray-600">• 100 MT = 1,100 coins <span className="text-green-600">(+100 bônus)</span></div>
              <div className="text-xs text-gray-600">• 200 MT = 2,300 coins <span className="text-green-600">(+300 bônus)</span></div>
              <div className="text-xs text-gray-600">• 500 MT = 6,000 coins <span className="text-green-600">(+1000 bônus)</span></div>
            </div>
          </div>

          {/* Brasil */}
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🇧🇷</span>
              <div>
                <h3 className="font-bold text-gray-900">Real Brasileiro (R$)</h3>
                <p className="text-sm text-gray-600">MercadoPago</p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 font-mono text-sm">
              <div className="mb-2"><strong>R$ 1</strong> = <span className="text-green-600">100 coins</span></div>
              <div className="text-xs text-gray-600 mt-3">Exemplos:</div>
              <div className="text-xs text-gray-600">• R$ 5 = 500 coins</div>
              <div className="text-xs text-gray-600">• R$ 10 = 1,100 coins <span className="text-green-600">(+100 bônus)</span></div>
              <div className="text-xs text-gray-600">• R$ 20 = 2,300 coins <span className="text-green-600">(+300 bônus)</span></div>
              <div className="text-xs text-gray-600">• R$ 50 = 6,000 coins <span className="text-green-600">(+1000 bônus)</span></div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>🎁 Bônus:</strong> Quanto mais você compra, mais bônus recebe! Valores maiores têm descontos progressivos.
          </p>
        </div>
      </section>

      {/* Passo a Passo */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📝 Passo a Passo para Comprar</h2>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Acesse sua Página de Perfil</h3>
              <p className="text-gray-700 mb-4">
                Faça login na MozHost e clique no seu avatar no canto superior direito para acessar o perfil.
              </p>
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500 text-sm">📸 Screenshot: Botão de perfil no header</p>
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
              <h3 className="text-xl font-semibold mb-3">Role até Embaixo e Clique em "Comprar Coins"</h3>
              <p className="text-gray-700 mb-4">
                Na página de perfil, role até o final e você verá um botão destacado "Comprar Coins".
              </p>
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
                💰 Comprar Coins
              </button>
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
              <h3 className="text-xl font-semibold mb-3">Selecione o Método de Pagamento</h3>
              <p className="text-gray-700 mb-4">
                Escolha entre M-Pesa, e-Mola (Moçambique) ou MercadoPago (Brasil):
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="border-2 border-red-500 rounded-lg p-4 cursor-pointer hover:bg-red-50 transition">
                  <div className="text-center">
                    <span className="text-3xl">📱</span>
                    <div className="font-semibold mt-2">M-Pesa</div>
                  </div>
                </div>
                <div className="border-2 border-blue-500 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition">
                  <div className="text-center">
                    <span className="text-3xl">💳</span>
                    <div className="font-semibold mt-2">e-Mola</div>
                  </div>
                </div>
                <div className="border-2 border-cyan-500 rounded-lg p-4 cursor-pointer hover:bg-cyan-50 transition">
                  <div className="text-center">
                    <span className="text-3xl">💰</span>
                    <div className="font-semibold mt-2">MercadoPago</div>
                  </div>
                </div>
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
              <h3 className="text-xl font-semibold mb-3">Escolha o Valor ou Digite um Personalizado</h3>
              <p className="text-gray-700 mb-4">
                Selecione um pacote pré-definido ou digite um valor personalizado (mínimo 500 coins):
              </p>
              
              {/* Pacotes exemplo */}
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer">
                  <div className="text-sm text-gray-600">50 MT</div>
                  <div className="text-2xl font-bold text-gray-900">500 coins</div>
                </div>
                <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 relative">
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">Popular</span>
                  <div className="text-sm text-gray-600">100 MT</div>
                  <div className="text-2xl font-bold text-gray-900">1,100 coins</div>
                  <div className="text-xs text-green-600 font-medium">+100 bônus</div>
                </div>
              </div>

              {/* Input personalizado */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm text-gray-700 font-medium mb-2 block">Valor personalizado:</label>
                <input 
                  type="number" 
                  placeholder="Digite o valor (mín. 50 MT)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">Você receberá aproximadamente X coins</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fluxos Específicos por Método */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🔄 Fluxos por Método de Pagamento</h2>

        {/* M-Pesa / e-Mola */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-50 to-blue-50 border-2 border-gray-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">📱💳</span>
              M-Pesa ou e-Mola (Moçambique)
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Digite seu Número</h4>
                    <div className="bg-gray-50 rounded p-3 font-mono text-sm mb-2">
                      <div className="text-gray-600 mb-1">M-Pesa: 84xxx xxxx ou 85xxx xxxx</div>
                      <div className="text-gray-600">e-Mola: 86xxx xxxx ou 87xxx xxxx</div>
                    </div>
                    <p className="text-sm text-gray-600">⚠️ Não precisa adicionar +258, já vem formatado!</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">6</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Aguarde o USSD no seu Celular</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Em aproximadamente <strong>5 segundos</strong>, você receberá um pop-up USSD no seu celular solicitando confirmação do pagamento.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        <strong>📱 No seu celular:</strong> Digite seu PIN para confirmar a transação
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Pronto! Aguarde a Confirmação</h4>
                    <p className="text-sm text-gray-700">
                      Seus coins serão creditados em <strong>até 5 minutos</strong> após a confirmação do pagamento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MercadoPago */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-cyan-50 to-green-50 border-2 border-gray-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">💰</span>
              MercadoPago (Brasil)
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Digite seu Email</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Informe um email válido para receber o comprovante de pagamento.
                    </p>
                    <input 
                      type="email" 
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">6</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Clique no Link de Pagamento</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Será gerado um link seguro do MercadoPago. Clique no botão para ser redirecionado:
                    </p>
                    <button className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition font-medium w-full">
                      🔗 Ir para Página de Pagamento MercadoPago →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">7</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Escolha como Pagar</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Na página do MercadoPago, escolha seu método preferido:
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>• <strong>PIX:</strong> Instantâneo (recomendado)</div>
                      <div>• <strong>Cartão de Crédito:</strong> Parcelamento disponível</div>
                      <div>• <strong>Boleto:</strong> Confirmação em até 3 dias úteis</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Pronto! Aguarde a Confirmação</h4>
                    <p className="text-sm text-gray-700">
                      Seus coins serão creditados em <strong>até 5 minutos</strong> após a confirmação do pagamento pelo MercadoPago.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Suporte */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">❓ Problemas com seu Pagamento?</h2>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
          <p className="text-gray-700 mb-4">
            <strong>⏱️ Prazo normal:</strong> Os coins são creditados em até <strong>5 minutos</strong> após a confirmação do pagamento.
          </p>
          <p className="text-gray-700">
            Se após esse período seus coins não foram creditados, entre em contato com nosso suporte:
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Email */}
          <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-2xl mr-2">📧</span>
              Email
            </h3>
            <a 
              href="mailto:mozhost@topaziocoin.online"
              className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all"
            >
              mozhost@topaziocoin.online
            </a>
          </div>

          {/* WhatsApp */}
          <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-2xl mr-2">💬</span>
              WhatsApp
            </h3>
            <a 
              href="https://api.whatsapp.com/send?phone=258862840075&text=ola+meus+coins+nao+foram+creditados"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
            >
              📱 Falar com Suporte
            </a>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> Tenha em mãos o comprovante do pagamento e o valor enviado para agilizar o atendimento.
          </p>
        </div>
      </section>

      {/* FAQ Rápido */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">❓ Perguntas Frequentes</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Qual o valor mínimo?</h3>
            <p className="text-sm text-gray-600">500 coins (50 MT ou R$ 5)</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Posso comprar coins para outra pessoa?</h3>
            <p className="text-sm text-gray-600">Não. Os coins são creditados apenas na conta de quem fez o pagamento.</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Os coins expiram?</h3>
            <p className="text-sm text-gray-600">Não! Seus coins não têm prazo de validade.</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Posso pedir reembolso?</h3>
            <p className="text-sm text-gray-600">Sim, dentro de 7 dias após a compra, desde que os coins não tenham sido usados. Entre em contato com o suporte.</p>
          </div>
        </div>
      </section>
     {/* No final de cada página */}
<div className="mt-8 pt-6 border-t border-gray-200">
  <div className="flex justify-between items-center">
    <a href="/docs/cli" className="text-blue-600 hover:text-blue-800 flex items-center">
      ← CLI Overview
    </a>
    <a href="/docs/cli/deploy" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
      Próximo: Deploy →
    </a>
  </div>
</div>
    </div>
	
  );
}
