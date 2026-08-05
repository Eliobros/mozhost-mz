"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    {
      category: '💰 Pagamento e Coins',
      questions: [
        {
          q: 'Quanto custa criar um container?',
          a: 'Criar um container custa 500 coins. Você pode comprar coins através de M-Pesa (50 MT = 500 coins), e-Mola (50 MT = 500 coins) ou MercadoPago (R$ 5 = 500 coins).'
        },
        {
          q: 'Como compro coins?',
          a: 'Acesse sua página de perfil, role até o final e clique em "Comprar Coins". Escolha entre M-Pesa, e-Mola (Moçambique) ou MercadoPago (Brasil). Os coins são creditados em até 5 minutos após confirmação do pagamento.'
        },
        {
          q: 'Os coins expiram?',
          a: 'Não! Seus coins não têm prazo de validade. Você pode usá-los quando quiser.'
        },
        {
          q: 'Posso pedir reembolso?',
          a: 'Sim, dentro de 7 dias após a compra, desde que os coins não tenham sido usados. Entre em contato com o suporte pelo email mozhost@topaziocoin.online ou WhatsApp +258 86 284 0075.'
        },
        {
          q: 'Quanto custa um database?',
          a: 'Cada database custa 5 coins por dia. Por exemplo, um database MySQL rodando por 30 dias custaria 150 coins.'
        },
        {
          q: 'Existe plano mensal?',
          a: 'Atualmente trabalhamos com sistema de coins pré-pago. Isso te dá mais flexibilidade - você só paga pelo que usar e quando precisar.'
        }
      ]
    },
    {
      category: '🖥️ Containers',
      questions: [
        {
          q: 'Quais tipos de containers posso criar?',
          a: 'Atualmente suportamos Node.js (JavaScript/TypeScript), Python (Flask), e PHP (com MySQL e phpMyAdmin inclusos). Em breve também teremos Go e Spring Boot.'
        },
        {
          q: 'Posso ter mais de um container?',
          a: 'Sim! Você pode criar quantos containers quiser, desde que tenha coins suficientes. Cada container custa 500 coins.'
        },
        {
          q: 'Como faço deploy do meu código?',
          a: 'Você pode fazer deploy de duas formas: (1) Via interface web usando o editor integrado, ou (2) Via CLI usando o comando "mozhost deploy". Recomendamos o CLI para projetos maiores.'
        },
        {
          q: 'Meu container parou sozinho, o que fazer?',
          a: 'Containers param automaticamente se houver erro no código. Acesse os logs do container para identificar o problema. Se precisar de ajuda, entre em contato com o suporte.'
        },
        {
          q: 'Posso reiniciar meu container?',
          a: 'Sim! Você pode parar, iniciar e reiniciar seus containers a qualquer momento através do painel de controle ou via CLI.'
        },
        {
          q: 'Quanto de RAM e armazenamento tenho?',
          a: 'Por padrão, cada container tem 512MB de RAM e 1GB de armazenamento. Você pode fazer upgrade pagando coins adicionais.'
        }
      ]
    },
    {
      category: '🗄️ Databases',
      questions: [
        {
          q: 'Quais bancos de dados vocês suportam?',
          a: 'Suportamos MySQL, MariaDB, PostgreSQL, MongoDB e Redis. Você pode criar quantos databases precisar.'
        },
        {
          q: 'O container PHP já vem com database?',
          a: 'Sim! Containers PHP já vem automaticamente com MySQL e phpMyAdmin configurados. Você não precisa criar database separado.'
        },
        {
          q: 'Como conecto meu container ao database?',
          a: 'Após criar o database, você receberá as credenciais (host, porta, username, password). Use essas informações nas variáveis de ambiente do seu container.'
        },
        {
          q: 'Posso importar dados existentes?',
          a: 'Sim! Você pode importar dados via phpMyAdmin (para MySQL) ou conectando diretamente ao database com ferramentas como DBeaver, MySQL Workbench, etc.'
        },
        {
          q: 'Como faço backup do meu database?',
          a: 'Atualmente você pode exportar manualmente via phpMyAdmin ou usando ferramentas de linha de comando. Estamos desenvolvendo backup automático.'
        }
      ]
    },
    {
      category: '🔧 CLI',
      questions: [
        {
          q: 'Como instalo o CLI?',
          a: 'No Windows: "npm i -g mozhost-cli". No Linux/Mac: "sudo npm i -g mozhost-cli". Você precisa ter Node.js instalado.'
        },
        {
          q: 'Como faço login no CLI?',
          a: 'Use o comando "mozhost auth" e digite seu username e senha da MozHost.'
        },
        {
          q: 'Posso fazer deploy sem criar container antes?',
          a: 'Sim! Use "mozhost init" no seu projeto, selecione um container existente ou crie um novo, e depois "mozhost deploy".'
        },
        {
          q: 'Como vejo os logs via CLI?',
          a: 'Use "mozhost logs <nome-do-container>" para ver logs em tempo real.'
        }
      ]
    },
    {
      category: '⚙️ Técnico',
      questions: [
        {
          q: 'Posso usar domínio próprio?',
          a: 'Atualmente todos os containers recebem um subdomínio gratuito (seu-container.mozhost.shop). Suporte a domínio customizado está em desenvolvimento.'
        },
        {
          q: 'Vocês suportam HTTPS?',
          a: 'Sim! Todos os containers têm certificado SSL/HTTPS automaticamente configurado.'
        },
        {
          q: 'Qual é o uptime garantido?',
          a: 'Trabalhamos para manter 99% de uptime. Em caso de manutenção programada, avisamos com antecedência na nossa comunidade WhatsApp.'
        },
        {
          q: 'Posso instalar dependências personalizadas?',
          a: 'Sim! Use package.json (Node.js), requirements.txt (Python) ou composer.json (PHP). As dependências são instaladas automaticamente no deploy.'
        },
        {
          q: 'Há limite de requisições?',
          a: 'Não temos limite rígido de requisições, mas pedimos uso consciente. Se seu container consumir recursos excessivos, entraremos em contato.'
        },
        {
          q: 'Posso rodar Cron Jobs?',
          a: 'Sim! Você pode criar scripts agendados dentro do seu container. Entre em contato com o suporte para configuração.'
        }
      ]
    },
    {
      category: '🆘 Suporte',
      questions: [
        {
          q: 'Como entro em contato com o suporte?',
          a: 'Você pode nos contatar por email (mozhost@topaziocoin.online), WhatsApp (+258 86 284 0075) ou pela nossa comunidade no WhatsApp. Respondemos normalmente em até 24h.'
        },
        {
          q: 'Vocês têm documentação?',
          a: 'Sim! Toda nossa documentação está disponível em mozhost.shop/docs com tutoriais, guias e exemplos práticos.'
        },
        {
          q: 'Vocês têm vídeos tutoriais?',
          a: 'Sim! Temos tutoriais completos no YouTube. Procure por "MozHost Tutorial" para aprender desde criar conta até fazer deploy.'
        },
        {
          q: 'Onde posso reportar bugs?',
          a: 'Entre em contato conosco por WhatsApp ou email descrevendo o problema. Quanto mais detalhes você fornecer, mais rápido conseguimos resolver.'
        }
      ]
    },
    {
      category: '🔒 Segurança e Privacidade',
      questions: [
        {
          q: 'Meus dados estão seguros?',
          a: 'Sim! Usamos criptografia SSL/TLS para todas as conexões. Seus dados de pagamento são processados por gateways seguros (M-Pesa, e-Mola, MercadoPago) e não armazenamos informações de cartão.'
        },
        {
          q: 'Quem pode acessar meu container?',
          a: 'Apenas você tem acesso aos seus containers e arquivos. Nossa equipe só acessa em caso de suporte técnico autorizado por você.'
        },
        {
          q: 'Vocês fazem backup dos meus dados?',
          a: 'Fazemos backups regulares da infraestrutura, mas recomendamos que você mantenha backups próprios dos seus códigos e databases importantes.'
        }
      ]
    }
  ];

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      faq =>
        faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    const index = `${categoryIndex}-${questionIndex}`;
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Perguntas Frequentes (FAQ)</h1>
        <p className="text-xl text-gray-600">
          Encontre respostas rápidas para as dúvidas mais comuns sobre a MozHost.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar perguntas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Categories */}
      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma pergunta encontrada para "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Limpar pesquisa
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredFaqs.map((category, catIndex) => (
            <div key={catIndex}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{category.category}</h2>
              <div className="space-y-3">
                {category.questions.map((faq, qIndex) => {
                  const isOpen = openIndex === `${catIndex}-${qIndex}`;
                  return (
                    <div
                      key={qIndex}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleQuestion(catIndex, qIndex)}
                        className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900 pr-8">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-700 leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Não encontrou resposta */}
      <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Não encontrou sua resposta?</h3>
        <p className="text-gray-700 mb-6">
          Entre em contato conosco! Nossa equipe está pronta para ajudar.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="mailto:mozhost@topaziocoin.online"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            📧 Email
          </a>
          <a
            href="https://api.whatsapp.com/send?phone=258862840075&text=Ola%20preciso%20de%20ajuda"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
          >
            💬 WhatsApp
          </a>
          <a
            href="https://whatsapp.com/channel/0029Vb6ydZS6rsQoxPBd861W"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            👥 Comunidade
          </a>
        </div>
      </div>

      {/* Navegação */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs/comprar-coins" className="text-blue-600 hover:text-blue-800 flex items-center">
            ← Comprar Coins
          </Link>
          <Link href="/docs/suporte" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            Próximo: Suporte →
          </Link>
        </div>
      </div>
    </div>
  );
}
