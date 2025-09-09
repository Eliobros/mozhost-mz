// components/PrivacyPolicyPage.js
import React from 'react';
import { 
  ArrowLeft, 
  Shield, 
  Eye, 
  Lock, 
  Server, 
  Cookie, 
  Mail, 
  Trash2,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const PrivacyPolicyPage = ({ onBack }) => {
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
              <Shield className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
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
          <div className="flex items-center mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <Clock className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-900">Última atualização</p>
              <p className="text-sm text-green-700">01 de Janeiro de 2025</p>
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
                A <strong>Eliobros Tech</strong> está comprometida em proteger sua privacidade. 
                Esta política explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais 
                quando você usa o MozHost.
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-blue-800 text-sm">
                  <strong>Resumo:</strong> Coletamos apenas os dados necessários para fornecer nossos serviços. 
                  Nunca vendemos suas informações para terceiros.
                </p>
              </div>
            </section>

            {/* Informações que coletamos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                2. Informações que Coletamos
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Dados Pessoais
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• Nome de usuário</li>
                    <li>• Endereço de email</li>
                    <li>• Senha (criptografada)</li>
                    <li>• Data de criação da conta</li>
                    <li>• Informações de pagamento (via terceiros)</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Server className="w-4 h-4 text-blue-600 mr-2" />
                    Dados Técnicos
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• Endereço IP</li>
                    <li>• Logs de acesso</li>
                    <li>• Informações do navegador</li>
                    <li>• Dados de uso da plataforma</li>
                    <li>• Métricas de performance</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Conteúdo dos Containers
                </h4>
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Não acessamos nem analisamos o conteúdo dos seus containers. 
                  Seus códigos, dados e aplicações são completamente privados e isolados.
                </p>
              </div>
            </section>

            {/* Como usamos as informações */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Como Usamos suas Informações</h2>
              
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">🚀 Fornecimento de Serviços</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Criar e gerenciar sua conta</li>
                    <li>• Provisionar containers e recursos</li>
                    <li>• Monitorar performance e disponibilidade</li>
                    <li>• Fornecer suporte técnico</li>
                  </ul>
                </div>

                <div className="p-4 border-l-4 border-green-500 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">🛡️ Segurança e Proteção</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Detectar e prevenir fraudes</li>
                    <li>• Proteger contra ataques cibernéticos</li>
                    <li>• Monitorar uso abusivo da plataforma</li>
                    <li>• Manter logs de segurança</li>
                  </ul>
                </div>

                <div className="p-4 border-l-4 border-purple-500 bg-purple-50">
                  <h4 className="font-medium text-purple-900 mb-2">📊 Melhoria dos Serviços</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Analisar padrões de uso (dados agregados)</li>
                    <li>• Otimizar performance da plataforma</li>
                    <li>• Desenvolver novos recursos</li>
                    <li>• Personalizar experiência do usuário</li>
                  </ul>
                </div>

                <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                  <h4 className="font-medium text-orange-900 mb-2">📧 Comunicação</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Notificações importantes sobre sua conta</li>
                    <li>• Alertas de segurança e manutenção</li>
                    <li>• Atualizações de serviços (opcional)</li>
                    <li>• Newsletter e promoções (opcional)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Cookies */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Cookie className="w-5 h-5 mr-2" />
                4. Cookies e Tecnologias Similares
              </h2>
              
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Tipo</th>
                      <th className="border border-gray-300 p-3 text-left">Finalidade</th>
                      <th className="border border-gray-300 p-3 text-left">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">Essenciais</td>
                      <td className="border border-gray-300 p-3">Funcionamento básico da plataforma</td>
                      <td className="border border-gray-300 p-3">Sessão</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-medium">Autenticação</td>
                      <td className="border border-gray-300 p-3">Manter você logado</td>
                      <td className="border border-gray-300 p-3">7 dias</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">Preferências</td>
                      <td className="border border-gray-300 p-3">Lembrar suas configurações</td>
                      <td className="border border-gray-300 p-3">1 ano</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-medium">Analytics</td>
                      <td className="border border-gray-300 p-3">Melhorar experiência do usuário</td>
                      <td className="border border-gray-300 p-3">2 anos</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-gray-600">
                Você pode gerenciar cookies nas configurações do seu navegador, mas isso pode afetar 
                o funcionamento de alguns recursos da plataforma.
              </p>
            </section>

            {/* Compartilhamento de dados */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Compartilhamento de Informações</h2>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
                <h4 className="font-medium text-red-900 mb-2">🚫 NÃO Compartilhamos</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Suas informações pessoais com terceiros para marketing</li>
                  <li>• Conteúdo dos seus containers</li>
                  <li>• Dados de uso individual</li>
                  <li>• Informações financeiras</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-900 mb-2">✅ Compartilhamos Apenas Quando</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Exigido por lei ou ordem judicial</li>
                  <li>• Necessário para processamento de pagamentos (dados mínimos)</li>
                  <li>• Para proteger direitos e segurança da plataforma</li>
                  <li>• Com seu consentimento explícito</li>
                </ul>
              </div>
            </section>

            {/* Segurança */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                6. Segurança dos Dados
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🔐 Medidas Técnicas</h4>
                  <ul className="text-gray-700 space-y-2 text-sm">
                    <li>• Criptografia TLS/SSL para transmissão</li>
                    <li>• Senhas hasheadas com bcrypt</li>
                    <li>• Containers isolados por usuário</li>
                    <li>• Backups automáticos criptografados</li>
                    <li>• Monitoramento 24/7</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🛡️ Medidas Organizacionais</h4>
                  <ul className="text-gray-700 space-y-2 text-sm">
                    <li>• Acesso limitado aos dados</li>
                    <li>• Treinamento da equipe</li>
                    <li>• Políticas de segurança rigorosas</li>
                    <li>• Auditorias regulares</li>
                    <li>• Plano de resposta a incidentes</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Retenção de dados */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Retenção de Dados</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">📅 Períodos de Retenção</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Dados da conta:</strong> Enquanto conta ativa + 1 ano
                    </div>
                    <div>
                      <strong>Logs de acesso:</strong> 2 anos
                    </div>
                    <div>
                      <strong>Dados de pagamento:</strong> 7 anos (obrigatório legal)
                    </div>
                    <div>
                      <strong>Conteúdo containers:</strong> 30 dias após exclusão
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Seus direitos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Seus Direitos</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-medium text-green-900 mb-3">✅ Você tem o direito de:</h4>
                  <ul className="text-sm text-green-800 space-y-2">
                    <li>• Acessar seus dados pessoais</li>
                    <li>• Corrigir informações incorretas</li>
                    <li>• Solicitar exclusão da conta</li>
                    <li>• Portabilidade dos dados</li>
                    <li>• Revogar consentimentos</li>
                    <li>• Receber cópia dos seus dados</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium text-blue-900 mb-3">📧 Como exercer seus direitos:</h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Email: privacy@mozhost.com</li>
                    <li>• Configurações da conta</li>
                    <li>• Suporte via chat</li>
                    <li>• Formulário de solicitação</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-3">
                    Respondemos em até 30 dias
                  </p>
                </div>
              </div>
            </section>

            {/* Transferência internacional */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Transferência Internacional</h2>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 mb-3">
                  <strong>Localização dos Dados:</strong> Seus dados são armazenados em servidores 
                  localizados em Moçambique e podem ser processados em outros países para fins de:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Backup e recuperação de desastres</li>
                  <li>• Processamento de pagamentos</li>
                  <li>• Suporte técnico especializado</li>
                </ul>
                <p className="text-xs text-yellow-600 mt-3">
                  Garantimos o mesmo nível de proteção em todas as transferências.
                </p>
              </div>
            </section>

            {/* Menores de idade */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Menores de Idade</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800">
                  <strong>Idade Mínima:</strong> Nossos serviços são destinados a pessoas com 
                  18 anos ou mais. Não coletamos intencionalmente dados de menores de 18 anos. 
                  Se descobrirmos que coletamos dados de um menor, excluiremos imediatamente.
                </p>
              </div>
            </section>

            {/* Mudanças na política */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Alterações nesta Política</h2>
              <p className="text-gray-700 mb-4">
                Podemos atualizar esta política periodicamente. Mudanças significativas serão 
                notificadas via email e através da plataforma com 30 dias de antecedência.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <strong>Versão atual:</strong> 1.0 (Janeiro 2025)<br />
                <strong>Próxima revisão:</strong> Julho 2025
              </div>
            </section>

            {/* Contato */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                12. Contato - Privacidade
              </h2>
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-gray-700 mb-3">
                  Para questões sobre privacidade, exercer seus direitos ou reportar preocupações:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email Privacidade:</strong> privacy@mozhost.com</p>
                  <p><strong>Responsável DPO:</strong> Habibo Julio (Eliobros Tech)</p>
                  <p><strong>Telefone:</strong> +258 XX XXX XXXX</p>
                  <p><strong>Endereço:</strong> Maputo, Moçambique</p>
                  <p><strong>Tempo de resposta:</strong> Até 30 dias</p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>© 2025 Eliobros Tech. Todos os direitos reservados.</p>
              <p>Política v1.0 - Janeiro 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;