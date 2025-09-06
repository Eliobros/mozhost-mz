import React from 'react';
import { FileText, Scale, AlertTriangle, Shield, Server, Gavel } from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const TermsConditionsPage = () => {
  return (
    <DashboardLayout currentPage="terms">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <div className="flex items-center mb-4">
            <Scale className="w-10 h-10 mr-4" />
            <div>
              <h1 className="text-3xl font-bold">Termos e Condições</h1>
              <p className="text-purple-100">Acordo de uso da plataforma MozHost</p>
            </div>
          </div>
          <p className="text-purple-100">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-8 space-y-8">
            
            {/* Acceptance */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Gavel className="w-6 h-6 mr-2 text-purple-600" />
                1. Aceitação dos Termos
              </h2>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-gray-700">
                  Ao acessar e usar a plataforma MozHost, você concorda em cumprir estes Termos e Condições. 
                  Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
                </p>
              </div>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Server className="w-6 h-6 mr-2 text-blue-600" />
                2. Descrição dos Serviços
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  A MozHost fornece uma plataforma de hospedagem de containers Docker para aplicações, 
                  bots e APIs. Nossos serviços incluem:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">🐳 Hospedagem Docker</h3>
                    <p className="text-blue-800 text-sm">Containers isolados e seguros</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">💻 Editor de Código</h3>
                    <p className="text-green-800 text-sm">Interface Monaco Editor integrada</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">🖥️ Terminal Web</h3>
                    <p className="text-purple-800 text-sm">Acesso completo via navegador</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">📊 Monitoramento</h3>
                    <p className="text-orange-800 text-sm">Métricas em tempo real</p>
                  </div>
                </div>
              </div>
            </section>

            {/* User Responsibilities */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Shield className="w-6 h-6 mr-2 text-green-600" />
                3. Responsabilidades do Usuário
              </h2>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">3.1 Uso Adequado</h3>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                  <p className="text-gray-700 mb-2">Você concorda em usar nossos serviços apenas para:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Hospedar aplicações legítimas, bots e APIs</li>
                    <li>Desenvolvimento e teste de software</li>
                    <li>Automação de processos legais</li>
                    <li>Projetos pessoais e comerciais apropriados</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold text-gray-900">3.2 Uso Proibido</h3>
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                  <p className="text-gray-700 mb-2">É estritamente proibido usar nossos serviços para:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Atividades ilegais ou fraudulentas</li>
                    <li>Spam, phishing ou envio de mensagens não solicitadas</li>
                    <li>Mineração de criptomoedas sem autorização</li>
                    <li>Ataques DDoS ou tentativas de hacking</li>
                    <li>Distribuição de malware ou vírus</li>
                    <li>Violação de direitos autorais</li>
                    <li>Conteúdo adulto, violento ou discriminatório</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Account Security */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Segurança da Conta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Suas Obrigações:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">Manter senha segura e confidencial</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">Notificar acesso não autorizado</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">Ser responsável por toda atividade</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Nossas Garantias:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">Criptografia de dados sensíveis</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">Monitoramento de segurança 24/7</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">Isolamento total entre containers</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Service Availability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Disponibilidade do Serviço</h2>
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-2">SLA e Garantias</h3>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• Objetivo de 99.9% de uptime mensal</li>
                      <li>• Manutenções programadas com aviso de 24h</li>
                      <li>• Suporte técnico durante horário comercial</li>
                      <li>• Backups automáticos diários</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Resource Limits */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Limites de Recursos</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Containers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Free</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">2</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">512 MB</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">1 GB</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Basic</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">5</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">2 GB</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">10 GB</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Pro</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Ilimitado</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">8 GB</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">100 GB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Termos de Pagamento</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">7.1 Planos Pagos</h3>
                  <p className="text-blue-800 text-sm">
                    Planos pagos são cobrados mensalmente. O pagamento é processado automaticamente 
                    na data de renovação. Cancelamentos devem ser feitos antes da data de renovação.
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">7.2 Reembolsos</h3>
                  <p className="text-green-800 text-sm">
                    Oferecemos garantia de reembolso de 30 dias para novos usuários. 
                    Reembolsos são processados no método de pagamento original em até 7 dias úteis.
                  </p>
                </div>
              </div>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Suspensão e Cancelamento</h2>
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                  <h3 className="font-semibold text-red-900 mb-2">Motivos para Suspensão</h3>
                  <ul className="text-red-800 text-sm space-y-1">
                    <li>• Violação destes Termos de Uso</li>
                    <li>• Atividades suspeitas ou ilegais</li>
                    <li>• Não pagamento de taxas devidas</li>
                    <li>• Uso excessivo de recursos</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Processo de Cancelamento</h3>
                  <p className="text-gray-700 text-sm">
                    Você pode cancelar sua conta a qualquer momento através das configurações. 
                    Todos os dados serão permanentemente excluídos após 30 dias do cancelamento.
                  </p>
                </div>
              </div>
            </section>

            {/* Liability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitação de Responsabilidade</h2>
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <p className="text-yellow-800">
                  <strong>IMPORTANTE:</strong> A MozHost não será responsável por danos diretos, 
                  indiretos, incidentais ou consequenciais decorrentes do uso ou incapacidade de 
                  usar nossos serviços. Nossa responsabilidade total está limitada ao valor pago 
                  pelos serviços nos últimos 12 meses.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Alterações nos Termos</h2>
              <p className="text-gray-700">
                Reservamo-nos o direito de modificar estes Termos e Condições a qualquer momento. 
                Mudanças significativas serão notificadas por e-mail com 30 dias de antecedência. 
                O uso continuado dos serviços após as alterações constitui aceitação dos novos termos.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Lei Aplicável</h2>
              <p className="text-gray-700">
                Estes Termos e Condições são regidos pelas leis brasileiras. Qualquer disputa 
                será resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contato</h2>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <p className="text-gray-700 mb-4">
                  Para dúvidas sobre estes Termos e Condições, entre em contato:
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">📧 E-mail: legal@mozhost.com</p>
                  <p className="text-gray-700">🌐 Site: https://mozhost.com/support</p>
                  <p className="text-gray-700">📞 Suporte: Disponível no painel da conta</p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="bg-gray-100 p-6 rounded-lg text-center border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Estes Termos e Condições são efetivos a partir de {new Date().toLocaleDateString('pt-BR')}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                © {new Date().getFullYear()} MozHost. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TermsConditionsPage;
