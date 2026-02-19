'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard, Smartphone, Loader2, CheckCircle2, XCircle, Clock, AlertCircle,
  X, Shield, Crown, Rocket, Zap, Star, Check, ArrowRight, History, RefreshCw,
  Server, HardDrive, Cpu, Globe, Info, ChevronDown, ChevronUp, ExternalLink,
  Copy, Sparkles
} from 'lucide-react';

const API = 'https://api.mozhost.topaziocoin.online';

const hdrs = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mozhost_token') : '';
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
};

// ===== Toast =====
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', warning: 'bg-yellow-600' };
  const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertCircle };
  const Icon = icons[type] || Info;
  return (
    <div className={`fixed bottom-4 right-4 z-[60] ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 hover:bg-white/20 rounded"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ===== Plan Card =====
function PlanCard({ plan, current, onSelect, isCurrentPlan }) {
  const planIcons = { starter: Zap, basic: Star, pro: Rocket, business: Crown };
  const planColors = {
    starter: { bg: 'from-blue-500 to-cyan-500', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
    basic: { bg: 'from-purple-500 to-indigo-500', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
    pro: { bg: 'from-orange-500 to-red-500', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
    business: { bg: 'from-yellow-500 to-amber-500', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' }
  };
  const Icon = planIcons[plan.id] || Zap;
  const colors = planColors[plan.id] || planColors.starter;

  return (
    <div className={`relative bg-white rounded-2xl border-2 p-5 sm:p-6 transition-all hover:shadow-xl ${
      isCurrentPlan ? 'border-green-400 shadow-green-100 shadow-lg' : plan.popular ? `${colors.border} shadow-lg` : 'border-gray-200'
    }`}>
      {plan.popular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> POPULAR
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> PLANO ATUAL
        </div>
      )}

      <div className="text-center mb-5">
        <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-3`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold text-gray-900">{plan.price_mt}</span>
          <span className="text-gray-500 text-sm ml-1">MT/mês</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">≈ R$ {plan.price_brl}/mês</p>
      </div>

      <ul className="space-y-2.5 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          isCurrentPlan
            ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
            : plan.popular
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {isCurrentPlan ? (
          <><CheckCircle2 className="w-4 h-4" /> Plano Atual</>
        ) : (
          <><ArrowRight className="w-4 h-4" /> Assinar Agora</>
        )}
      </button>
    </div>
  );
}

