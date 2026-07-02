// app/docs/criar-conta/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import BreadcrumbList from '@/components/SEO/BreadcrumbList'

/**
 * HowTo schema — rich snippet do Google para tutoriais passo-a-passo.
 * Cada passo indica nome + texto + (opcional) url onde o passo é executado.
 */
const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Como criar uma conta na MozHost',
  description: 'Tutorial passo-a-passo para criar conta grátis na MozHost, receber 600 coins iniciais e entrar no dashboard.',
  totalTime: 'PT3M',
  tool: [{ '@type': 'HowToTool', name: 'Navegador web (Chrome/Firefox/Safari)' }],
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Acede à página de registo', text: 'Visita a página de registo em mozhost.shop/registar e verás o formulário de criação de conta.' },
    { '@type': 'HowToStep', position: 2, name: 'Preenche os dados', text: 'Insere um nome de utilizador único, email válido, número de telefone (se escolheres verificação por SMS/WhatsApp) e uma senha com pelo menos 6 caracteres.' },
    { '@type': 'HowToStep', position: 3, name: 'Escolhe o método de verificação', text: 'Seleciona Email, SMS ou WhatsApp como método de verificação e aceita os Termos e Condições.' },
    { '@type': 'HowToStep', position: 4, name: 'Insere o código de verificação', text: 'Receberás um código de 6 dígitos pelo método escolhido. Insere-o na página seguinte para confirmar a sua conta.' },
    { '@type': 'HowToStep', position: 5, name: 'Entrar no dashboard', text: 'Após verificar o código, a tua conta é criada com 600 coins grátis e serás redirecionado automaticamente para o dashboard MozHost.' },
  ],
}

