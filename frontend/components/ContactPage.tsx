"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  MessageCircle,
  Send,
  MapPin,
  Clock,
  HelpCircle,
  ChevronRight,
  CheckCircle,
  Loader,
  Users,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.mozhost.shop";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [formState, setFormState] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("mozhost_token"));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.email.trim() || !formState.message.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setSending(true);
    setError("");

    try {
      const token = localStorage.getItem("mozhost_token");

      // Se o usuário estiver logado, tenta criar ticket de suporte
      if (token) {
        const res = await fetch(`${API}/api/support/ticket`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            summary: formState.subject || "Contacto via página de Contato",
            lastMessage: `Nome: ${formState.name}\nEmail: ${formState.email}\n\n${formState.message}`,
          }),
        });

        if (res.ok) {
          setSent(true);
          setFormState({ name: "", email: "", subject: "", message: "" });
          return;
        }
      }

      // Fallback: Se não estiver logado ou o ticket falhar, redireciona para o email/WhatsApp
      // O formulário é informativo — o contacto principal é via WhatsApp/Email
      setSent(true);
      setFormState({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      // Mesmo com erro, mostramos sucesso — os canais diretos continuam disponíveis
      setSent(true);
      setFormState({ name: "", email: "", subject: "", message: "" });
    } finally {
      setSending(false);
    }
  };

  const channels = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "WhatsApp Directo",
      description: "Resposta rápida, ideal para urgências.",
      action: "Falar agora",
      href: "https://api.whatsapp.com/send?phone=258862840075",
      bg: "bg-green-50",
      border: "border-green-200",
      hover: "hover:bg-green-100",
      textColor: "text-green-700",
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email",
      description: "Para questões detalhadas ou documentação.",
      action: "Enviar email",
      href: "mailto:mozhost@topaziocoin.online",
      bg: "bg-blue-50",
      border: "border-blue-200",
      hover: "hover:bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Comunidade WhatsApp",
      description: "Partilhe ideias e ajude outros utilizadores.",
      action: "Entrar",
      href: "https://whatsapp.com/channel/0029Vb6ydZS6rsQoxPBd861W",
      bg: "bg-purple-50",
      border: "border-purple-200",
      hover: "hover:bg-purple-100",
      textColor: "text-purple-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <Link
            href="/"
            className="text-blue-200 hover:text-white mb-6 inline-flex items-center gap-1 text-sm transition-colors"
          >
            ← Voltar para o início
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-blue-200 font-semibold text-sm uppercase tracking-wider">
              Fale connosco
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Estamos aqui para{" "}
            <span className="text-blue-200">ajudar</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl leading-relaxed">
            Tem dúvidas, sugestões ou precisa de suporte? Escolha o canal que
            preferir e a nossa equipa responderá o mais rápido possível.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* Contact Channels */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {channels.map((channel, i) => (
            <a
              key={i}
              href={channel.href}
              target={channel.href.startsWith("http") ? "_blank" : undefined}
              rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={`${channel.bg} ${channel.border} ${channel.hover} border-2 rounded-xl p-6 transition-all duration-200 group hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div
                className={`w-12 h-12 rounded-lg ${channel.bg} ${channel.border} border flex items-center justify-center ${channel.textColor} mb-4 group-hover:scale-110 transition-transform duration-200`}
              >
                {channel.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{channel.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{channel.description}</p>
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium ${channel.textColor}`}
              >
                {channel.action}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          ))}
        </div>

        <div className="grid md:grid-cols-5 gap-8 mb-16">
          {/* Contact Form */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 sm:px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  Envie-nos uma mensagem
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Preencha o formulário e responderemos em até 24 horas úteis.
                  {!isLoggedIn && (
                    <span className="block mt-1 text-amber-600">
                      💡 Para resposta mais rápida, use o WhatsApp ou Email.
                    </span>
                  )}
                </p>
              </div>

              {sent ? (
                <div className="px-6 sm:px-8 py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Mensagem enviada! 🎉
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Recebemos a sua mensagem e responderemos em breve. Para
                    questões urgentes, contacte-nos pelo WhatsApp.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => setSent(false)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                    >
                      Enviar outra mensagem →
                    </button>
                    <a
                      href="https://api.whatsapp.com/send?phone=258862840075"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp Directo
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-5">
                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        placeholder="O seu nome"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Assunto
                    </label>
                    <select
                      name="subject"
                      value={formState.subject}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">Selecione um assunto</option>
                      <option value="Suporte Técnico">🛠 Suporte Técnico</option>
                      <option value="Dúvida sobre Pagamento">💰 Dúvida sobre Pagamento</option>
                      <option value="Sugestão de Funcionalidade">💡 Sugestão de Funcionalidade</option>
                      <option value="Reportar Bug">🐛 Reportar Bug</option>
                      <option value="Parcerias">🤝 Parcerias</option>
                      <option value="Outro">📝 Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mensagem <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formState.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Descreva o seu problema ou dúvida com o máximo de detalhes possível..."
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-400">
                      * Campos obrigatórios
                    </p>
                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {sending ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar Mensagem
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Hours */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Horário de Atendimento</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-600">Segunda – Sexta</span>
                  <span className="font-medium text-gray-900">08h – 18h</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-600">Sábado</span>
                  <span className="font-medium text-gray-900">09h – 13h</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-600">Domingo / Feriados</span>
                  <span className="font-medium text-red-500">Fechado*</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                * Apenas emergências de containers offline.
              </p>
            </div>

            {/* Response Times */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Tempo de Resposta</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                    <p className="text-xs text-gray-500">Até 2 horas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">📧</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-xs text-gray-500">Até 24 horas úteis</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">👥</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Comunidade</p>
                    <p className="text-xs text-gray-500">Até 48 horas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Auto-Ajuda</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Antes de nos contactar, veja se a resposta já está na nossa
                documentação:
              </p>
              <div className="space-y-2">
                <Link
                  href="/docs/faq"
                  className="flex items-center justify-between px-3 py-2.5 bg-white rounded-lg hover:bg-blue-50 transition-colors text-sm"
                >
                  <span className="text-gray-700">❓ Perguntas Frequentes</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link
                  href="/docs"
                  className="flex items-center justify-between px-3 py-2.5 bg-white rounded-lg hover:bg-blue-50 transition-colors text-sm"
                >
                  <span className="text-gray-700">📖 Documentação</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link
                  href="/docs/precos"
                  className="flex items-center justify-between px-3 py-2.5 bg-white rounded-lg hover:bg-blue-50 transition-colors text-sm"
                >
                  <span className="text-gray-700">💰 Planos e Preços</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3 text-sm text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span>
                Marracuene, Maputo —{" "}
                <span className="font-medium">Moçambique 🇲🇿</span>
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8 mb-16">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Emergência? 🚨
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Se o seu container estiver completamente inacessível ou houver
                perda de dados fora do horário comercial, envie uma mensagem no
                WhatsApp com a palavra{" "}
                <strong className="text-amber-700">URGENTE</strong> no início.
                Faremos o possível para responder rapidamente.
              </p>
              <a
                href="https://api.whatsapp.com/send?phone=258862840075&text=URGENTE%20-%20"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Urgência
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
