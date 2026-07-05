"use client"

import React from 'react';
import Link from 'next/link';
import { 
  Rocket, Server, Code2, Users, Calendar, MapPin, 
  Cpu, Globe, ArrowRight, Star, Zap, Shield, Heart
} from 'lucide-react';

export default function AboutPage() {

  const milestones = [
    {
      date: 'Nov/Dez 2024',
      title: 'Nasceu a ZapHost-MZ',
      description: 'A semente de tudo. Uma plataforma de hospedagem de bots de WhatsApp com Docker, API própria e ambiente isolado por utilizador.',
      color: 'purple',
      icon: <Zap className="w-5 h-5" />
    },
    {
      date: '15 Mai 2024',
      title: 'Fundação da Eliobros Tech',
      description: 'A empresa ganhou nome, identidade e propósito — ainda sem registo formal, mas com visão clara do futuro.',
      color: 'blue',
      icon: <Star className="w-5 h-5" />
    },
    {
      date: 'Mar 2025',
      title: 'MozHost entra em desenvolvimento',
      description: 'Com uma visão mais ampla, nasceu a MozHost — absorvendo o melhor da ZapHost-MZ e expandindo para hospedar bots e APIs.',
      color: 'green',
      icon: <Server className="w-5 h-5" />
    },
    {
      date: '2025',
      title: 'Crescimento contínuo',
      description: 'Docker, múltiplas stacks, bases de dados, editor de código Monaco, Git, webhooks, domínios personalizados e muito mais.',
      color: 'orange',
      icon: <Rocket className="w-5 h-5" />
    }
  ];

  const values = [
    {
      icon: <Code2 className="w-7 h-7 text-blue-600" />,
      title: 'Feito por devs, para devs',
      description: 'Cada funcionalidade foi pensada por quem já sentiu a dor de não ter onde hospedar um projecto simples.'
    },
    {
      icon: <Shield className="w-7 h-7 text-green-600" />,
      title: 'Isolamento e segurança',
      description: 'Cada container é um ambiente independente com Docker — o teu bot nunca interfere com o de outra pessoa.'
    },
    {
      icon: <Globe className="w-7 h-7 text-blue-600" />,
      title: 'Feito em Moçambique',
      description: 'Uma plataforma africana, pensada para a realidade local, com suporte em português e meios de pagamento locais.'
    },
    {
      icon: <Heart className="w-7 h-7 text-red-600" />,
      title: 'Comunidade primeiro',
      description: 'Crescemos com os nossos utilizadores — o feedback da comunidade molda cada nova funcionalidade.'
    }
  ];

  const stats = [
    { value: '100%', label: 'Mobile-built', sub: 'Desenvolvido num telemóvel' },
    { value: 'Docker', label: 'Isolamento total', sub: 'Um container por utilizador' },
    { value: '5+', label: 'Bases de dados', sub: 'MySQL, Mongo, Redis e mais' },
    { value: '24/7', label: 'Uptime garantido', sub: 'Os teus bots nunca dormem' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block text-sm">
          ← Voltar para Documentação
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Server className="w-6 h-6" />
          </div>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Sobre a MozHost</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          Construída num telemóvel.<br />
          <span className="text-blue-600">Para quem cria sem limites.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          A MozHost nasceu da necessidade real de um programador moçambicano que queria manter os seus bots online sem depender de soluções externas.
        </p>
      </div>

      {/* Stats */}
      <section className="mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-100 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-blue-700 mb-1">{stat.value}</div>
              <div className="text-sm font-semibold text-gray-800 mb-1">{stat.label}</div>
              <div className="text-xs text-gray-500">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Origin Story */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Como tudo começou</h2>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Em novembro de 2024, o fundador da Eliobros Tech desenvolvia bots de WhatsApp para gerir vendas de internet. 
              O problema era claro: outros programadores rodavam os seus bots localmente no Termux — e quando o app fechava, o bot morria.
            </p>
            <p>
              A solução foi criar a <strong>ZapHost-MZ</strong>, uma plataforma de hospedagem com Docker e API própria, 
              inspirada na z-api.com mas construída do zero, com identidade moçambicana.
            </p>
            <p>
              Em março de 2025, a visão expandiu-se. Programadores iniciantes também precisavam de um lugar 
              simples para hospedar as suas primeiras APIs e projectos de estudo. Nasceu então a <strong>MozHost</strong>.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Marracuene, Maputo — Moçambique</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Desenvolvido 100% no telemóvel com Termux + Acode</span>
            </div>
          </div>

          {/* ZapHost Screenshot placeholder */}
          <div className="rounded-xl overflow-hidden border-2 border-dashed border-blue-300 bg-blue-50">
            <div className="bg-blue-100 px-4 py-2 flex items-center gap-2 border-b border-blue-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <span className="text-xs text-blue-700 font-mono">zaphost-mz — dashboard</span>
            </div>
            
              
              <img 
                src="/zaphost.png" 
                alt="ZapHost-MZ — plataforma original" 
                className="w-full object-cover"
              />
            
            
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">A nossa história</h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 hidden md:block"></div>

          <div className="space-y-6">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-6 items-start">
                {/* Dot */}
                <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-${m.color}-100 border-2 border-${m.color}-400 flex items-center justify-center text-${m.color}-600`}>
                  {m.icon}
                </div>
                <div className={`flex-1 bg-${m.color}-50 border border-${m.color}-200 rounded-xl p-5`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-bold text-${m.color}-700 bg-${m.color}-100 px-2 py-1 rounded-full flex items-center gap-1`}>
                      <Calendar className="w-3 h-3" />
                      {m.date}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{m.title}</h3>
                  <p className="text-sm text-gray-700">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Os nossos valores</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {values.map((v, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition">
              <div className="mb-3">{v.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
              <p className="text-sm text-gray-600">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-2xl">
              👨‍💻
            </div>
            <div>
              <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider mb-1">Fundador & CEO</p>
              <h3 className="text-2xl font-bold mb-3">Eliobros Tech</h3>
              <p className="text-blue-100 leading-relaxed text-sm mb-4">
                Programador autodidata, fundou a Eliobros Tech em maio de 2024 com a missão de criar soluções tecnológicas 
                acessíveis para Moçambique e além. Toda a plataforma foi construída num telemóvel, usando Termux e Acode — 
                prova de que criatividade não depende de equipamento.
              </p>
              <div className="flex items-center gap-2 text-blue-200 text-sm">
                <MapPin className="w-4 h-4" />
                <span>Marracuene, Maputo — Moçambique 🇲🇿</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 border-2 border-gray-200 rounded-xl p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Pronto para começar?</h3>
        <p className="text-gray-600 mb-6">
          Junta-te aos programadores que já confiam na MozHost para manter os seus projectos online 24/7.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/register"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
          >
            Criar conta grátis <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Ver Documentação
          </Link>
        </div>
      </section>

      {/* Navigation */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
            ← Documentação
          </Link>
          <Link href="/suporte" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-sm">
            Suporte →
          </Link>
        </div>
      </div>
    </div>
  );
}
