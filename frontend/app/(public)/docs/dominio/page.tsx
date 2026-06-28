// app/docs/dominio/page.tsx
import Link from 'next/link'

export default function DominioPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Configuração de Domínio</h1>
        <p className="text-xl text-gray-600">
          Aprenda como funcionam os subdomínios automáticos e como configurar um domínio personalizado no seu container MozHost.
        </p>
      </div>

      {/* Subdomínio Padrão */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Subdomínio Padrão</h2>
        <p className="text-gray-700 mb-4">
          Ao criar um container na MozHost, ele recebe automaticamente um subdomínio baseado no nome do container. Não é necessária nenhuma configuração adicional — basta criar o container e ele já estará acessível online.
        </p>

        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-gray-400"># Formato do subdomínio automático</span>
          <br />
          https://<span className="text-green-400">nome-do-container</span>.mozhost.shop
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Exemplos:</h3>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-700">
                Container <code className="bg-gray-200 px-2 py-0.5 rounded">bot-whatsapp</code> →{' '}
                <code className="text-blue-600 font-mono text-xs">https://bot-whatsapp.mozhost.shop</code>
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-700">
                Container <code className="bg-gray-200 px-2 py-0.5 rounded">api-vendas</code> →{' '}
                <code className="text-blue-600 font-mono text-xs">https://api-vendas.mozhost.shop</code>
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-700">
                Container <code className="bg-gray-200 px-2 py-0.5 rounded">meu-site</code> →{' '}
                <code className="text-blue-600 font-mono text-xs">https://meu-site.mozhost.shop</code>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-gray-700">
            <strong>💡 Dica:</strong> Escolha nomes de container descritivos e curtos, pois eles farão parte da URL do seu projecto.
          </p>
        </div>
      </section>

      {/* SSL Automático */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">SSL Automático nos Subdomínios</h2>
        <p className="text-gray-700 mb-4">
          Todos os subdomínios da MozHost já vêm com certificado SSL (HTTPS) configurado automaticamente. Você não precisa fazer nada — o certificado é emitido e renovado de forma automática.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-center">
            <span className="text-3xl mb-2 block">🔒</span>
            <h3 className="font-semibold text-gray-900 mb-1">HTTPS Automático</h3>
            <p className="text-sm text-gray-600">Certificado SSL incluído em todos os subdomínios</p>
          </div>
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-center">
            <span className="text-3xl mb-2 block">🔄</span>
            <h3 className="font-semibold text-gray-900 mb-1">Renovação Automática</h3>
            <p className="text-sm text-gray-600">Certificados renovados antes de expirar</p>
          </div>
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-center">
            <span className="text-3xl mb-2 block">💰</span>
            <h3 className="font-semibold text-gray-900 mb-1">100% Gratuito</h3>
            <p className="text-sm text-gray-600">Powered by Let&apos;s Encrypt, sem custo adicional</p>
          </div>
        </div>
      </section>

      {/* Domínio Personalizado */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Domínio Personalizado</h2>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-gray-700">
            <strong>⚠️ Funcionalidade em Beta:</strong> A configuração de domínios personalizados está actualmente em fase beta. Algumas funcionalidades podem mudar. Em breve estará disponível para todos os utilizadores.
          </p>
        </div>

        <p className="text-gray-700 mb-6">
          Além do subdomínio padrão, você pode conectar o seu próprio domínio (ex: <code className="bg-gray-100 px-2 py-0.5 rounded">meusite.co.mz</code>) ao seu container. Siga os passos abaixo:
        </p>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Acesse as Configurações do Container</h3>
              <p className="text-gray-700 mb-4">
                No dashboard, clique no container desejado e acesse a secção de <strong>Configurações</strong> ou <strong>Domínios</strong>.
              </p>
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
              <h3 className="text-xl font-semibold mb-3">Adicione o Seu Domínio</h3>
              <p className="text-gray-700 mb-4">
                No campo de domínio personalizado, insira o domínio que deseja conectar ao container. Por exemplo:
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                meusite.co.mz
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
              <h3 className="text-xl font-semibold mb-3">Configure o DNS no Seu Provedor</h3>
              <p className="text-gray-700 mb-4">
                Acesse o painel do seu provedor de domínio (onde registou o domínio) e adicione um registo DNS apontando para a MozHost. Veja os exemplos na secção abaixo.
              </p>
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
              <h3 className="text-xl font-semibold mb-3">Aguarde o Certificado SSL</h3>
              <p className="text-gray-700 mb-4">
                Após a propagação do DNS, a MozHost irá provisionar automaticamente um certificado SSL (Let&apos;s Encrypt) para o seu domínio. Este processo pode levar alguns minutos após a propagação do DNS.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong className="text-green-600">✅ Pronto!</strong> Após a configuração, o seu domínio personalizado estará acessível via HTTPS automaticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exemplos de Configuração DNS */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exemplos de Configuração DNS</h2>
        <p className="text-gray-700 mb-6">
          Abaixo estão os exemplos de registos DNS que deve criar no painel do seu provedor de domínio.
        </p>

        {/* CNAME */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Registo CNAME (Recomendado)</h3>
          <p className="text-gray-700 mb-3">
            Use um registo <strong>CNAME</strong> para apontar o seu domínio ou subdomínio para a MozHost. Este é o método recomendado.
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-3">
            <span className="text-gray-400"># Para subdomínio (ex: app.meusite.co.mz)</span>
            <br />
            <span className="text-cyan-400">Tipo:</span>    CNAME
            <br />
            <span className="text-cyan-400">Nome:</span>    app
            <br />
            <span className="text-cyan-400">Valor:</span>   nome-do-container.mozhost.shop
            <br />
            <span className="text-cyan-400">TTL:</span>     3600
            <br />
            <br />
            <span className="text-gray-400"># Para domínio raiz (ex: meusite.co.mz)</span>
            <br />
            <span className="text-cyan-400">Tipo:</span>    CNAME
            <br />
            <span className="text-cyan-400">Nome:</span>    @
            <br />
            <span className="text-cyan-400">Valor:</span>   nome-do-container.mozhost.shop
            <br />
            <span className="text-cyan-400">TTL:</span>     3600
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
            <p className="text-sm text-gray-700">
              <strong>💡 Nota:</strong> Nem todos os provedores de DNS permitem CNAME no domínio raiz (@). Nesse caso, use o registo A descrito abaixo.
            </p>
          </div>
        </div>

        {/* Registo A */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Registo A (Alternativa)</h3>
          <p className="text-gray-700 mb-3">
            Se o seu provedor não suporta CNAME no domínio raiz, use um registo <strong>A</strong> apontando para o IP do servidor MozHost:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            <span className="text-gray-400"># Para domínio raiz (ex: meusite.co.mz)</span>
            <br />
            <span className="text-cyan-400">Tipo:</span>    A
            <br />
            <span className="text-cyan-400">Nome:</span>    @
            <br />
            <span className="text-cyan-400">Valor:</span>   IP_DO_SERVIDOR_MOZHOST
            <br />
            <span className="text-cyan-400">TTL:</span>     3600
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-3">
            <p className="text-sm text-gray-700">
              <strong>⚠️ Atenção:</strong> O IP do servidor pode ser encontrado nas configurações do container ou contactando o suporte. Prefira sempre o CNAME quando possível, pois o IP pode mudar no futuro.
            </p>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Resolução de Problemas</h2>

        <div className="space-y-6">
          {/* Propagação DNS */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">🕐 DNS Ainda Não Está a Funcionar</h3>
            <p className="text-gray-700 mb-3">
              A propagação DNS pode levar <strong>até 48 horas</strong> para se completar globalmente. Na maioria dos casos, demora entre 15 minutos e 2 horas. Seja paciente e verifique novamente mais tarde.
            </p>
          </div>

          {/* Verificar DNS */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">🔍 Como Verificar se o DNS Propagou</h3>
            <p className="text-gray-700 mb-3">
              Use os comandos <code className="bg-gray-100 px-2 py-0.5 rounded">dig</code> ou <code className="bg-gray-100 px-2 py-0.5 rounded">nslookup</code> para verificar se o registo DNS está activo:
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-3">
              <span className="text-gray-400"># Usando dig</span>
              <br />
              <span className="text-green-400">$</span> dig meusite.co.mz CNAME
              <br />
              <br />
              <span className="text-gray-400"># Usando nslookup</span>
              <br />
              <span className="text-green-400">$</span> nslookup meusite.co.mz
              <br />
              <br />
              <span className="text-gray-400"># Verificar registo A</span>
              <br />
              <span className="text-green-400">$</span> dig meusite.co.mz A
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
              <p className="text-sm text-gray-700">
                <strong>💡 Dica:</strong> Também pode usar ferramentas online como{' '}
                <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">dnschecker.org</a>{' '}
                para verificar a propagação em diferentes servidores do mundo.
              </p>
            </div>
          </div>

          {/* SSL não emitido */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">🔐 Certificado SSL Não Foi Emitido</h3>
            <p className="text-gray-700 mb-3">
              Se após a propagação do DNS o certificado SSL não foi emitido automaticamente:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>Verifique se o registo DNS está correctamente configurado</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Confirme que o domínio aponta para o servidor correcto da MozHost</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>Aguarde mais alguns minutos — o provisionamento pode demorar até 10 minutos</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4.</span>
                <span>Se o problema persistir, contacte o suporte da MozHost</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Certificados SSL */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Certificados SSL</h2>
        <p className="text-gray-700 mb-4">
          Todos os domínios na MozHost — tanto os subdomínios automáticos quanto os domínios personalizados — recebem certificados SSL gratuitos e automáticos via <strong>Let&apos;s Encrypt</strong>.
        </p>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p className="text-gray-700">
            <strong>✅ O que isso significa para si:</strong>
          </p>
          <ul className="mt-2 space-y-1 text-gray-700">
            <li>• O seu site/API estará sempre acessível via <strong>HTTPS</strong></li>
            <li>• Certificados são emitidos automaticamente — sem configuração manual</li>
            <li>• Renovação automática antes de expirar (a cada 90 dias)</li>
            <li>• Totalmente gratuito — sem custos adicionais</li>
            <li>• Compatível com todos os navegadores e aplicações modernas</li>
          </ul>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-4">
          Agora que você sabe como funcionam os domínios na MozHost, explore mais:
        </p>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Crie o seu primeiro container e acesse pelo subdomínio automático</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Faça deploy da sua aplicação</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Configure um domínio personalizado quando disponível</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/docs/primeiro-container"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Criar Container →
          </Link>
          <Link
            href="/docs/cli"
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Ver Guia do CLI →
          </Link>
        </div>
      </section>
    </div>
  )
}
