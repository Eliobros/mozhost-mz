"use client"

// components/TermsConditionsPage.js
import React from 'react';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, FileText, Clock, Scale } from 'lucide-react';

const TermsConditionsPage = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </button>
            <div className="flex items-center">
              <Scale className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Termos e Condições</h1>
                <p className="text-gray-600">MozHost - Eliobros Tech</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Última atualização */}
          <div className="flex items-center mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-900">Última atualização</p>
              <p className="text-sm text-blue-700">01 de Janeiro de 2025</p>
            </div>
          </div>

          <div className="prose max-w-none">
            {/* Introdução */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                1. Introdução
              </h2>
              <p className="text-gray-700 mb-4">
                Bem-vindo ao MozHost, uma plataforma de hospedagem de aplicações desenvolvida pela 
                <strong> Eliobros Tech</strong>, empresa sediada em Maputo, Moçambique.
              </p>
              <p className="text-gray-700 mb-4">
                Ao utilizar nossos serviços, você concorda com estes Termos e Condições. 
                Se você não concordar com qualquer parte destes termos, não deve utilizar nossos serviços.
              </p>
            </section>

            {/* Definições */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Definições</h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded">
                  <strong>"Serviço":</strong> Refere-se à plataforma MozHost e todos os serviços relacionados.
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <strong>"Usuário":</strong> Qualquer pessoa que acesse ou use nossos serviços.
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <strong>"Container":</strong> Ambiente isolado onde sua aplicação é executada.
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <strong>"Conteúdo":</strong> Dados, arquivos, códigos e informações enviadas pelo usuário.
                </div>
              </div>
            </section>

            {/* Uso Aceitável */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                3. Uso Aceitável
              </h2>
              <p className="text-gray-700 mb-4">Você concorda em usar nossos serviços apenas para:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Hospedar aplicações legais e legítimas</li>
                <li>Desenvolver e testar software</li>
                <li>Criar APIs, bots e serviços web</li>
                <li>Atividades comerciais lícitas</li>
              </ul>
            </section>

            {/* Uso Proibido */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                4. Uso Proibido
              </h2>
              <p className="text-gray-700 mb-4">É <strong>ESTRITAMENTE PROIBIDO</strong> usar nossos serviços para:</p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-900 mb-2">Atividades Ilegais</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Spam ou phishing</li>
                    <li>• Violação de direitos autorais</li>
                    <li>• Atividades fraudulentas</li>
                    <li>• Conteúdo ilegal</li>
                  </ul>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-900 mb-2">Atividades Maliciosas</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Malware ou vírus</li>
                    <li>• Ataques DDoS</li>
                    <li>• Mineração de criptomoedas</li>
                    <li>• Proxy ou VPN não autorizados</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-red-50 border border-red-200 rounded mt-4">
  <h4 className="font-medium text-red-900 mb-2">🚫 Abuso de Contas Múltiplas</h4>
  <p className="text-sm text-red-700 mb-2">
    É estritamente proibido criar múltiplas contas com o objetivo de obter 
    benefícios gratuitos de forma fraudulenta, como Coins de boas-vindas.
  </p>
  <ul className="text-sm text-red-700 space-y-1">
    <li>• O endereço IP de cada utilizador é registado pela plataforma</li>
    <li>• Contas identificadas serão permanentemente banidas</li>
    <li>• Em casos de abuso grave poderão ser tomadas medidas legais</li>
  </ul>
</div>
              </div>
            </section>
            
            <div className="p-4 bg-red-50 border border-red-200 rounded mt-4">
  <h4 className="font-medium text-red-900 mb-2">⚡ Suspensão Imediata</h4>
  <p className="text-sm text-red-700">
    O MozHost reserva-se o direito de suspender ou encerrar qualquer container 
    ou conta imediatamente e sem aviso prévio caso seja detetado comportamento 
    que comprometa a estabilidade da infraestrutura, gere ataques DDoS, 
    consumo excessivo de recursos ou viole qualquer política de Uso Proibido.
  </p>
</div>

            {/* Limites de Recursos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Limites de Recursos</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Plano</th>
                      <th className="border border-gray-300 p-3 text-left">Containers</th>
                      <th className="border border-gray-300 p-3 text-left">RAM</th>
                      <th className="border border-gray-300 p-3 text-left">Armazenamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">Free</td>
                      <td className="border border-gray-300 p-3">2 containers</td>
                      <td className="border border-gray-300 p-3">512MB por container</td>
                      <td className="border border-gray-300 p-3">1GB total</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-medium">Basic</td>
                      <td className="border border-gray-300 p-3">5 containers</td>
                      <td className="border border-gray-300 p-3">1GB por container</td>
                      <td className="border border-gray-300 p-3">5GB total</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">Pro</td>
                      <td className="border border-gray-300 p-3">20 containers</td>
                      <td className="border border-gray-300 p-3">2GB por container</td>
                      <td className="border border-gray-300 p-3">20GB total</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
  <strong>🪙 Coins e Créditos Internos:</strong> As Coins ou créditos internos 
  da plataforma são ferramentas exclusivas do ecossistema MozHost. Não possuem 
  valor monetário real, não são reembolsáveis e não podem ser convertidas 
  em dinheiro (MZN ou USD).
</div>
            </section>
            
            

            {/* Responsabilidades */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Responsabilidades</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">📋 Suas Responsabilidades</h4>
                  <ul className="text-gray-700 space-y-2">
                    <li>• Manter suas credenciais seguras</li>
                    <li>• Fazer backup dos seus dados</li>
                    <li>• Cumprir as leis aplicáveis</li>
                    <li>• Monitorar o uso de recursos</li>
                    <li>• Reportar problemas de segurança</li>
                  </ul>
                </div>
              <div>
  <h4 className="font-medium text-gray-900 mb-3">🛡️ Nossas Responsabilidades</h4>
  <ul className="text-gray-700 space-y-2">
    <li>• Manter a plataforma funcionando</li>
    <li>• Proteger a infraestrutura</li>
    <li>• Fornecer suporte técnico</li>
    <li>• Manter backups do sistema</li>
    <li>• Garantir uptime de 99.9% <span className="text-xs text-gray-500">(planos Basic e Pro)</span></li>
    <li>• Plano Free oferecido em regime de melhor esforço <span className="text-xs text-gray-500">(sem SLA garantido)</span></li>
  </ul>
</div>
              </div>
            </section>

            {/* Pagamentos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Pagamentos e Cancelamento</h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-medium text-green-900 mb-2">💳 Pagamentos</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Planos pagos são cobrados mensalmente</li>
                    <li>• Pagamentos processados via M-Pesa, Visa, Mastercard</li>
                    <li>• Valores em USD ou MZN</li>
                    <li>• Sem reembolso após 7 dias</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">🚫 Cancelamento</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Cancelamento a qualquer momento</li>
                    <li>• Serviço ativo até o fim do período pago</li>
                    <li>• Dados mantidos por 30 dias após cancelamento</li>
                    <li>• Containers desativados imediatamente</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Limitação de Responsabilidade */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitação de Responsabilidade</h2>
             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
  <p className="text-gray-700 mb-3">
    <strong>IMPORTANTE:</strong> O MozHost é fornecido "como está" 
    sem garantias de qualquer tipo.
  </p>
  <ul className="text-gray-700 space-y-2">
    <li>• Não garantimos disponibilidade 100% do tempo</li>
    <li>• Não somos responsáveis por perda de dados</li>
    <li>• Não nos responsabilizamos pelo conteúdo dos utilizadores</li>
    <li>• Nossa responsabilidade máxima é limitada ao valor pago</li>
  </ul>
  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
    <strong>⚖️ Responsabilidade por Danos a Terceiros:</strong> O utilizador 
    é o único responsável legal — civil e criminal — pelo tráfego, dados e 
    conteúdos que passam pelo seu container. O MozHost atua exclusivamente 
    como provedor de infraestrutura (intermediário técnico), não tendo 
    qualquer responsabilidade sobre o uso que o utilizador faz do serviço.
  </div>
</div>
            </section>

            {/* Modificações */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Modificações dos Termos</h2>
              <p className="text-gray-700 mb-4">
                Reservamos o direito de modificar estes termos a qualquer momento. 
                Mudanças significativas serão comunicadas via email com 30 dias de antecedência.
              </p>
              <p className="text-gray-700">
                O uso continuado dos serviços após as modificações constitui aceitação dos novos termos.
              </p>
            </section>

            {/* Lei Aplicável */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Lei Aplicável</h2>
              <p className="text-gray-700">
                Estes termos são regidos pelas leis da República de Moçambique. 
                Qualquer disputa será resolvida nos tribunais competentes de Maputo, Moçambique.
              </p>
            </section>

            {/* Contato */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contato</h2>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-gray-700 mb-3">
                  Para dúvidas sobre estes termos, entre em contato:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Empresa:</strong> Eliobros Tech</p>
                  <p><strong>Email:</strong> legal@mozhost.shop</p>
                  <p><strong>Telefone:</strong> +258 86 284 0075</p>
                  <p><strong>Endereço:</strong> Maputo, Moçambique</p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>© 2026 Eliobros Tech - MozHost. Todos os direitos reservados.</p>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConditionsPage;