export default function CriarContaPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      {/* SEO: BreadcrumbList + HowTo schemas (rich snippets do Google) */}
      <BreadcrumbList
        items={[
          { name: 'Documentação', path: '/docs' },
          { name: 'Como Criar uma Conta', path: '/docs/criar-conta' },
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Como Criar uma Conta</h1>
        <p className="text-xl text-gray-600">
          Siga este guia passo a passo para criar sua conta na MozHost e começar a hospedar seus projetos.
        </p>
      </div>

      {/* Requisitos */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Antes de Começar</h2>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <p className="text-gray-700">
            <strong>Você vai precisar:</strong>
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
            <li>Um nome de usuário único</li>
            <li>Um endereço de email válido</li>
            <li>Número de telefone ou WhatsApp para verificação (opcional)</li>
            <li>Uma senha forte (mínimo 8 caracteres)</li>
          </ul>
        </div>
        <div className="bg-green-50 border-l-4 border-green-600 p-4">
          <p className="text-gray-700">
            <strong>🎁 Bônus:</strong> Ao criar sua conta, você recebe automaticamente <strong>600 coins gratuitos</strong> para começar!
          </p>
        </div>
      </section>

      {/* Passos */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Passo a Passo</h2>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Acesse a Página de Registo</h3>
              <p className="text-gray-700 mb-4">
                Visite <a href="https://mozhost.shop/registar" className="text-blue-600 hover:underline font-mono">mozhost.shop/registar</a> e você verá o formulário de criação de conta.
              </p>
              
              {/* Espaço para screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem da página de registo aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o formulário de criação de conta</p>
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
              <h3 className="text-xl font-semibold mb-3">Preencha os Dados do Formulário</h3>
              <p className="text-gray-700 mb-4">
                Complete o formulário com suas informações:
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="pb-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900 mb-1">Nome de Usuário</p>
                  <p className="text-sm text-gray-600">Escolha um nome único (ex: joao_dev, maria_tech)</p>
                  <div className="bg-gray-50 p-2 rounded mt-2">
                    <code className="text-sm text-gray-700">exemplo: developer123</code>
                  </div>
                </div>
                
                <div className="pb-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900 mb-1">Email</p>
                  <p className="text-sm text-gray-600">Usado para login e notificações</p>
                  <div className="bg-gray-50 p-2 rounded mt-2">
                    <code className="text-sm text-gray-700">exemplo: seuemail@gmail.com</code>
                  </div>
                </div>

                <div className="pb-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900 mb-1">Método de Verificação</p>
                  <p className="text-sm text-gray-600 mb-3">Escolha como quer receber o código de verificação:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border border-gray-200 rounded p-2 text-center">
                      <p className="text-2xl mb-1">📧</p>
                      <p className="text-xs font-medium">Email</p>
                    </div>
                    <div className="border border-gray-200 rounded p-2 text-center">
                      <p className="text-2xl mb-1">💬</p>
                      <p className="text-xs font-medium">SMS</p>
                    </div>
                    <div className="border border-blue-500 bg-blue-50 rounded p-2 text-center">
                      <p className="text-2xl mb-1">📱</p>
                      <p className="text-xs font-medium text-blue-600">WhatsApp</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Se escolher SMS ou WhatsApp, insira seu número de telefone
                  </p>
                </div>
                
                <div className="pb-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900 mb-1">Senha</p>
                  <p className="text-sm text-gray-600">Mínimo 8 caracteres, inclua letras e números</p>
                  <div className="bg-gray-50 p-2 rounded mt-2">
                    <code className="text-sm text-gray-700">••••••••</code>
                  </div>
                </div>

                <div>
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input type="checkbox" className="mt-1" />
                    <span className="text-sm text-gray-700">
                      Aceito os <a href="#" className="text-blue-600 hover:underline">Termos de Serviço</a> e a <a href="#" className="text-blue-600 hover:underline">Política de Privacidade</a>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium w-full md:w-auto">
                  Criar Conta →
                </button>
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
              <h3 className="text-xl font-semibold mb-3">Digite o Código de Verificação</h3>
              <p className="text-gray-700 mb-4">
                Após preencher o formulário, você será redirecionado para uma página onde deve inserir o código de verificação que recebeu no método escolhido (Email, SMS ou WhatsApp).
              </p>

              {/* Espaço para screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem da página de verificação aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o campo para inserir o código</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-900 mb-2">Exemplo do código:</p>
                <div className="bg-gray-50 p-3 rounded text-center">
                  <code className="text-2xl font-bold text-gray-700 tracking-widest">1 2 3 4 5 6</code>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Digite os 6 dígitos que recebeu e clique em "Verificar"
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="text-sm text-gray-700">
                  <strong>⚠️ Não recebeu o código?</strong> Verifique a pasta de spam (se for email) ou aguarde até 2 minutos. Você pode solicitar um novo código após esse tempo.
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
              <h3 className="text-xl font-semibold mb-3">Conta Criada com Sucesso! 🎉</h3>
              <p className="text-gray-700 mb-4">
                Após verificar o código, sua conta será criada automaticamente e você será redirecionado para o dashboard.
              </p>

              {/* Espaço para screenshot */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <p className="text-gray-500 text-sm mb-2">📸 Coloque a imagem do dashboard inicial aqui</p>
                <p className="text-gray-400 text-xs">Screenshot mostrando o dashboard após criar a conta</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">✅ O que você recebe:</h4>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-center">
                    <span className="text-green-600 mr-2">🪙</span>
                    <span><strong>600 coins gratuitos</strong> para começar</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-2">🎯</span>
                    <span>Acesso completo à plataforma</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-2">📊</span>
                    <span>Dashboard para gerenciar containers</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-2">💬</span>
                    <span>Suporte técnico em português</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info sobre Coins */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sobre os Coins</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">🪙</span>
            <div>
              <p className="text-gray-700 mb-3">
                Os <strong>coins</strong> são a moeda da MozHost usada para pagar pelos recursos dos containers.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Você começa com <strong>600 coins gratuitos</strong></li>
                <li>• É necessário <strong>mínimo 500 coins</strong> para criar um container</li>
                <li>• Coins podem ser comprados com M-Pesa, E-Mola ou cartão</li>
                <li>• O consumo depende dos recursos usados (CPU, RAM, storage)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-4">
          Agora que você criou sua conta e tem 600 coins, está pronto para criar seu primeiro container:
        </p>
        <Link 
          href="/docs/primeiro-container" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Criar Primeiro Container →
        </Link>
      </section>
    </div>
  )
}
