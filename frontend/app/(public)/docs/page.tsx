// app/docs/page.tsx
import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-t-lg">
        <h1 className="text-4xl font-bold mb-4">Bem-vindo à MozHost</h1>
        <p className="text-xl text-blue-100">
          A primeira plataforma moçambicana de hospedagem para Bots e APIs
        </p>
      </div>

      <div className="p-8">
        {/* Introdução */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">O que é a MozHost?</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            A MozHost é uma plataforma inovadora desenvolvida em Moçambique, 
            especializada em hospedar bots (WhatsApp, Telegram, Discord) e APIs 
            de forma simples, rápida e confiável.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            Com infraestrutura local e suporte em português, oferecemos a melhor 
            solução para desenvolvedores e empresas moçambicanas que precisam de 
            hospedagem profissional.
          </p>
        </section>

        {/* Começar Rápido */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Começar em 3 Passos</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Passo 1 */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Criar Conta</h3>
              <p className="text-gray-600 mb-4">
                Registe-se gratuitamente e ganhe créditos para testar a plataforma.
              </p>
              <Link 
                href="/docs/criar-conta" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver guia →
              </Link>
            </div>

            {/* Passo 2 */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Criar Container</h3>
              <p className="text-gray-600 mb-4">
                Configure seu primeiro container em menos de 5 minutos.
              </p>
              <Link 
                href="/docs/primeiro-container" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver guia →
              </Link>
            </div>

            {/* Passo 3 */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Deploy Completo</h3>
              <p className="text-gray-600 mb-4">
                Faça o deploy do seu bot ou API e comece a usar imediatamente.
              </p>
              <Link 
                href="/docs/bots" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver guia →
              </Link>
            </div>
          </div>
        </section>

        {/* Recursos Principais */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Recursos Principais</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Deploy Automático</h3>
                <p className="text-gray-600">
                  Conecte seu repositório GitHub e faça deploys automáticos a cada push.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Alta Disponibilidade</h3>
                <p className="text-gray-600">
                  Uptime de 99.9% com monitoramento 24/7 e suporte técnico.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Segurança SSL</h3>
                <p className="text-gray-600">
                  Certificados SSL gratuitos e renovação automática para todos os projetos.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Métricas em Tempo Real</h3>
                <p className="text-gray-600">
                  Acompanhe CPU, memória, tráfego e logs em tempo real no dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tecnologias Suportadas */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Tecnologias Suportadas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Node.js', 'Python', 'PHP', 'Ruby', 'Go', 'Java', 'Docker', '.NET'].map((tech) => (
              <div key={tech} className="border border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition">
                <p className="font-medium text-gray-700">{tech}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pronto para começar?
          </h2>
          <p className="text-gray-700 mb-6">
            Crie sua conta gratuitamente e hospede seu primeiro bot ou API hoje mesmo.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/docs/criar-conta" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Criar Conta Gratuita
            </Link>
            <Link 
              href="/docs/primeiro-container" 
              className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
            >
              Ver Tutorial
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
