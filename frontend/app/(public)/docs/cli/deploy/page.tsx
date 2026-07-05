import React from 'react';

export default function CLIUploadPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <a href="/docs/cli" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para CLI
        </a>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Deploy via CLI</h1>
        <p className="text-xl text-gray-600">
          Aprenda a fazer deploy dos seus projetos usando o CLI da MozHost de forma rápida e eficiente.
        </p>
      </div>

      {/* Pré-requisitos */}
      <section className="mb-12">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-gray-700 mb-2">
            <strong>📋 Pré-requisitos:</strong>
          </p>
          <ul className="mt-2 space-y-1 text-gray-700 list-disc list-inside ml-4">
            <li>CLI da MozHost instalado</li>
            <li>Autenticado com <code className="bg-gray-100 px-2 py-1 rounded">mozhost auth</code></li>
            <li>Container já criado (ou use <code className="bg-gray-100 px-2 py-1 rounded">mozhost create</code>)</li>
          </ul>
        </div>
      </section>

      {/* Método 1: Deploy Rápido */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Método 1: Deploy Rápido</h2>
        
        <p className="text-gray-700 mb-4">
          Se você já tem um container vinculado ao projeto, basta rodar:
        </p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-green-400">$</span> mozhost deploy
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> O CLI detecta automaticamente o container vinculado no arquivo <code className="bg-white px-2 py-1 rounded">.mozhost.json</code> do seu projeto.
          </p>
        </div>
      </section>

      {/* Método 2: Deploy Específico */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Método 2: Deploy para Container Específico</h2>
        
        <p className="text-gray-700 mb-4">
          Para fazer deploy em um container específico:
        </p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-green-400">$</span> mozhost deploy <span className="text-yellow-300">&lt;container-id&gt;</span>
        </div>

        <p className="text-sm text-gray-600 mb-4">Exemplo:</p>

        <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
          <span className="text-green-400">$</span> mozhost deploy mega-bot
        </div>
      </section>

      {/* Passo a Passo Completo */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Passo a Passo Completo</h2>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Navegue até seu projeto</h3>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
                <span className="text-green-400">$</span> cd ~/meu-projeto
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
              <h3 className="text-xl font-semibold mb-3">Inicialize o projeto (primeira vez)</h3>
              <p className="text-gray-700 mb-4">
                Se é a primeira vez fazendo deploy deste projeto, vincule-o a um container:
              </p>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-4">
                <span className="text-green-400">$</span> mozhost init
              </div>
              <p className="text-sm text-gray-600">
                Isso criará um arquivo <code className="bg-gray-100 px-2 py-1 rounded">.mozhost.json</code> e <code className="bg-gray-100 px-2 py-1 rounded">.mozhostignore</code>
              </p>
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
              <h3 className="text-xl font-semibold mb-3">Configure arquivos a ignorar</h3>
              <p className="text-gray-700 mb-4">
                Edite o <code className="bg-gray-100 px-2 py-1 rounded">.mozhostignore</code> para excluir arquivos desnecessários:
              </p>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm">
                <div className="text-gray-500"># .mozhostignore</div>
                <div>node_modules</div>
                <div>.git</div>
                <div>.env</div>
                <div>*.log</div>
                <div>package-lock.json</div>
                <div>.DS_Store</div>
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
              <h3 className="text-xl font-semibold mb-3">Faça o deploy</h3>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-4">
                <span className="text-green-400">$</span> mozhost deploy
                <div className="mt-2 text-cyan-400">
                  <div>🚀 Deploy MozHost</div>
                  <div className="mt-1">⠦ Empacotando arquivos...</div>
                  <div>⠸ Upload: 83/83 arquivos...</div>
                  <div className="text-green-400 mt-1">✅ Deploy concluído com sucesso!</div>
                  <div className="mt-2 text-gray-400">📦 Arquivos enviados: 83</div>
                  <div className="text-cyan-300">🌐 URL: https://seu-app.mozhost.shop</div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>✅ Pronto!</strong> O CLI vai perguntar se você quer reiniciar o container para aplicar as mudanças.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Opções Avançadas */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Opções Avançadas</h2>

        <div className="space-y-6">
          {/* Deploy de diretório específico */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Deploy de diretório específico
            </h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-2">
              <span className="text-green-400">$</span> mozhost deploy <span className="text-blue-400">--directory</span> ./dist
            </div>
            <p className="text-sm text-gray-600">
              Útil para fazer deploy apenas da pasta de build
            </p>
          </div>

          {/* Deploy sem restart */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Deploy sem reiniciar container
            </h3>
            <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm mb-2">
              <span className="text-green-400">$</span> mozhost deploy <span className="text-blue-400">--no-restart</span>
            </div>
            <p className="text-sm text-gray-600">
              Envia arquivos mas não reinicia o container automaticamente
            </p>
          </div>
        </div>
      </section>

      {/* O que acontece no deploy */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">O que acontece durante o deploy?</h2>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">📦</span>
            <div>
              <h4 className="font-semibold text-gray-900">1. Coleta de arquivos</h4>
              <p className="text-sm text-gray-600">
                O CLI lê seu projeto e coleta todos os arquivos, respeitando o <code className="bg-gray-100 px-2 py-1 rounded">.mozhostignore</code>
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">⬆️</span>
            <div>
              <h4 className="font-semibold text-gray-900">2. Upload otimizado</h4>
              <p className="text-sm text-gray-600">
                Arquivos são enviados em lotes de 20 para otimizar velocidade
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">🔄</span>
            <div>
              <h4 className="font-semibold text-gray-900">3. Substituição</h4>
              <p className="text-sm text-gray-600">
                Arquivos existentes são sobrescritos com as novas versões
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h4 className="font-semibold text-gray-900">4. Restart (opcional)</h4>
              <p className="text-sm text-gray-600">
                Container é reiniciado para aplicar as mudanças (você pode recusar)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Problemas Comuns</h2>

        <div className="space-y-4">
          {/* Erro 1 */}
          <div className="border-l-4 border-red-500 bg-red-50 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              ❌ "Container not found"
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Solução:</strong> Execute <code className="bg-white px-2 py-1 rounded">mozhost init</code> para vincular um container ao projeto
            </p>
          </div>

          {/* Erro 2 */}
          <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              ⚠️ "Permission denied"
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Solução:</strong> Verifique se você tem permissão para escrever no diretório do projeto
            </p>
          </div>

          {/* Erro 3 */}
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              💡 Deploy muito lento?
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Solução:</strong> Adicione <code className="bg-white px-2 py-1 rounded">node_modules</code> ao <code className="bg-white px-2 py-1 rounded">.mozhostignore</code>. Dependências devem ser instaladas no container via <code className="bg-white px-2 py-1 rounded">npm install</code>
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Recomendado */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Workflow Recomendado</h2>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span className="text-gray-700">Desenvolva localmente e teste</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span className="text-gray-700">Commit suas mudanças no Git</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <code className="bg-white px-3 py-1 rounded font-mono text-sm">mozhost deploy</code>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <code className="bg-white px-3 py-1 rounded font-mono text-sm">mozhost logs &lt;container&gt;</code>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <span className="text-gray-700">Acesse a URL e verifique</span>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-4">
          Agora que você sabe fazer deploy, explore outras funcionalidades:
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/docs/cli/logs"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Ver Logs →
          </a>
          <a
            href="/docs/variaveis"
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Variáveis de Ambiente →
          </a>
          <a
            href="/docs/terminal"
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Terminal Web →
          </a>
        </div>
      </section>
    </div>
  );
}