// ===== Main Page Content =====
function BillingContent() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Payment modal
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [pollingId, setPollingId] = useState(null);

  // History toggle
  const [showHistory, setShowHistory] = useState(false);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  // ===== Load data =====
  const loadData = useCallback(async () => {
    try {
      const [plansRes, currentRes, historyRes] = await Promise.all([
        fetch(`${API}/api/billing/plans`),
        fetch(`${API}/api/billing/current`, { headers: hdrs() }),
        fetch(`${API}/api/billing/history`, { headers: hdrs() })
      ]);

      if (plansRes.ok) {
        const d = await plansRes.json();
        setPlans(d.plans || []);
      }
      if (currentRes.ok) {
        const d = await currentRes.json();
        setCurrentPlan(d.current || null);
      }
      if (historyRes.ok) {
        const d = await historyRes.json();
        setBillingHistory(d.billings || []);
      }
    } catch { showToast('Erro ao carregar dados', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Check URL params for payment return
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      showToast('Pagamento confirmado! Seu plano foi ativado 🎉');
      loadData();
    } else if (status === 'failure') {
      showToast('Pagamento falhou. Tente novamente.', 'error');
    } else if (status === 'pending') {
      showToast('Pagamento pendente. Estamos aguardando confirmação.', 'warning');
    }
  }, [searchParams, showToast, loadData]);

  // ===== Phone validation =====
  const handlePhoneChange = (value) => {
    const clean = value.replace(/[^0-9]/g, '');
    setPhone(clean);

    if (clean.length === 0) { setPhoneError(''); return; }
    if (clean.length < 9) { setPhoneError('Número deve ter 9 dígitos'); return; }
    if (clean.length > 9) { setPhoneError('Máximo 9 dígitos'); return; }

    const prefix = clean.substring(0, 2);
    if (!['84', '85', '86', '87'].includes(prefix)) {
      setPhoneError('Deve começar com 84, 85, 86 ou 87');
      return;
    }
    if (paymentMethod === 'mpesa' && !['84', '85'].includes(prefix)) {
      setPhoneError('M-Pesa aceita apenas 84/85');
      return;
    }
    if (paymentMethod === 'emola' && !['86', '87'].includes(prefix)) {
      setPhoneError('e-Mola aceita apenas 86/87');
      return;
    }
    setPhoneError('');
  };

  // Auto-detect method from phone
  useEffect(() => {
    if (phone.length >= 2) {
      const prefix = phone.substring(0, 2);
      if (['84', '85'].includes(prefix)) setPaymentMethod('mpesa');
      else if (['86', '87'].includes(prefix)) setPaymentMethod('emola');
    }
  }, [phone]);

  // ===== Subscribe =====
  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    if ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && phone.length !== 9) {
      showToast('Digite um número válido com 9 dígitos', 'error');
      return;
    }
    if (phoneError) { showToast('Corrija o número de telefone', 'error'); return; }

    setPaying(true);
    setPaymentResult(null);

    try {
      const body = {
        planId: selectedPlan.id,
        method: paymentMethod,
      };

      if (paymentMethod === 'mpesa' || paymentMethod === 'emola') {
        body.phone = phone;
      }

      const res = await fetch(`${API}/api/billing/subscribe`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentResult(data);

        // Se MercadoPago, redirecionar
        if (data.payment_url) {
          window.open(data.payment_url, '_blank');
        }

        // Iniciar polling de status
        if (data.billing_id) {
          startPolling(data.billing_id);
        }
      } else {
        showToast(data.error || 'Erro ao processar pagamento', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setPaying(false); }
  };

  // ===== Poll payment status =====
  const startPolling = (billingId) => {
    if (pollingId) clearInterval(pollingId);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/billing/${billingId}/status`, { headers: hdrs() });
        if (res.ok) {
          const data = await res.json();
          if (data.billing?.status === 'active') {
            clearInterval(interval);
            setPollingId(null);
            showToast('🎉 Pagamento confirmado! Plano ativado!');
            setSelectedPlan(null);
            setPaymentResult(null);
            setPhone('');
            loadData();
          } else if (data.billing?.status === 'failed') {
            clearInterval(interval);
            setPollingId(null);
            showToast('Pagamento falhou. Tente novamente.', 'error');
          }
        }
      } catch {}
    }, 5000);

    setPollingId(interval);

    // Timeout após 10 minutos
    setTimeout(() => {
      clearInterval(interval);
      setPollingId(null);
    }, 600000);
  };

  // Cleanup polling
  useEffect(() => {
    return () => { if (pollingId) clearInterval(pollingId); };
  }, [pollingId]);

  const cpy = (t) => { navigator.clipboard.writeText(t); showToast('Copiado!'); };

  const statusCfg = (s) => ({
    pending: { text: 'Pendente', cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
    processing: { text: 'Processando', cls: 'bg-blue-100 text-blue-700', icon: RefreshCw },
    active: { text: 'Ativo', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    expired: { text: 'Expirado', cls: 'bg-gray-100 text-gray-700', icon: Clock },
    failed: { text: 'Falhou', cls: 'bg-red-100 text-red-700', icon: XCircle },
    cancelled: { text: 'Cancelado', cls: 'bg-gray-100 text-gray-500', icon: XCircle }
  }[s] || { text: s, cls: 'bg-gray-100 text-gray-600', icon: Clock });

  // ===== Render =====
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">Carregando planos...</p>
      </div>
    );
  }

  const trialEnds = currentPlan?.free_trial_ends ? new Date(currentPlan.free_trial_ends) : null;
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24))) : null;
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;
  const activeSubscription = currentPlan?.active_subscription;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-5 sm:p-8 mb-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Planos & Pagamentos</h1>
                <p className="text-indigo-100 text-sm mt-0.5">Escolha o plano ideal para o seu projeto</p>
              </div>
            </div>

            {/* Current plan badge */}
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3">
              <p className="text-xs text-indigo-200">Plano atual</p>
              <p className="text-lg font-bold capitalize">{currentPlan?.plan || 'Free'}</p>
              {activeSubscription && (
                <p className="text-xs text-indigo-200 mt-0.5">
                  Expira: {new Date(activeSubscription.expires_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trial / Status Alerts */}
        {trialExpired && !activeSubscription && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">Seu período gratuito expirou!</p>
              <p className="text-sm text-red-700 mt-0.5">Assine um plano para continuar usando seus containers. Sem um plano ativo, eles serão pausados.</p>
            </div>
          </div>
        )}

        {trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 7 && !activeSubscription && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-yellow-900">Seu trial expira em {trialDaysLeft} dia(s)</p>
              <p className="text-sm text-yellow-700 mt-0.5">Assine um plano para não perder acesso aos seus containers e dados.</p>
            </div>
          </div>
        )}

        {/* Current Usage */}
        {currentPlan && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Containers', value: `${currentPlan.containers_used}/${currentPlan.max_containers}`, icon: Server, pct: (currentPlan.containers_used / currentPlan.max_containers) * 100 },
              { label: 'RAM', value: `${currentPlan.max_ram_mb}MB`, icon: Cpu },
              { label: 'Storage', value: `${currentPlan.max_storage_mb >= 1024 ? (currentPlan.max_storage_mb / 1024).toFixed(0) + 'GB' : currentPlan.max_storage_mb + 'MB'}`, icon: HardDrive },
              { label: 'Domínios', value: currentPlan.plan === 'free' ? 'Subdomínio' : 'Customizado', icon: Globe }
            ].map((item, i) => {
              const I = item.icon;
              return (
                <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                  <I className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  {item.pct !== undefined && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${item.pct >= 80 ? 'bg-red-500' : item.pct >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Plans Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Escolha seu plano</h2>
          <p className="text-sm text-gray-500 mb-6">Pague com M-Pesa, e-Mola ou MercadoPago</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={currentPlan}
                isCurrentPlan={currentPlan?.plan === plan.id && !!activeSubscription}
                onSelect={setSelectedPlan}
              />
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              <span className="font-bold text-gray-900">Histórico de Pagamentos</span>
              {billingHistory.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{billingHistory.length}</span>
              )}
            </div>
            {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="border-t">
              {billingHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum pagamento realizado</p>
                </div>
              ) : (
                <div className="divide-y">
                  {billingHistory.map((b) => {
                    const st = statusCfg(b.status);
                    const SI = st.icon;
                    const plan = plans.find(p => p.id === b.plan_id);
                    return (
                      <div key={b.id} className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.cls}`}>
                            <SI className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">
                              Plano {plan?.name || b.plan_id}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(b.created_at).toLocaleDateString('pt-BR')} • {b.method?.toUpperCase()} • Ref: {b.reference_code}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-bold text-gray-900 text-sm">
                            {b.currency === 'BRL' ? 'R$' : 'MT'} {parseFloat(b.amount).toFixed(0)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                            {st.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======= PAYMENT MODAL ======= */}
        {selectedPlan && !paymentResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900">Assinar Plano</h2>
                  <button onClick={() => { setSelectedPlan(null); setPhone(''); setPhoneError(''); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>

                {/* Plan summary */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Plano selecionado</p>
                      <p className="text-lg font-bold text-gray-900">{selectedPlan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Mensal • Renova a cada 30 dias</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{selectedPlan.price_mt} MT</p>
                      <p className="text-xs text-gray-400">≈ R$ {selectedPlan.price_brl}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'mpesa', name: 'M-Pesa', desc: '84/85', color: 'green' },
                      { id: 'emola', name: 'e-Mola', desc: '86/87', color: 'blue' },
                      { id: 'mercadopago', name: 'MercadoPago', desc: 'Cartão', color: 'cyan' }
                    ].map(m => (
                      <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                        className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all text-center ${
                          paymentMethod === m.id
                            ? `border-${m.color}-500 bg-${m.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <Smartphone className={`w-5 h-5 mb-1 ${paymentMethod === m.id ? `text-${m.color}-600` : 'text-gray-400'}`} />
                        <span className="text-xs font-semibold">{m.name}</span>
                        <span className="text-[10px] text-gray-400">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Input (for mobile payments) */}
                {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Telefone</label>
                    <input
                      type="tel"
                      placeholder={paymentMethod === 'mpesa' ? '841234567' : '861234567'}
                      value={phone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      maxLength={9}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg font-mono tracking-wider ${
                        phoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : phone.length === 9 && !phoneError ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                    {phoneError && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{phoneError}
                      </p>
                    )}
                    {!phoneError && phone.length === 9 && (
                      <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Número válido
                      </p>
                    )}
                  </div>
                )}

                {paymentMethod === 'mercadopago' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5">
                    <p className="text-xs text-blue-700 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Você será redirecionado para o MercadoPago para completar o pagamento com cartão de crédito/débito ou PIX.</span>
                    </p>
                  </div>
                )}

                {/* Security notice */}
                <div className="bg-gray-50 rounded-xl p-3 mb-5">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600">
                      Pagamento seguro processado pela Alauda API. Seus dados não são armazenados.
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubscribe}
                  disabled={paying || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && (phone.length !== 9 || !!phoneError))}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-base hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {paying ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                  ) : (
                    <><CreditCard className="w-5 h-5" /> Pagar {selectedPlan.price_mt} MT</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======= PAYMENT RESULT MODAL ======= */}
        {paymentResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center mb-5">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                  {pollingId ? (
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {pollingId ? 'Aguardando Confirmação' : 'Pagamento Iniciado'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {pollingId ? 'Confirme o pagamento no seu celular' : 'Siga as instruções abaixo'}
                </p>
              </div>

              {/* Payment details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Referência</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-gray-900">{paymentResult.reference_code}</span>
                    <button onClick={() => cpy(paymentResult.reference_code)} className="p-0.5 hover:bg-gray-200 rounded">
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plano</span>
                  <span className="font-medium text-gray-900">{paymentResult.plan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor</span>
                  <span className="font-bold text-gray-900">
                    {paymentResult.currency === 'BRL' ? 'R$' : 'MT'} {parseFloat(paymentResult.amount).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              {paymentResult.payment_details?.instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Instruções:</p>
                  <ol className="space-y-1.5">
                    {paymentResult.payment_details.instructions.map((inst, i) => (
                      <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {inst}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* MercadoPago link */}
              {paymentResult.payment_url && (
                <a href={paymentResult.payment_url} target="_blank" rel="noopener noreferrer"
                  className="w-full mb-4 inline-flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 text-sm font-medium">
                  <ExternalLink className="w-4 h-4" /> Abrir MercadoPago
                </a>
              )}

              {pollingId && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando pagamento automaticamente...</span>
                </div>
              )}

              <button
                onClick={() => { setPaymentResult(null); setSelectedPlan(null); setPhone(''); if (pollingId) clearInterval(pollingId); setPollingId(null); }}
                className="w-full px-4 py-3 border rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ===== Page wrapper with Suspense for useSearchParams =====
export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
