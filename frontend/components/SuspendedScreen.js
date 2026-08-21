'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Ban, AlertTriangle, Smartphone, MessageCircle, Check, Zap, Star,
  Rocket, Crown, Loader2, RefreshCw
} from 'lucide-react';

const API = 'https://api.mozhost.shop';

const PLAN_ICONS = { starter: Zap, basic: Star, pro: Rocket, business: Crown };
const PLAN_COLORS = {
  starter: 'from-blue-500 to-cyan-500',
  basic: 'from-blue-500 to-cyan-500',
  pro: 'from-orange-500 to-red-500',
  business: 'from-yellow-500 to-amber-500'
};

/**
 * Tela exibida quando a conta do usuário está suspensa (trial free expirado
 * ou plano pago sem renovação). Mostra os planos, como pagar via M-Pesa/e-Mola
 * e o botão direto para o WhatsApp de suporte enviar o comprovante.
 */
export default function SuspendedScreen({ username, reason }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/billing/plans`)
      .then(r => r.json())
      .then(data => setPlans(data.plans || []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  const whatsappLink = `https://api.whatsapp.com/send?phone=258862840075&text=${encodeURIComponent(
    `Olá! Minha conta MozHost está suspensa (${username || 'usuário'}). Acabei de fazer o pagamento do plano, segue o comprovante: `
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-500 px-8 py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
              <Ban className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Conta Suspensa</h1>
            <p className="text-red-100 mt-2 text-sm sm:text-base max-w-xl mx-auto">
              {reason === 'billing_expired'
                ? 'Seu plano mensal expirou e seus containers foram pausados.'
                : 'Seu período de teste grátis (7 dias) terminou e seus containers foram pausados.'}
            </p>
            {username && (
              <p className="text-red-100 text-xs mt-3 bg-white/10 inline-block px-3 py-1 rounded-full">
                Usuário: {username}
              </p>
            )}
          </div>

          <div className="p-8">
            {/* Alerta */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Para reativar seus containers e voltar a usar a plataforma, assine um plano abaixo.
                Seus dados estão guardados por <strong>5 dias</strong> — depois disso os containers
                serão removidos para liberar espaço no servidor.
              </p>
            </div>

            {/* Planos */}
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" /> Escolha seu plano
            </h2>

            {loadingPlans ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {plans.map(plan => {
                  const Icon = PLAN_ICONS[plan.id] || Zap;
                  const color = PLAN_COLORS[plan.id] || PLAN_COLORS.starter;
                  return (
                    <div key={plan.id} className="border border-gray-200 rounded-2xl p-4 text-center hover:border-blue-300 hover:shadow-lg transition-all">
                      <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">{plan.name}</h3>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {plan.price_mt}<span className="text-xs text-gray-500 font-normal"> MT/mês</span>
                      </p>
                      <ul className="mt-2 space-y-1 text-left">
                        {plan.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="flex items-center text-[11px] text-gray-600">
                            <Check className="w-3 h-3 text-green-500 mr-1 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Como pagar */}
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" /> Como pagar
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📱</span>
                  <h3 className="font-bold text-gray-900">M-Pesa</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Envie o valor do plano para o número abaixo:
                </p>
                <div className="bg-gray-50 rounded-lg px-4 py-2 font-mono text-lg font-bold text-gray-900 text-center">
                  86 284 0075
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Depois envie o comprovante no WhatsApp para ativarmos rapidinho.
                </p>
              </div>
              <div className="border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💳</span>
                  <h3 className="font-bold text-gray-900">e-Mola</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Envie o valor do plano para o número abaixo:
                </p>
                <div className="bg-gray-50 rounded-lg px-4 py-2 font-mono text-lg font-bold text-gray-900 text-center">
                  86 284 0075
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Depois envie o comprovante no WhatsApp para ativarmos rapidinho.
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MessageCircle className="w-5 h-5" /> Enviar comprovante no WhatsApp
              </a>
              <Link
                href="/billing"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <RefreshCw className="w-5 h-5" /> Pagar pelo painel
              </Link>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Dúvidas? Chama no WhatsApp <span className="font-semibold">+258 86 284 0075</span> — a gente te ajuda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
