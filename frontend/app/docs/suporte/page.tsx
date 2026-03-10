import Link from 'next/link'

export default function SuportePage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🆘 Suporte MozHost</h1>
        <p className="text-xl text-gray-600">
          Estamos aqui para te ajudar! Encontre os melhores canais de contacto, saiba como reportar problemas e descubra recursos de auto-ajuda.
        </p>
      </div>

      {/* Canais de Contacto */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Canais de Contacto</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Email */}
          <a
            href="mailto:mozhost@topaziocoin.online"
            className="border-2 border-blue-500 bg-blue-50 rounded-lg p-6 hover:shadow-lg transition block"
          >
            <div className="text-center mb-4">
              <span className="text-4xl">📧</span>
              <h3 className="text-xl font-bold text-gray-900 mt-3">Email</h3>
            </div>
            <p className="text-sm text-gray-700 text-center mb-4">
              Para dúvidas gerais, problemas técnicos ou questões de facturação.
            </p>
            <p className="text-blue-600 font-medium text-center text-sm break-all">
              mozhost@topaziocoin.online
            </p>
          </a>

          {/* WhatsApp Directo */}
          <a
            href="https://api.whatsapp.com/send?phone=258862840075"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-green-500 bg-green-50 rounded-lg p-6 hover:shadow-lg transition block"
          >
            <div className="text-center mb-4">
              <span className="text-4xl">💬</span>
              <h3 className="text-xl font-bold text-gray-900 mt-3">WhatsApp</h3>
            </div>
            <p className="text-sm text-gray-700 text-center mb-4">
              Suporte rápido e directo. Ideal para questões urgentes ou dúvidas rápidas.
            </p>
            <p className="text-green-600 font-medium text-center text-sm">
              +258 86 284 0075
            </p>
          </a>

          {/* Comunidade WhatsApp */}
          <a
            href="https://whatsapp.com/channel/0029Vb6ydZS6rsQoxPBd861W"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-purple-500 bg-purple-50 rounded-lg p-6 hover:shadow-lg transition block"
          >
            <div className="text-center mb-4">
              <span className="text-4xl">👥</span>
              <h3 className="text-xl font-bold text-gray-900 mt-3">Comunidade</h3>
            </div>
            <p className="text-sm text-gray-700 text-center mb-4">
              Junte-se à nossa comunidade no WhatsApp para novidades, dicas e ajuda de outros utilizadores.
            </p>
            <p className="text-purple-600 font-medium text-center text-sm">
              Entrar na Comunidade →
            </p>
          </a>
        </div>
      </section>

      {/* Horário e Tempo de Resposta */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Horário de Atendimento e Tempo de Resposta</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🕐</span>
              <h3 className="text-lg font-semibold text-gray-900">Horário de Atendimento</h3>
            </div>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">📅</span>
                <span><strong>Segunda a Sexta:</strong> 08h00 – 18h00 (hora de Maputo)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📅</span>
                <span><strong>Sábado:</strong> 09h00 – 13h00</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📅</span>
                <span><strong>Domingo e Feriados:</strong> Fechado (apenas emergências)</span>
              </li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">⏱️</span>
              <h3 className="text-lg font-semibold text-gray-900">Tempo de Resposta</h3>
            </div>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">💬</span>
                <span><strong>WhatsApp:</strong> até 2 horas (horário comercial)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📧</span>
                <span><strong>Email:</strong> até 24 horas úteis</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">👥</span>
                <span><strong>Comunidade:</strong> até 48 horas</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6">
          <p className="text-sm text-gray-700">
            <strong>⚠️ Emergências fora do horário:</strong> Se o seu container estiver completamente inacessível ou houver perda de dados, envie WhatsApp com a palavra <strong>URGENTE</strong> no início da mensagem. Tentaremos responder o mais rápido possível.
          </p>
        </div>
      </section>

      {/* Como Reportar um Bug */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🐛 Como Reportar um Bug</h2>
        <p className="text-gray-700 mb-4">
          Para resolvermos o seu problema da forma mais rápida possível, inclua as seguintes informações na sua mensagem:
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-gray-900">Nome do Container</p>
                <p className="text-sm text-gray-600">Ex: <code className="bg-white px-2 py-1 rounded border">meu-bot-discord</code></p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-gray-900">Mensagem de Erro</p>
                <p className="text-sm text-gray-600">Copie e cole a mensagem de erro exacta que aparece nos logs ou na tela.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-gray-900">Passos para Reproduzir</p>
                <p className="text-sm text-gray-600">Descreva passo a passo o que fez até o erro acontecer.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-gray-900">Comportamento Esperado vs Real</p>
                <p className="text-sm text-gray-600">O que esperava que acontecesse e o que realmente aconteceu.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
              <div>
                <p className="font-medium text-gray-900">Screenshots (se possível)</p>
                <p className="text-sm text-gray-600">Imagens ou capturas de tela ajudam muito na resolução.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> Quanto mais detalhes você fornecer, mais rápido conseguimos resolver o problema. Relatórios vagos como &quot;não funciona&quot; demoram mais para investigar.
          </p>
        </div>
      </section>

      {/* Como Solicitar uma Funcionalidade */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">💡 Como Solicitar uma Funcionalidade</h2>
        <p className="text-gray-700 mb-4">
          Tem uma ideia para melhorar a MozHost? Adoramos ouvir sugestões da comunidade!
        </p>

        <div className="border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-green-600 text-xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">Descreva o problema que quer resolver</p>
                <p className="text-sm text-gray-600">Ex: &quot;Preciso de uma forma fácil de fazer backup automático do meu database.&quot;</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-green-600 text-xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">Sugira como gostaria que funcionasse</p>
                <p className="text-sm text-gray-600">Descreva a experiência ideal do ponto de vista do utilizador.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-green-600 text-xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">Envie pelo WhatsApp ou Email</p>
                <p className="text-sm text-gray-600">Use o assunto &quot;Sugestão de Funcionalidade&quot; para facilitar a triagem.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-6">
          <p className="text-sm text-gray-700">
            <strong>🎯 Nota:</strong> Todas as sugestões são analisadas pela equipa. As mais votadas pela comunidade têm prioridade no desenvolvimento. Partilhe a sua ideia na comunidade WhatsApp para obter apoio!
          </p>
        </div>
      </section>

      {/* Recursos de Auto-Ajuda */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Recursos de Auto-Ajuda</h2>
        <p className="text-gray-700 mb-4">
          Antes de contactar o suporte, pode ser que a resposta já esteja na nossa documentação:
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/docs"
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition block"
          >
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📖</span>
              <h3 className="font-semibold text-gray-900">Documentação</h3>
            </div>
            <p className="text-sm text-gray-600">
              Guias completos sobre containers, deploy, databases e muito mais.
            </p>
          </Link>

          <Link
            href="/docs/faq"
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition block"
          >
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">❓</span>
              <h3 className="font-semibold text-gray-900">Perguntas Frequentes</h3>
            </div>
            <p className="text-sm text-gray-600">
              Respostas rápidas para as dúvidas mais comuns sobre a MozHost.
            </p>
          </Link>

          <Link
            href="/docs/cli"
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition block"
          >
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">⌨️</span>
              <h3 className="font-semibold text-gray-900">CLI da MozHost</h3>
            </div>
            <p className="text-sm text-gray-600">
              Referência completa do CLI: instalação, comandos e exemplos.
            </p>
          </Link>
        </div>
      </section>

      {/* Status da Plataforma */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Status da Plataforma</h2>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-3">🟢</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monitorização Contínua</h3>
              <p className="text-sm text-gray-600">Monitorizamos a plataforma 24/7 para garantir a melhor disponibilidade.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="border-l-4 border-green-500 bg-white p-4">
              <p className="text-sm text-gray-700">
                <strong>🔔 Manutenções programadas:</strong> Anunciamos todas as manutenções com antecedência na nossa comunidade WhatsApp. Junte-se para ficar sempre informado.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 bg-white p-4">
              <p className="text-sm text-gray-700">
                <strong>📢 Incidentes:</strong> Em caso de indisponibilidade, publicamos actualizações na comunidade WhatsApp e respondemos individualmente a quem contactar o suporte.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 bg-white p-4">
              <p className="text-sm text-gray-700">
                <strong>📈 Uptime:</strong> Trabalhamos para manter um uptime de 99%. Consulte o nosso histórico de disponibilidade na comunidade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Ainda precisa de ajuda?</h3>
        <p className="text-gray-700 mb-6">
          A nossa equipa está pronta para te ajudar. Escolhe o canal que preferires!
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="mailto:mozhost@topaziocoin.online"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            📧 Enviar Email
          </a>
          <a
            href="https://api.whatsapp.com/send?phone=258862840075"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
          >
            💬 WhatsApp Directo
          </a>
          <a
            href="https://whatsapp.com/channel/0029Vb6ydZS6rsQoxPBd861W"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-purple-600 border-2 border-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition font-medium"
          >
            👥 Comunidade WhatsApp
          </a>
        </div>
      </div>

      {/* Navegação */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs/faq" className="text-blue-600 hover:text-blue-800 flex items-center">
            ← Perguntas Frequentes
          </Link>
          <Link href="/docs" className="text-blue-600 hover:text-blue-800 flex items-center">
            Voltar ao Início →
          </Link>
        </div>
      </div>
    </div>
  )
}
