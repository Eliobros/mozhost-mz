import React from 'react';
import Link from 'next/link';
import { Mail, MessageCircle, Users, BookOpen, Play, Clock, CheckCircle } from 'lucide-react';

export default function SuportePage() {
  const supportChannels = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'WhatsApp',
      description: 'Fale diretamente conosco pelo WhatsApp. Respondemos normalmente em até 24h.',
      action: 'Abrir WhatsApp',
      link: 'https://api.whatsapp.com/send?phone=258862840075&text=Ola%20preciso%20de%20ajuda',
      color: 'green',
      responseTime: 'Até 24h',
      availability: '24/7'
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: 'Email',
      description: 'Envie um email detalhado para mozhost@topaziocoin.online',
      action: 'Enviar Email',
      link: 'mailto:mozhost@topaziocoin.online',
      color: 'blue',
      responseTime: 'Até 48h',
      availability: '24/7'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Comunidade WhatsApp',
      description: 'Entre no nosso canal para novidades, dicas e ajuda da comunidade.',
      action: 'Entrar na Comunidade',
      link: 'https://chat.whatsapp.com/LFgjPsLujgkE3RJYkZM62I',
      color: 'purple',
      responseTime: 'Imediato',
      availability: 'Comunidade ativa'
    }
  ];

  const selfHelpResources = [
    {
      icon: <BookOpen className="w-6 h-6 text-blue-600" />,
      title: 'Documentação',
      description: 'Guias completos sobre todos os recursos da MozHost',
      link: '/docs'
    },
    {
      icon: <Play className="w-6 h-6 text-red-600" />,
      title: 'Tutoriais em Vídeo',
      description: 'Aprenda visualmente com nossos tutoriais passo a passo',
      link: 'https://youtube.com/playlist?list=PLT04Pp33I859F87tPvwKSPupCznNFKsxF&si=ieB-abhwDpG4eV4m'
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-purple-600" />,
      title: 'FAQ',
      description: 'Respostas para as perguntas mais frequentes',
      link: '/docs/faq'
    }
  ];

  const commonIssues = [
    {
      issue: 'Container não inicia',
      solution: 'Verifique os logs do container para identificar erros no código. Acesse: Containers → Seu Container → Ver Logs'
    },
    {
      issue: 'Erro de permissão nos arquivos',
      solution: 'Isso pode acontecer ao fazer upload manual. Use o CLI para fazer deploy que os arquivos terão as permissões corretas automaticamente.'
    },
    {
      issue: 'Database não conecta',
      solution: 'Verifique se as credenciais (host, porta, username, password) estão corretas nas variáveis de ambiente do seu container.'
    },
    {
      issue: 'Coins não foram creditados',
      solution: 'Aguarde até 5 minutos após o pagamento. Se não creditar, entre em contato com comprovante do pagamento.'
    },
    {
      issue: 'Deploy via CLI falha',
      solution: 'Verifique se está autenticado (mozhost whoami) e se o container existe. Tente mozhost init para vincular o projeto novamente.'
    }
  ];

  const tips = [
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'Seja específico ao descrever o problema'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'Inclua prints de tela quando possível'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'Mencione o nome do container afetado'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'Copie mensagens de erro completas'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'Informe o que você já tentou fazer'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Central de Suporte</h1>
        <p className="text-xl text-gray-600">
          Estamos aqui para ajudar! Escolha o canal que melhor se adapta à sua necessidade.
        </p>
      </div>

      {/* Support Channels */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Canais de Atendimento</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {supportChannels.map((channel, index) => (
            <div
              key={index}
              className={`border-2 border-${channel.color}-500 bg-${channel.color}-50 rounded-lg p-6 hover:shadow-lg transition-shadow`}
            >
              <div className={`text-${channel.color}-600 mb-4`}>
                {channel.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{channel.title}</h3>
              <p className="text-gray-700 text-sm mb-4">{channel.description}</p>
              
              <div className="space-y-2 mb-4 text-xs text-gray-600">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Resposta: {channel.responseTime}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>{channel.availability}</span>
                </div>
              </div>

              <a
                href={channel.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full bg-${channel.color}-600 text-white text-center px-4 py-3 rounded-lg hover:bg-${channel.color}-700 transition font-medium`}
              >
                {channel.action}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Self-Help Resources */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ajuda Rápida (Self-Service)</h2>
        <p className="text-gray-700 mb-6">
          Antes de entrar em contato, confira se sua dúvida já está respondida aqui:
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {selfHelpResources.map((resource, index) => (
            <Link
              key={index}
              href={resource.link}
              className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition"
            >
              <div className="mb-3">{resource.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{resource.title}</h3>
              <p className="text-sm text-gray-600">{resource.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Common Issues */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Problemas Comuns e Soluções</h2>
        <div className="space-y-4">
          {commonIssues.map((item, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-2">❓ {item.issue}</h3>
              <p className="text-gray-700 text-sm">
                <strong className="text-green-600">✓ Solução:</strong> {item.solution}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tips for Better Support */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            💡 Dicas para um Atendimento Mais Rápido
          </h2>
          <p className="text-gray-700 mb-4">
            Ajude-nos a ajudá-lo! Quanto mais informações você fornecer, mais rápido conseguimos resolver:
          </p>
          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-2">
                {tip.icon}
                <span className="text-gray-700 text-sm">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="mb-12">
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-3">
            🚨 Problemas Urgentes?
          </h2>
          <p className="text-red-800 mb-4">
            Se você está enfrentando um problema crítico que está afetando seu serviço em produção:
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://api.whatsapp.com/send?phone=258862840075&text=URGENTE%3A%20"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-medium"
            >
              📱 WhatsApp Urgente
            </a>
            <a
              href="mailto:mozhost@topaziocoin.online?subject=URGENTE"
              className="bg-white text-red-600 border-2 border-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition font-medium"
            >
              📧 Email Urgente
            </a>
          </div>
          <p className="text-xs text-red-700 mt-4">
            * Use apenas para problemas críticos. Para dúvidas gerais, use os canais normais acima.
          </p>
        </div>
      </section>

      {/* Horário de Atendimento */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">⏰ Horário de Atendimento</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Suporte por WhatsApp</h3>
              <p className="text-gray-700 text-sm mb-2">Segunda a Sexta: 8h - 20h</p>
              <p className="text-gray-700 text-sm mb-2">Sábado: 9h - 18h</p>
              <p className="text-gray-700 text-sm">Domingo: 10h - 16h</p>
              <p className="text-xs text-gray-500 mt-3">Horário de Moçambique (CAT/UTC+2)</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Suporte por Email</h3>
              <p className="text-gray-700 text-sm mb-2">Enviamos resposta em até 48h</p>
              <p className="text-gray-700 text-sm mb-2">Emails enviados fora do horário comercial serão respondidos no próximo dia útil</p>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                <p className="text-xs text-blue-800">
                  💡 Para respostas mais rápidas, use WhatsApp
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          💚 Conte-nos sobre sua experiência
        </h3>
        <p className="text-gray-700 mb-6">
          Sua opinião é muito importante para nós! Se você teve uma boa (ou má) experiência com nosso suporte, 
          adoraríamos ouvir seu feedback.
        </p>
        <a
          href="https://api.whatsapp.com/send?phone=258862840075&text=Feedback%20sobre%20suporte%3A%20"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium"
        >
          📝 Enviar Feedback
        </a>
      </section>

      {/* Navegação */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs/faq" className="text-blue-600 hover:text-blue-800 flex items-center">
            ← FAQ
          </Link>
          <Link href="/docs/precos" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            Próximo: Preços →
          </Link>
        </div>
      </div>
    </div>
  );
}
