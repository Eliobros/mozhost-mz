// app/docs/layout.tsx
import Link from 'next/link'

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Principal */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">MozHost</span>
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link href="/docs" className="text-gray-700 hover:text-blue-600 font-medium">
                  Documentação
                </Link>
                <Link href="/docs/api" className="text-gray-600 hover:text-blue-600">
                  API
                </Link>
                <Link href="/docs/exemplos" className="text-gray-600 hover:text-blue-600">
                  Exemplos
                </Link>
              </nav>
            </div>
            <Link 
              href="/login" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar de Navegação */}
          <aside className="lg:col-span-1">
            <nav className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h2 className="font-bold text-gray-900 mb-6 text-lg">Navegação</h2>
              
              {/* Get Started */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  Começar
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/docs" 
                      className="block text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Introdução
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/criar-conta" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Criar Conta
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/primeiro-container" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Primeiro Container
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/comprar-coins" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      💰 Comprar Coins
                    </Link>
                  </li>
                </ul>
              </div>

              {/* CLI */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  CLI
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/docs/cli" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Instalação e Uso
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/cli/deploy" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Deploy via CLI
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/cli/create-database" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Databases via CLI
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Guias */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  Guias
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/docs/criar-database" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Criar Database
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/bots" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Hospedar Bots
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/apis" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Hospedar APIs
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/dominio" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Configurar Domínio
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/variaveis" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Variáveis de Ambiente
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/email-service" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      📧 Email Service
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Recursos */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  Recursos
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/docs/precos" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Preços
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/suporte" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      Suporte
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/docs/faq" 
                      className="block text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition"
                    >
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </aside>

          {/* Conteúdo Principal */}
          <main className="lg:col-span-3">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            © 2024 MozHost - Hospedagem de Bots e APIs em Moçambique
          </p>
        </div>
      </footer>
    </div>
  )
}
