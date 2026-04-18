import React, { useState } from 'react';
import { Zap, X, Crown, Rocket, Shield, ArrowRight } from 'lucide-react';

const UpgradeBanner = ({ user, containers }) => {
  const [dismissed, setDismissed] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  // Calcular dias restantes do trial
  const trialEnds = user?.freeTrialEnds ? new Date(user.freeTrialEnds) : null;
  const now = new Date();
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24))) : null;
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;
  const trialExpiringSoon = trialDaysLeft !== null && trialDaysLeft <= 7 && trialDaysLeft > 0;

  if (dismissed && !trialExpired) return null;

  const containerCount = containers?.length || 0;
  const maxContainers = user?.maxContainers || 2;
  const usagePercent = maxContainers > 0 ? (containerCount / maxContainers) * 100 : 0;
  const isNearLimit = usagePercent >= 50 || trialExpired || trialExpiringSoon;

  const plans = [
    {
      name: 'Basic',
      price: '2.000 coins',
      features: ['5 containers', '1GB RAM', '2GB Storage', 'Suporte prioritário'],
      color: 'blue',
      value: 'basic'
    },
    {
      name: 'Pro',
      price: '5.000 coins',
      features: ['10 containers', '2GB RAM', '5GB Storage', 'Suporte VIP', 'Domínio customizado'],
      color: 'purple',
      popular: true,
      value: 'pro'
    }
  ];

  const handleUpgrade = async (planValue) => {
    const costs = { basic: 2000, pro: 5000 };
    const cost = costs[planValue];
    const userCoins = user?.coins || 0;

    if (userCoins < cost) {
      alert(`Você precisa de ${cost} coins para o plano ${planValue.toUpperCase()}. Você tem ${userCoins} coins.\n\nVá em "Comprar Coins" para adquirir mais.`);
      window.location.hash = 'comprar-coins';
      return;
    }

    if (!confirm(`Deseja fazer upgrade para o plano ${planValue.toUpperCase()} por ${cost} coins?`)) return;

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.shop/api/auth/upgrade-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planValue })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`🎉 Upgrade realizado com sucesso!\n\nPlano: ${planValue.toUpperCase()}\nCoins restantes: ${data.coins}`);
        // Atualizar user no localStorage
        const userData = JSON.parse(localStorage.getItem('mozhost_user') || '{}');
        userData.plan = planValue;
        localStorage.setItem('mozhost_user', JSON.stringify(userData));
        window.location.reload();
      } else {
        const err = await response.json();
        alert(err.message || 'Erro ao fazer upgrade');
      }
    } catch (error) {
      alert('Erro de conexão');
    }
  };

  return (
    <div className="relative">
      {/* Main Banner */}
      <div className={`rounded-lg border-2 p-4 sm:p-6 ${
        isNearLimit 
          ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300' 
          : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
      }`}>
        {!trialExpired && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/50 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`p-3 rounded-full ${isNearLimit ? 'bg-orange-100' : 'bg-blue-100'} flex-shrink-0`}>
            {isNearLimit ? (
              <Zap className="w-6 h-6 text-orange-600" />
            ) : (
              <Crown className="w-6 h-6 text-blue-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-lg ${isNearLimit ? 'text-orange-900' : 'text-blue-900'}`}>
              {trialExpired
                ? '🔴 Seu período gratuito de 30 dias expirou!'
                : trialExpiringSoon
                ? `⏰ Seu trial expira em ${trialDaysLeft} dia(s)!`
                : isNearLimit 
                ? `⚠️ Você está usando ${containerCount}/${maxContainers} containers!`
                : '🚀 Desbloqueie todo o potencial do MozHost!'
              }
            </h3>
            <p className={`text-sm mt-1 ${isNearLimit ? 'text-orange-700' : 'text-blue-700'}`}>
              {trialExpired
                ? 'Faça upgrade para continuar usando o MozHost. Seus containers serão pausados em breve.'
                : trialExpiringSoon
                ? 'Faça upgrade agora para não perder acesso aos seus containers e dados.'
                : isNearLimit
                ? 'Faça upgrade agora para mais containers, mais RAM e mais armazenamento.'
                : 'Seu plano Free tem recursos limitados. Faça upgrade para ter mais containers, mais RAM e suporte prioritário.'
              }
            </p>

            {/* Trial countdown */}
            {trialDaysLeft !== null && !trialExpired && (
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  trialExpiringSoon ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  ⏱️ {trialDaysLeft} dia(s) restante(s) no trial
                </span>
              </div>
            )}

            {/* Usage bar */}
            <div className="mt-3 max-w-xs">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Uso de containers</span>
                <span className="font-medium">{containerCount}/{maxContainers}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 75 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPlans(!showPlans)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white shadow-md transition-all flex-shrink-0 ${
              isNearLimit
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            <Rocket className="w-4 h-4" />
            Ver Planos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Plans dropdown */}
      {showPlans && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.value}
              className={`relative bg-white rounded-lg border-2 p-5 shadow-lg transition-all hover:shadow-xl ${
                plan.popular ? 'border-purple-400' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ⭐ POPULAR
                </div>
              )}

              <div className="text-center mb-4">
                <h4 className={`text-xl font-bold ${plan.color === 'purple' ? 'text-purple-700' : 'text-blue-700'}`}>
                  {plan.name}
                </h4>
                <p className="text-2xl font-bold text-gray-900 mt-1">{plan.price}</p>
                <p className="text-xs text-gray-500">pagamento único</p>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <Shield className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.value)}
                className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all ${
                  plan.color === 'purple'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                }`}
              >
                Fazer Upgrade
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpgradeBanner;
