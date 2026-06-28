'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, Plus, Loader2, CheckCircle2, XCircle, Clock, Lock, AlertCircle,
  Copy, Trash2, RefreshCw, Search, ShoppingCart, Server, Edit3, Save,
  ExternalLink, Shield, Settings, X, ChevronDown, ChevronUp, Calendar,
  Link2, Unlink, Eye, DollarSign, Tag, Info, ArrowRight, Filter,
  Smartphone, CreditCard
} from 'lucide-react';

const API = 'https://api.mozhost.shop';
const ALAUDA_API_URL = 'https://alauda-api.mozhost.shop';

// ===== HELPERS =====
const hdrs = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mozhost_token') : '';
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const cpy = (t) => { navigator.clipboard.writeText(t); };
const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'ALIAS'];
const POPULAR_TLDS = ['.com', '.net', '.org', '.io', '.dev', '.app', '.co', '.mz', '.com.br', '.xyz', '.tech', '.online', '.site', '.store', '.shop'];

// ===== CURRENCY HELPERS =====
const DEFAULT_RATE = parseFloat(process.env.NEXT_PUBLIC_USD_TO_MT || '64') || 64;

function formatMZN(usd, rate) {
  const mzn = Math.ceil(parseFloat(usd) * rate);
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    maximumFractionDigits: 0,
  }).format(mzn);
}

function useExchangeRate() {
  const [rate, setRate] = useState(DEFAULT_RATE);

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then(d => { if (d.rate) setRate(d.rate); })
      .catch(() => {});
  }, []);

  return rate;
}

// ===== STATUS CONFIG =====
const stCfg = (s) => ({
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', text: 'Pendente', dot: 'bg-yellow-400' },
  dns_configured: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'DNS OK', dot: 'bg-blue-400' },
  ssl_generating: { icon: Lock, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200', text: 'SSL...', dot: 'bg-purple-400' },
  active: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 border-green-200', text: 'Ativo', dot: 'bg-green-400' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', text: 'Falhou', dot: 'bg-red-400' }
}[s] || { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', text: s || 'Desconhecido', dot: 'bg-gray-400' });

const daysUntil = (date) => {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const expiryBadge = (date) => {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return { text: 'Expirado', cls: 'bg-red-100 text-red-700' };
  if (days <= 30) return { text: `${days}d restantes`, cls: 'bg-red-100 text-red-700' };
  if (days <= 90) return { text: `${days}d restantes`, cls: 'bg-yellow-100 text-yellow-700' };
  return { text: `${days}d restantes`, cls: 'bg-green-100 text-green-700' };
};

// ===== TOAST COMPONENT =====
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600'
  };

  return (
    <div className={`fixed bottom-4 right-4 z-[60] ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up max-w-sm`}>
      {type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
      {type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0" />}
      {type === 'info' && <Info className="w-4 h-4 flex-shrink-0" />}
      {type === 'warning' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 hover:bg-white/20 rounded">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ===== CONFIRM MODAL =====
function ConfirmModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, onConfirm, onCancel, loading = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50">
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function DomainsPage() {
  const exchangeRate = useExchangeRate(); // ← taxa USD→MZN

  const [activeTab, setActiveTab] = useState('mydomains');
  const [domains, setDomains] = useState([]);
  const [containers, setContainers] = useState([]);
  const [registeredDomains, setRegisteredDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Conectar domínio
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState({});

  // Pesquisa/compra
  const [searchDomain, setSearchDomain] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(null);
  const [buyLinkContainer, setBuyLinkContainer] = useState('');

  // Renovação
  const [renewingDomain, setRenewingDomain] = useState(null);
  const [renewYears, setRenewYears] = useState(1);
  const [showRenewModal, setShowRenewModal] = useState(null);

  // DNS
  const [selectedDnsDomain, setSelectedDnsDomain] = useState('');
  const [dnsRecords, setDnsRecords] = useState([]);
  const [loadingDns, setLoadingDns] = useState(false);
  const [showDnsForm, setShowDnsForm] = useState(false);
  const [dnsForm, setDnsForm] = useState({ name: '', type: 'A', content: '', ttl: 600, prio: '' });
  const [editingDns, setEditingDns] = useState(null);
  const [savingDns, setSavingDns] = useState(false);
  const [dnsFilter, setDnsFilter] = useState('');

  // Nameservers
  const [selectedNsDomain, setSelectedNsDomain] = useState('');
  const [nameservers, setNameservers] = useState([]);
  const [loadingNs, setLoadingNs] = useState(false);
  const [editingNs, setEditingNs] = useState(false);
  const [nsForm, setNsForm] = useState(['', '', '', '']);
  const [savingNs, setSavingNs] = useState(false);

  // Expandir domínio registrado
  const [expandedDomain, setExpandedDomain] = useState(null);

  // Filtro meus domínios
  const [domainStatusFilter, setDomainStatusFilter] = useState('all');

  // Pagamento de domínios
  const [payStep, setPayStep] = useState(1);
  const [payMethod, setPayMethod] = useState('mpesa');
  const [payPhone, setPayPhone] = useState('');
  const [payPhoneError, setPayPhoneError] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [payResult, setPayResult] = useState(null);
  const [payPollingId, setPayPollingId] = useState(null);

// Ref para o polling de status de transferência (ciclo de vida fora do React).
// Inicializado como null e zerado no cleanup do effect principal + stopTransferPolling().
const transferPollRef = useRef(null);
const stopTransferPolling = () => {
  if (transferPollRef.current) {
    clearInterval(transferPollRef.current);
    transferPollRef.current = null;
  }
};

// Dados do registrante
const [registrantForm, setRegistrantForm] = useState({
  first_name: '', last_name: '', email_contact: '',
  phone_contact: '', address: '', city: '',
  state: 'Maputo', zip: '0000', country: 'MZ'
});

// Transferência
const [showTransferModal, setShowTransferModal] = useState(false);
const [transferTab, setTransferTab] = useState('in'); // 'in' | 'out'
const [transferForm, setTransferForm] = useState({ domain: '', auth_code: '' });
const [transferOut, setTransferOut] = useState({ domain: '' });
const [transferResult, setTransferResult] = useState(null);
const [transferOutResult, setTransferOutResult] = useState(null);
const [transferProcessing, setTransferProcessing] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ===== DATA LOADING =====
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [domainsRes, containersRes, regRes] = await Promise.all([
        fetch(`${API}/api/domains`, { headers: hdrs() }),
        fetch(`${API}/api/containers`, { headers: hdrs() }),
        fetch(`${API}/api/registrar/list`, { headers: hdrs() }).catch(() => null)
      ]);
      if (domainsRes.ok) { const d = await domainsRes.json(); setDomains(Array.isArray(d) ? d : []); }
      if (containersRes.ok) { const c = await containersRes.json(); setContainers(c?.containers || []); }
      if (regRes && regRes.ok) { const r = await regRes.json(); setRegisteredDomains(r?.domains || []); }
    } catch { setError('Erro de conexão com o servidor'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    // Cleanup: limpa polling de transferência ao desmontar a página / trocar de aba.
    return () => {
      clearInterval(interval);
      stopTransferPolling();
    };
  }, [loadData]);

  // ===== DOMAIN ACTIONS =====
  const addDomain = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/domains`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ containerId: selectedContainer, domain: newDomain.toLowerCase().trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false); setNewDomain(''); setSelectedContainer('');
        loadData();
        showToast(`Domínio adicionado! Configure DNS tipo A → ${data.instructions?.ip}`);
      } else {
        showToast(data.error || 'Erro ao adicionar domínio', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setSubmitting(false); }
  };

  const removeDomain = async (id, name) => {
    setRenewingDomain({ id, name, action: 'remove' });
  };

  const confirmRemoveDomain = async () => {
    const { id } = renewingDomain;
    try {
      const res = await fetch(`${API}/api/domains/${id}`, { method: 'DELETE', headers: hdrs() });
      if (res.ok) { loadData(); showToast('Domínio removido'); }
      else showToast('Erro ao remover domínio', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setRenewingDomain(null); }
  };

  const verifyDomain = async (id) => {
    setVerifying(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API}/api/domains/${id}/verify`, { method: 'POST', headers: hdrs() });
      const data = await res.json();
      if (res.ok) {
        showToast(data.configured ? `DNS verificado! IP: ${data.ip}` : `DNS não propagou ainda. IP: ${data.ip || 'nenhum'}`, data.configured ? 'success' : 'warning');
        loadData();
      } else showToast(data.error || 'Erro na verificação', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setVerifying(p => ({ ...p, [id]: false })); }
  };

  // ===== SEARCH & BUY =====
  const checkDomain = async () => {
    const raw = searchDomain.trim().toLowerCase();
    if (!raw) return;

    setSearching(true);
    setSearchResults([]);

    const hasTld = raw.includes('.');
    const domainsToCheck = hasTld
      ? [raw]
      : POPULAR_TLDS.slice(0, 8).map(tld => `${raw}${tld}`);

    try {
      const results = await Promise.allSettled(
        domainsToCheck.map(async (domain) => {
          const res = await fetch(`${API}/api/registrar/check/${domain}`, { headers: hdrs() });
          if (!res.ok) throw new Error('Erro');
          const data = await res.json();
          return { ...data, domain };
        })
      );

      const parsed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => {
          if (a.available && !b.available) return -1;
          if (!a.available && b.available) return 1;
          return (parseFloat(a.price) || 999) - (parseFloat(b.price) || 999);
        });

      setSearchResults(parsed);
      if (parsed.length === 0) showToast('Nenhum resultado encontrado', 'warning');
    } catch { showToast('Erro ao pesquisar domínios', 'error'); }
    finally { setSearching(false); }
  };

  // ===== PHONE VALIDATION =====
  const handlePayPhoneChange = (value) => {
    const clean = value.replace(/[^0-9]/g, '');
    setPayPhone(clean);
    if (clean.length === 0) { setPayPhoneError(''); return; }
    if (clean.length < 9) { setPayPhoneError('Número deve ter 9 dígitos'); return; }
    if (clean.length > 9) { setPayPhoneError('Máximo 9 dígitos'); return; }
    const prefix = clean.substring(0, 2);
    if (!['84', '85', '86', '87'].includes(prefix)) { setPayPhoneError('Deve começar com 84, 85, 86 ou 87'); return; }
    if (payMethod === 'mpesa' && !['84', '85'].includes(prefix)) { setPayPhoneError('M-Pesa aceita apenas 84/85'); return; }
    if (payMethod === 'emola' && !['86', '87'].includes(prefix)) { setPayPhoneError('e-Mola aceita apenas 86/87'); return; }
    setPayPhoneError('');
  };

  const resetPayState = () => {
    setPayStep(1); setPayMethod('mpesa'); setPayPhone(''); setPayPhoneError('');
    setPayProcessing(false); setPayResult(null);
    if (payPollingId) clearInterval(payPollingId);
    setPayPollingId(null);
  };

  const closeBuyModal = () => { setShowBuyModal(null); setBuyLinkContainer(''); resetPayState(); };
  const closeRenewModal = () => { setShowRenewModal(null); setRenewYears(1); resetPayState(); };

  // ===== DOMAIN PAYMENT =====
  const submitDomainPaymentWithRegistrant = async (action, domain, cost, years, registrant) => {
  if ((payMethod === 'mpesa' || payMethod === 'emola') && payPhone.length !== 9) {
    showToast('Digite um número válido com 9 dígitos', 'error'); return;
  }
  setPayProcessing(true);
  try {
    let transactionId = null;
    if (payMethod === 'mpesa' || payMethod === 'emola') {
      const endpoint = payMethod === 'mpesa' ? 'mpesa' : 'emola';
      const alaudaRes = await fetch(`${ALAUDA_API_URL}/api/payment/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `ApiKey ${process.env.NEXT_PUBLIC_ALAUDA_API_KEY || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: Math.ceil(parseFloat(cost) * exchangeRate).toString(),
          numero_celular: payPhone,
          usuario_id: (JSON.parse(localStorage.getItem('mozhost_user') || '{}').id || 'guest').toString()
        })
      });
      const ad = await alaudaRes.json();
      transactionId = ad?.data?.payment?.transaction_id || ad?.transaction_id;
    }
    const body = {
      domain, action, cost, method: payMethod, years: years || 1,
      ...registrant,
      ...(payMethod !== 'mercadopago' ? { phone: payPhone } : {}),
      ...(transactionId ? { transaction_id: transactionId } : {})
    };
    const res = await fetch(`${API}/api/registrar/pay`, { method: 'POST', headers: hdrs(), body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok && data.success) {
      setPayResult(data);
      if (data.payment_url) window.open(data.payment_url, '_blank');
      if (data.payment_id) {
        const interval = setInterval(async () => {
          try {
            const sRes = await fetch(`${API}/api/registrar/pay/${data.payment_id}/status`, { headers: hdrs() });
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData.payment?.status === 'completed') {
                clearInterval(interval); setPayPollingId(null);
                showToast(`🎉 Domínio ${action === 'buy' ? 'registrado' : 'renovado'}!`);
                closeBuyModal(); closeRenewModal(); loadData(); resetRegistrant();
              } else if (sData.payment?.status === 'failed') {
                clearInterval(interval); setPayPollingId(null);
                showToast('Pagamento falhou.', 'error');
              }
            }
          } catch {}
        }, 5000);
        setPayPollingId(interval);
        setTimeout(() => { clearInterval(interval); setPayPollingId(null); }, 600000);
      }
    } else {
      showToast(data.error || 'Erro ao processar pagamento', 'error');
    }
  } catch { showToast('Erro de conexão', 'error'); }
  finally { setPayProcessing(false); }
};

  const buyDomain = () => {
  if (!showBuyModal) return;


  submitDomainPaymentWithRegistrant(
    'buy', 
    showBuyModal.domain, 
    showBuyModal.price, 
    1, 
    registrantForm
  );
};



  const renewDomain = () => {
    if (!showRenewModal) return;
    // Renovation NÃO exige dados do registrante (já estão no banco),
    // então passamos um objeto vazio.
    submitDomainPaymentWithRegistrant(
      'renew',
      showRenewModal.domain,
      (showRenewModal.renewal_price || showRenewModal.price || 10),
      renewYears,
      {}
    );
  };

  // ===== DNS =====
  const loadDns = async (domain) => {
    setSelectedDnsDomain(domain); setLoadingDns(true); setDnsRecords([]);
    try {
      const res = await fetch(`${API}/api/registrar/dns/${domain}`, { headers: hdrs() });
      const data = await res.json();
      if (res.ok) setDnsRecords(data.records || []);
      else showToast(data.error || 'Erro ao carregar DNS', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setLoadingDns(false); }
  };

  const saveDnsRecord = async () => {
    setSavingDns(true);
    try {
      const body = { ...dnsForm, ttl: parseInt(dnsForm.ttl) || 600 };
      if (dnsForm.prio) body.prio = parseInt(dnsForm.prio); else delete body.prio;
      const url = editingDns
        ? `${API}/api/registrar/dns/${selectedDnsDomain}/${editingDns}`
        : `${API}/api/registrar/dns/${selectedDnsDomain}`;
      const method = editingDns ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setShowDnsForm(false); setEditingDns(null);
        setDnsForm({ name: '', type: 'A', content: '', ttl: 600, prio: '' });
        loadDns(selectedDnsDomain);
        showToast(editingDns ? 'Registro DNS atualizado' : 'Registro DNS criado');
      } else showToast(data.error || 'Erro ao salvar DNS', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setSavingDns(false); }
  };

  const deleteDnsRecord = async (id) => {
    try {
      const res = await fetch(`${API}/api/registrar/dns/${selectedDnsDomain}/${id}`, { method: 'DELETE', headers: hdrs() });
      if (res.ok) { loadDns(selectedDnsDomain); showToast('Registro DNS removido'); }
      else { const d = await res.json(); showToast(d.error || 'Erro ao deletar', 'error'); }
    } catch { showToast('Erro de conexão', 'error'); }
  };

  // ===== NAMESERVERS =====
  const loadNs = async (domain) => {
    setSelectedNsDomain(domain); setLoadingNs(true); setEditingNs(false);
    try {
      const res = await fetch(`${API}/api/registrar/ns/${domain}`, { headers: hdrs() });
      const data = await res.json();
      if (res.ok) {
        const ns = data.nameservers || [];
        setNameservers(ns);
        setNsForm([ns[0] || '', ns[1] || '', ns[2] || '', ns[3] || '']);
      } else showToast(data.error || 'Erro ao carregar NS', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setLoadingNs(false); }
  };

  const saveNs = async () => {
    const filtered = nsForm.filter(n => n.trim());
    if (!filtered.length) { showToast('Insira pelo menos 1 nameserver', 'warning'); return; }
    setSavingNs(true);
    try {
      const res = await fetch(`${API}/api/registrar/ns/${selectedNsDomain}`, {
        method: 'PUT', headers: hdrs(),
        body: JSON.stringify({ nameservers: filtered })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Nameservers atualizados!');
        setEditingNs(false); loadNs(selectedNsDomain);
      } else showToast(data.error || 'Erro ao salvar NS', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
    finally { setSavingNs(false); }
  };
  
  const resetRegistrant = () => setRegistrantForm({
  first_name: '', last_name: '', email_contact: '',
  phone_contact: '', address: '', city: '',
  state: 'Maputo', zip: '0000', country: 'MZ'
});

const closeTransferModal = () => {
  setShowTransferModal(false);
  setTransferForm({ domain: '', auth_code: '' });
  setTransferOut({ domain: '' });
  setTransferResult(null);
  setTransferOutResult(null);
  setTransferProcessing(false);
  resetPayState();
};

const submitTransferIn = async () => {
  if (!transferForm.domain || !transferForm.auth_code) {
    showToast('Preencha domínio e auth code', 'error'); return;
  }
  if (!registrantForm.first_name || !registrantForm.email_contact || !registrantForm.address || !registrantForm.city) {
    showToast('Preencha todos os dados do registrante', 'error'); return;
  }
  if ((payMethod === 'mpesa' || payMethod === 'emola') && (payPhone.length !== 9 || payPhoneError)) {
    showToast('Número de telefone inválido', 'error'); return;
  }
  setTransferProcessing(true);
  try {
    // 1) Busca preço real da Dynadot (substitui o cost=10 hardcoded)
    const checkRes = await fetch(`${API}/api/registrar/transfer/check`, {
      method: 'POST', headers: hdrs(), body: JSON.stringify({ domain: transferForm.domain })
    });
    const checkData = await checkRes.json();
    // Se nem transfer_price nem registration_price vieram do backend, abortar (não inventar preço).
    if (checkRes.status === 404 || (!checkData.transfer_price && !checkData.registration_price)) {
      showToast(checkData.error || `Não foi possível obter o preço de transferência para ${transferForm.domain}`, 'error');
      setTransferProcessing(false);
      return;
    }
    const realCost = checkData.transfer_price || checkData.registration_price;

    let transactionId = null;
    if (payMethod === 'mpesa' || payMethod === 'emola') {
      const endpoint = payMethod === 'mpesa' ? 'mpesa' : 'emola';
      const alaudaRes = await fetch(`${ALAUDA_API_URL}/api/payment/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `ApiKey ${process.env.NEXT_PUBLIC_ALAUDA_API_KEY || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: Math.ceil(realCost * exchangeRate).toString(),
          numero_celular: payPhone,
          usuario_id: (JSON.parse(localStorage.getItem('mozhost_user') || '{}').id || 'guest').toString()
        })
      });
      const ad = await alaudaRes.json();
      transactionId = ad?.data?.payment?.transaction_id || ad?.transaction_id;
    }
    const body = {
      ...transferForm, cost: realCost, method: payMethod, years: 1, ...registrantForm,
      ...(payMethod !== 'mercadopago' ? { phone: payPhone } : {}),
      ...(transactionId ? { transaction_id: transactionId } : {})
    };
    const res = await fetch(`${API}/api/registrar/transfer/in`, { method: 'POST', headers: hdrs(), body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok && data.success) {
      setTransferResult(data);
      if (data.payment_url) window.open(data.payment_url, '_blank');
      showToast('Transferência iniciada! Confirme o email WHOIS.', 'success');

      // 2) Inicia polling com backoff adaptativo:
      //    Fase 1: 15s × 8 = ~2 min (pega pagamentos instantâneos).
      //    Fase 2: 60s × 13 = +13 min (pega aprovações manuais WHOIS).
      //    Total: ~15 min com apenas ~21 requests ao invés de 60.
      stopTransferPolling();
      let attempt = 0;
      let intervalMs = 15000;
      const phase1Attempts = 8;
      const totalAttempts = 21;
      // Função nomeada permite recriar o setInterval com novo período (substituindo `arguments.callee`, proibido em strict mode).
      const pollTransferStatus = async () => {
        attempt++;
        try {
          const sRes = await fetch(`${API}/api/registrar/transfer/status/${transferForm.domain}`, { headers: hdrs() });
          if (sRes.ok) {
            const s = await sRes.json();
            if (s.status === 'completed') {
              stopTransferPolling();
              showToast(`🎉 Domínio ${transferForm.domain} transferido com sucesso!`, 'success');
              loadData();
              closeTransferModal();
              return;
            }
            if (s.status === 'failed') {
              stopTransferPolling();
              showToast(`❌ Transferência falhou: ${s.error_message || 'verifique o email WHOIS'}`, 'error');
              return;
            }
          }
        } catch { /* silent */ }
        if (attempt >= totalAttempts) {
          stopTransferPolling();
          showToast('⏱️ Polling encerrado. Verifique o status manualmente.', 'warning');
          return;
        }
        // Após fase 1, troca para 60s sem perder `attempt`.
        if (attempt === phase1Attempts) intervalMs = 60000;
        transferPollRef.current = setTimeout(pollTransferStatus, intervalMs);
      };
      transferPollRef.current = setTimeout(pollTransferStatus, intervalMs);
    } else {
      showToast(data.error || 'Erro ao iniciar transferência', 'error');
    }
  } catch (err) {
    console.error('Erro transfer in:', err);
    showToast('Erro de conexão', 'error');
  } finally {
    setTransferProcessing(false);
  }
};

const submitTransferOut = async () => {
  if (!transferOut.domain) { showToast('Informe o domínio', 'error'); return; }
  setTransferProcessing(true);
  try {
    const res = await fetch(`${API}/api/registrar/transfer/out/${transferOut.domain}`, { method: 'POST', headers: hdrs() });
    const data = await res.json();
    if (res.ok && data.success) {
      setTransferOutResult(data);
      showToast('Auth code gerado com sucesso!', 'success');
    } else {
      showToast(data.error || 'Erro ao gerar auth code', 'error');
    }
  } catch { showToast('Erro de conexão', 'error'); }
  finally { setTransferProcessing(false); }
};

  // ===== COMPUTED =====
  const allDomainNames = registeredDomains.map(d => d.domain || d).filter(Boolean);

  const filteredDomains = domainStatusFilter === 'all'
    ? domains
    : domains.filter(d => d.status === domainStatusFilter);

  const filteredDnsRecords = dnsFilter
    ? dnsRecords.filter(r =>
        r.type?.toLowerCase().includes(dnsFilter.toLowerCase()) ||
        r.name?.toLowerCase().includes(dnsFilter.toLowerCase()) ||
        r.content?.toLowerCase().includes(dnsFilter.toLowerCase())
      )
    : dnsRecords;

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">Carregando domínios...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'mydomains', label: 'Meus Domínios', icon: Globe, count: domains.length },
    { id: 'register', label: 'Registrar', icon: ShoppingCart },
    { id: 'dns', label: 'DNS', icon: Settings },
    { id: 'nameservers', label: 'Nameservers', icon: Server }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-5 sm:p-8 mb-4 sm:mb-6 text-white">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Globe className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">Gestão de Domínios</h1>
              <p className="text-blue-100 text-sm mt-0.5">Registre, configure DNS e gerencie nameservers</p>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{domains.length}</div>
                <div className="text-blue-200 text-xs">Conectados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{registeredDomains.length}</div>
                <div className="text-blue-200 text-xs">Registrados</div>
              </div>
              {/* Taxa de câmbio no header */}
              <div className="text-center border-l border-white/20 pl-6">
                <div className="text-sm font-bold">1 USD = {exchangeRate.toFixed(0)} MT</div>
                <div className="text-blue-200 text-xs">Taxa actual</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-4 sm:mb-6 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-900 text-sm font-medium">Erro de conexão</p>
              <p className="text-red-700 text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={loadData} className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
              Tentar novamente
            </button>
          </div>
        )}

        {/* ======== TAB: MEUS DOMÍNIOS ======== */}
        {activeTab === 'mydomains' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={domainStatusFilter}
                  onChange={e => setDomainStatusFilter(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="pending">Pendentes</option>
                  <option value="failed">Falharam</option>
                </select>
                <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg" title="Atualizar">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
                
                <button onClick={() => setShowTransferModal(true)}
  className="hidden sm:flex items-center gap-1 text-xs text-white/80 hover:text-white border border-white/30 rounded-lg px-3 py-1.5">
  <ArrowRight className="w-3.5 h-3.5" /> Transferir
</button>
              </div>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" /> Conectar Domínio
              </button>
            </div>

            {filteredDomains.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-gray-300" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {domainStatusFilter === 'all' ? 'Nenhum domínio conectado' : 'Nenhum domínio com este status'}
                </h2>
                <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">
                  Conecte um domínio próprio ao seu container ou registre um novo na aba "Registrar"
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    <Link2 className="w-4 h-4" /> Conectar Existente
                  </button>
                  <button onClick={() => setActiveTab('register')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                    <ShoppingCart className="w-4 h-4" /> Registrar Novo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDomains.map(d => {
                  const sc = stCfg(d.status);
                  const SI = sc.icon;
                  const cont = containers.find(c => c.id === d.container_id);
                  return (
                    <div key={d.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-lg font-bold text-gray-900 truncate">{d.domain}</h3>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                                {sc.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Server className="w-3.5 h-3.5" />
                                {cont?.name || 'Container removido'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(d.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {d.status === 'active' && (
                              <a href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer"
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Visitar">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button onClick={() => verifyDomain(d.id)} disabled={verifying[d.id]}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50" title="Verificar DNS">
                              {verifying[d.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                            <button onClick={() => removeDomain(d.id, d.domain)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remover">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {d.status === 'pending' && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                            <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2 text-sm">
                              <AlertCircle className="w-4 h-4" /> Configure seu DNS para ativar o domínio
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { label: 'Tipo', value: 'A' },
                                { label: 'Nome', value: '@' },
                                { label: 'Valor', value: d.server_ip || '208.110.72.191', copyable: true },
                                { label: 'TTL', value: '300' }
                              ].map((item, i) => (
                                <div key={i} className={`bg-white rounded-lg p-2.5 ${item.copyable ? 'col-span-2 sm:col-span-1' : ''}`}>
                                  <span className="text-gray-400 text-xs block mb-0.5">{item.label}</span>
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-xs sm:text-sm">{item.value}</span>
                                    {item.copyable && (
                                      <button onClick={() => { cpy(item.value); showToast('IP copiado!'); }}
                                        className="p-1 hover:bg-gray-100 rounded">
                                        <Copy className="w-3 h-3 text-gray-400" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-yellow-700 mt-2">
                              Após configurar, clique em <RefreshCw className="w-3 h-3 inline" /> para verificar a propagação DNS (pode levar até 48h).
                            </p>
                          </div>
                        )}

                        {d.status === 'active' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-800 font-medium">SSL ativo • HTTPS habilitado</span>
                            </div>
                            <a href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-green-700 hover:underline flex items-center gap-1 font-medium">
                              Visitar <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {d.status === 'failed' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
                            <p className="text-sm text-red-700 flex items-center gap-2">
                              <XCircle className="w-4 h-4" /> Falha na verificação DNS
                            </p>
                            <button onClick={() => verifyDomain(d.id)}
                              className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">
                              Reverificar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======== TAB: REGISTRAR / COMPRAR ======== */}
        {activeTab === 'register' && (
          <div className="space-y-6">
            {/* Search Box */}
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Encontre o domínio perfeito</h3>
                <p className="text-sm text-gray-500">Pesquise a disponibilidade e registre em segundos</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchDomain}
                    onChange={e => setSearchDomain(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && checkDomain()}
                    placeholder="meusite.com ou apenas meusite"
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <button onClick={checkDomain} disabled={searching || !searchDomain.trim()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Pesquisar
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                💡 Digite sem extensão para pesquisar múltiplas extensões automaticamente (.com, .net, .io, etc.)
              </p>
            </div>

            {/* Search Results */}
            {searching && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Pesquisando disponibilidade...</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">
                    {searchResults.filter(r => r.available).length} disponíveis de {searchResults.length} pesquisados
                  </h3>
                  <button onClick={() => setSearchResults([])} className="text-xs text-gray-500 hover:text-gray-700">
                    Limpar resultados
                  </button>
                </div>
                <div className="divide-y">
                  {searchResults.map((result, i) => (
                    <div key={i} className={`px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      result.available ? 'hover:bg-green-50/50' : 'opacity-60'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {result.available ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{result.domain}</div>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {result.first_year_promo && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                <Tag className="w-3 h-3" /> Promo 1º ano
                              </span>
                            )}
                            {result.premium && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Premium</span>
                            )}
                            {result.renewal_price && (
                              <span className="text-xs text-gray-400">
                                {/* ← RENOVAÇÃO EM MZN */}
                                Renovação: {formatMZN(result.renewal_price, exchangeRate)}/ano
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {result.available ? (
                          <>
                            {/* ← PREÇO EM MZN */}
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900">
                                {formatMZN(result.price, exchangeRate)}
                              </div>
                              <div className="text-xs text-gray-400">~${result.price} USD</div>
                              {result.regular_price && result.regular_price !== result.price && (
                                <div className="text-xs text-gray-400 line-through">
                                  {formatMZN(result.regular_price, exchangeRate)}
                                </div>
                              )}
                            </div>
                            <button onClick={() => setShowBuyModal(result)}
                              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2 shadow-sm whitespace-nowrap">
                              <ShoppingCart className="w-4 h-4" /> Comprar
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-red-500 font-medium">Indisponível</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered Domains */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Domínios Registrados</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Domínios na sua conta Porkbun</p>
                </div>
                <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {registeredDomains.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm mb-1">Nenhum domínio registrado</p>
                  <p className="text-gray-400 text-xs">Use a pesquisa acima para registrar seu primeiro domínio</p>
                </div>
              ) : (
                <div className="divide-y">
                  {registeredDomains.map((d, i) => {
                    const domain = d.domain || d;
                    const expiry = d.expireDate || d.expire_date;
                    const eb = expiryBadge(expiry);
                    const isExpanded = expandedDomain === domain;
                    const isConnected = domains.some(cd => cd.domain === domain);

                    return (
                      <div key={i} className="hover:bg-gray-50/50">
                        <div className="px-5 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 truncate">{domain}</span>
                                {isConnected && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Link2 className="w-3 h-3" /> Conectado
                                  </span>
                                )}
                                {eb && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${eb.cls}`}>
                                    {eb.text}
                                  </span>
                                )}
                              </div>
                              {expiry && (
                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Expira: {new Date(expiry).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => { setShowRenewModal({ domain }); setRenewYears(1); }}
                                className="text-xs px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-medium flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" /> Renovar
                              </button>
                              <button onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                              <button onClick={() => { setActiveTab('dns'); loadDns(domain); }}
                                className="text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium flex items-center gap-1.5">
                                <Settings className="w-3.5 h-3.5" /> Gerenciar DNS
                              </button>
                              <button onClick={() => { setActiveTab('nameservers'); loadNs(domain); }}
                                className="text-xs px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1.5">
                                <Server className="w-3.5 h-3.5" /> Nameservers
                              </button>
                              {!isConnected && (
                                <button onClick={() => { setShowAddModal(true); setNewDomain(domain); }}
                                  className="text-xs px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium flex items-center gap-1.5">
                                  <Link2 className="w-3.5 h-3.5" /> Conectar a Container
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======== TAB: DNS ======== */}
        {activeTab === 'dns' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" /> Gestão de Registros DNS
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <select value={selectedDnsDomain}
                  onChange={e => { setSelectedDnsDomain(e.target.value); setDnsFilter(''); if (e.target.value) loadDns(e.target.value); }}
                  className="flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Selecione um domínio</option>
                  {allDomainNames.map((d, i) => <option key={i} value={d}>{d}</option>)}
                </select>
                {selectedDnsDomain && (
                  <button onClick={() => { setShowDnsForm(true); setEditingDns(null); setDnsForm({ name: '', type: 'A', content: '', ttl: 600, prio: '' }); }}
                    className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2 shadow-sm">
                    <Plus className="w-4 h-4" /> Novo Registro
                  </button>
                )}
              </div>
            </div>

            {selectedDnsDomain && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">Registros de {selectedDnsDomain}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{dnsRecords.length} registro(s) encontrado(s)</p>
                  </div>
                  {dnsRecords.length > 3 && (
                    <div className="relative w-full sm:w-auto">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={dnsFilter}
                        onChange={e => setDnsFilter(e.target.value)}
                        placeholder="Filtrar registros..."
                        className="w-full sm:w-48 pl-9 pr-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {loadingDns ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredDnsRecords.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{dnsFilter ? 'Nenhum registro encontrado com este filtro' : 'Nenhum registro DNS'}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredDnsRecords.map((r, i) => (
                      <div key={r.id || i} className="px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-gray-50">
                        <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm w-full">
                          <div>
                            <span className="text-gray-400 text-xs">Tipo</span>
                            <div className="font-mono font-bold">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                                r.type === 'A' ? 'bg-blue-100 text-blue-700' :
                                r.type === 'CNAME' ? 'bg-purple-100 text-purple-700' :
                                r.type === 'MX' ? 'bg-orange-100 text-orange-700' :
                                r.type === 'TXT' ? 'bg-gray-100 text-gray-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>{r.type}</span>
                            </div>
                          </div>
                          <div className="truncate">
                            <span className="text-gray-400 text-xs">Nome</span>
                            <div className="font-mono truncate text-sm">{r.name || '@'}</div>
                          </div>
                          <div className="col-span-2 sm:col-span-1 truncate">
                            <span className="text-gray-400 text-xs">Conteúdo</span>
                            <div className="font-mono truncate text-xs flex items-center gap-1">
                              <span className="truncate">{r.content}</span>
                              <button onClick={() => { cpy(r.content); showToast('Copiado!'); }}
                                className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0">
                                <Copy className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">TTL</span>
                            <div className="text-sm">{r.ttl}s</div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => {
                            setDnsForm({ name: r.name || '', type: r.type, content: r.content, ttl: r.ttl || 600, prio: r.prio || '' });
                            setEditingDns(r.id); setShowDnsForm(true);
                          }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteDnsRecord(r.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Deletar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDnsDomain && !loadingDns && (
                  <div className="px-5 py-3 bg-gray-50 border-t">
                    <p className="text-xs text-gray-500 mb-2">Adicionar rapidamente:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'A Record', type: 'A', content: '', name: '' },
                        { label: 'CNAME www', type: 'CNAME', content: selectedDnsDomain, name: 'www' },
                        { label: 'MX Email', type: 'MX', content: '', name: '' },
                        { label: 'TXT SPF', type: 'TXT', content: 'v=spf1 include:_spf.google.com ~all', name: '' }
                      ].map((tpl, i) => (
                        <button key={i} onClick={() => {
                          setDnsForm({ name: tpl.name, type: tpl.type, content: tpl.content, ttl: 600, prio: tpl.type === 'MX' ? '10' : '' });
                          setEditingDns(null); setShowDnsForm(true);
                        }}
                          className="text-xs px-2.5 py-1.5 bg-white border rounded-lg hover:bg-gray-50 text-gray-600 font-medium">
                          + {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showDnsForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{editingDns ? 'Editar' : 'Novo'} Registro DNS</h3>
                    <button onClick={() => setShowDnsForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select value={dnsForm.type} onChange={e => setDnsForm({ ...dnsForm, type: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome (subdomínio)</label>
                      <input type="text" value={dnsForm.name} onChange={e => setDnsForm({ ...dnsForm, name: e.target.value })}
                        placeholder="@ ou www ou sub"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-400 mt-1">Deixe vazio para o domínio raiz (@)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                      <input type="text" value={dnsForm.content} onChange={e => setDnsForm({ ...dnsForm, content: e.target.value })}
                        placeholder={
                          dnsForm.type === 'A' ? '192.168.1.1' :
                          dnsForm.type === 'CNAME' ? 'target.example.com' :
                          dnsForm.type === 'MX' ? 'mail.example.com' :
                          dnsForm.type === 'TXT' ? 'v=spf1 ...' : 'valor'
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">TTL (segundos)</label>
                        <input type="number" value={dnsForm.ttl} onChange={e => setDnsForm({ ...dnsForm, ttl: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                        <input type="number" value={dnsForm.prio} onChange={e => setDnsForm({ ...dnsForm, prio: e.target.value })}
                          placeholder={dnsForm.type === 'MX' ? '10' : 'Opcional'}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowDnsForm(false)} className="flex-1 px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                      Cancelar
                    </button>
                    <button onClick={saveDnsRecord} disabled={savingDns || !dnsForm.content}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
                      {savingDns ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {editingDns ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== TAB: NAMESERVERS ======== */}
        {activeTab === 'nameservers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-600" /> Gestão de Nameservers
              </h3>
              <select value={selectedNsDomain}
                onChange={e => { setSelectedNsDomain(e.target.value); if (e.target.value) loadNs(e.target.value); }}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">Selecione um domínio</option>
                {allDomainNames.map((d, i) => <option key={i} value={d}>{d}</option>)}
              </select>
            </div>

            {selectedNsDomain && (
              <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                {loadingNs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 truncate">Nameservers de {selectedNsDomain}</h4>
                      {!editingNs ? (
                        <button onClick={() => setEditingNs(true)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Editar
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingNs(false); setNsForm([nameservers[0] || '', nameservers[1] || '', nameservers[2] || '', nameservers[3] || '']); }}
                            className="px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
                            Cancelar
                          </button>
                          <button onClick={saveNs} disabled={savingNs}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-1">
                            {savingNs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-8 flex-shrink-0 font-medium">NS{i + 1}</span>
                          {editingNs ? (
                            <input type="text" value={nsForm[i]}
                              onChange={e => { const n = [...nsForm]; n[i] = e.target.value; setNsForm(n); }}
                              placeholder={`ns${i + 1}.example.com`}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500" />
                          ) : (
                            <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono flex items-center justify-between">
                              <span className={nameservers[i] ? 'text-gray-900' : 'text-gray-400'}>
                                {nameservers[i] || '—'}
                              </span>
                              {nameservers[i] && (
                                <button onClick={() => { cpy(nameservers[i]); showToast('Copiado!'); }}
                                  className="p-1 hover:bg-gray-200 rounded">
                                  <Copy className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700 flex items-start gap-2">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Alterações de nameservers podem levar até <strong>48 horas</strong> para propagar globalmente. Configure os registros DNS no novo provedor antes de alterar os nameservers.</span>
                      </p>
                    </div>

                    {editingNs && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-gray-500 mb-2">Presets comuns:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'Porkbun', ns: ['curitiba.ns.porkbun.com', 'fortaleza.ns.porkbun.com', 'maceio.ns.porkbun.com', 'salvador.ns.porkbun.com'] },
                            { label: 'Cloudflare', ns: ['ns1.cloudflare.com', 'ns2.cloudflare.com', '', ''] },
                          ].map((preset, i) => (
                            <button key={i} onClick={() => setNsForm(preset.ns)}
                              className="text-xs px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 text-gray-600 font-medium">
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======== MODALS ======== */}

        {/* Modal: Conectar Domínio */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Conectar Domínio</h2>
                <button onClick={() => { setShowAddModal(false); setNewDomain(''); setSelectedContainer(''); }}
                  className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={addDomain} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Container</label>
                  <select value={selectedContainer} onChange={e => setSelectedContainer(e.target.value)} required
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Selecione um container</option>
                    {containers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domínio</label>
                  <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
                    placeholder="meusite.com" required
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Você precisa ser dono do domínio e configurar um registro DNS tipo A apontando para o IP do servidor.</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowAddModal(false); setNewDomain(''); setSelectedContainer(''); }}
                    className="flex-1 px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Link2 className="w-4 h-4" /> Conectar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Comprar Domínio */}
        {showBuyModal && !payResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {payStep === 1 ? 'Registrar Domínio' : 'Pagamento'}
                </h3>
                <button onClick={closeBuyModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>

              {/* ← PREÇO EM MZN NO MODAL */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-green-900 text-lg">{showBuyModal.domain}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {showBuyModal.first_year_promo && (
                        <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-medium">Promo</span>
                      )}
                      {showBuyModal.renewal_price && (
                        <span className="text-xs text-gray-500">
                          Renovação: {formatMZN(showBuyModal.renewal_price, exchangeRate)}/ano
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMZN(showBuyModal.price, exchangeRate)}
                    </p>
                    <p className="text-xs text-gray-400">~${showBuyModal.price} USD · por ano</p>
                  </div>
                </div>
              </div>
              
              {payStep === 1 && (
  <>
    <p className="text-xs text-gray-500 mb-3">Dados do Registrante (WHOIS)</p>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
        <input value={registrantForm.first_name} onChange={e => setRegistrantForm(p=>({...p,first_name:e.target.value}))}
          placeholder="João" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Apelido *</label>
        <input value={registrantForm.last_name} onChange={e => setRegistrantForm(p=>({...p,last_name:e.target.value}))}
          placeholder="Silva" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
    <div className="mt-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">Email de contacto *</label>
      <input type="email" value={registrantForm.email_contact} onChange={e => setRegistrantForm(p=>({...p,email_contact:e.target.value}))}
        placeholder="joao@email.com" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
    </div>
    <div className="mt-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">Telefone de contacto *</label>
      <input value={registrantForm.phone_contact} onChange={e => setRegistrantForm(p=>({...p,phone_contact:e.target.value}))}
        placeholder="841234567" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
    </div>
    <div className="mt-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">Morada *</label>
      <input value={registrantForm.address} onChange={e => setRegistrantForm(p=>({...p,address:e.target.value}))}
        placeholder="Av. Eduardo Mondlane, 123" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
    </div>
    <div className="grid grid-cols-2 gap-3 mt-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Cidade *</label>
        <input value={registrantForm.city} onChange={e => setRegistrantForm(p=>({...p,city:e.target.value}))}
          placeholder="Maputo" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">País</label>
        <input value={registrantForm.country} onChange={e => setRegistrantForm(p=>({...p,country:e.target.value}))}
          placeholder="MZ" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
    <div className="flex gap-3 mt-5">
      <button onClick={closeBuyModal} className="flex-1 px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancelar</button>
      <button
        onClick={() => setPayStep(2)}
        disabled={!registrantForm.first_name || !registrantForm.last_name || !registrantForm.email_contact || !registrantForm.address || !registrantForm.city}
        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
        <ArrowRight className="w-4 h-4" /> Continuar
      </button>
    </div>
  </>
)}

{payStep === 2 && (
  <>
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Conectar a um container (opcional)</label>
      <select value={buyLinkContainer} onChange={e => setBuyLinkContainer(e.target.value)}
        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
        <option value="">Não conectar agora</option>
        {containers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
      </select>
    </div>
    <div className="flex gap-3">
      <button onClick={() => setPayStep(1)} className="flex-1 px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Voltar</button>
      <button onClick={() => setPayStep(3)}
        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
        <ArrowRight className="w-4 h-4" /> Ir para Pagamento
      </button>
    </div>
  </>
)}

{payStep === 3 && (
  <div className="space-y-4">
    <div className="bg-gray-50 p-3 rounded-lg border">
      <p className="text-xs font-bold text-gray-500 uppercase">Resumo da Compra</p>
      <div className="flex justify-between mt-2">
        <span className="text-sm font-medium">{showBuyModal.domain}</span>
        <span className="text-sm font-bold text-blue-600">{showBuyModal.price} MT</span>
      </div>
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">Método de Pagamento</label>
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => setPayMethod('mpesa')}
          className={`p-2 border rounded-lg text-sm ${payMethod === 'mpesa' ? 'border-green-500 bg-green-50' : ''}`}
        >
          M-Pesa
        </button>
        <button 
          onClick={() => setPayMethod('emola')}
          className={`p-2 border rounded-lg text-sm ${payMethod === 'emola' ? 'border-blue-500 bg-blue-50' : ''}`}
        >
          e-Mola
        </button>
      </div>
    </div>

    {(payMethod === 'mpesa' || payMethod === 'emola') && (
      <input 
        type="tel" 
        placeholder="84/86/87..." 
        value={payPhone} 
        onChange={e => setPayPhone(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
    )}

    <div className="flex gap-3 pt-2">
      <button onClick={() => setPayStep(2)} className="flex-1 py-2 text-sm border rounded-lg">Voltar</button>
      <button 
        onClick={buyDomain} // <--- Agora este botão chama a função com todos os dados
        disabled={payProcessing || (payMethod !== 'mercadopago' && payPhone.length !== 9)}
        className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm"
      >
        {payProcessing ? 'Processando...' : 'Finalizar e Pagar'}
      </button>
    </div>
  </div>
)}

             
            </div>
          </div>
        )}

        {/* Modal: Renovar Domínio */}
        {showRenewModal && !payResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {payStep === 1 ? 'Renovar Domínio' : 'Pagamento'}
                </h3>
                <button onClick={closeRenewModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>

              {/* ← PREÇO EM MZN NO MODAL DE RENOVAÇÃO */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 text-lg">{showRenewModal.domain}</p>
                  {showRenewModal.renewal_price && (
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatMZN((showRenewModal.renewal_price || showRenewModal.price || 10) * renewYears, exchangeRate)}
                      </p>
                      <p className="text-xs text-gray-400">
                        ~${((showRenewModal.renewal_price || showRenewModal.price || 10) * renewYears).toFixed(2)} USD
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {payStep === 1 && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duração da renovação</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 5].map(y => (
                        <button key={y} onClick={() => setRenewYears(y)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            renewYears === y ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}>
                          {y} ano{y > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                    {/* ← preço total da renovação em MZN conforme anos selecionados */}
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Total: <span className="font-semibold text-gray-700">
                        {formatMZN((showRenewModal.renewal_price || showRenewModal.price || 10) * renewYears, exchangeRate)}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={closeRenewModal}
                      className="flex-1 px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancelar</button>
                    <button onClick={() => setPayStep(2)}
                      className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium flex items-center justify-center gap-2">
                      <ArrowRight className="w-4 h-4" /> Ir para Pagamento
                    </button>
                  </div>
                </>
              )}

              {payStep === 2 && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'mpesa', name: 'M-Pesa', desc: '84/85', active: 'border-green-500 bg-green-50', icon: '🟢' },
                        { id: 'emola', name: 'e-Mola', desc: '86/87', active: 'border-blue-500 bg-blue-50', icon: '🔵' },
                        { id: 'mercadopago', name: 'MercadoPago', desc: 'Cartão/PIX', active: 'border-cyan-500 bg-cyan-50', icon: '💳' }
                      ].map(m => (
                        <button key={m.id} onClick={() => { setPayMethod(m.id); setPayPhoneError(''); }}
                          className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all text-center ${
                            payMethod === m.id ? m.active : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <span className="text-lg mb-0.5">{m.icon}</span>
                          <span className="text-xs font-semibold">{m.name}</span>
                          <span className="text-[10px] text-gray-400">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(payMethod === 'mpesa' || payMethod === 'emola') && (
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Número de Telefone</label>
                      <input
                        type="tel"
                        placeholder={payMethod === 'mpesa' ? '841234567' : '861234567'}
                        value={payPhone}
                        onChange={e => handlePayPhoneChange(e.target.value)}
                        maxLength={9}
                        className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-lg tracking-wider focus:outline-none focus:ring-2 ${
                          payPhoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : payPhone.length === 9 && !payPhoneError ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                      />
                      {payPhoneError && (
                        <p className="text-xs text-red-600 mt-1 flex items-start gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{payPhoneError}</p>
                      )}
                      {!payPhoneError && payPhone.length === 9 && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Número válido</p>
                      )}
                    </div>
                  )}

                  {payMethod === 'mercadopago' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-blue-700 flex items-start gap-2">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Será redirecionado para o MercadoPago para pagar com cartão ou PIX.</span>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setPayStep(1)}
                      className="px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Voltar</button>
                    <button onClick={renewDomain}
                      disabled={payProcessing || ((payMethod === 'mpesa' || payMethod === 'emola') && (payPhone.length !== 9 || !!payPhoneError))}
                      className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
                      {payProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Pagar e Renovar ({renewYears} ano{renewYears > 1 ? 's' : ''})
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal: Resultado do Pagamento */}
        {payResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-5">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                  {payPollingId ? (
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {payPollingId ? 'Aguardando Confirmação' : 'Pagamento Iniciado'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {payPollingId ? 'Confirme o pagamento no seu celular' : 'Siga as instruções abaixo'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Domínio</span>
                  <span className="font-bold text-gray-900">{payResult.domain}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ação</span>
                  <span className="font-medium text-gray-900">{payResult.action === 'buy' ? 'Registro' : 'Renovação'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Preço (USD)</span>
                  <span className="font-medium text-gray-900">${payResult.price_usd}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor cobrado</span>
                  <span className="font-bold text-gray-900">
                    {payResult.currency === 'BRL' ? 'R$' : 'MT'} {parseFloat(payResult.amount).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Referência</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-gray-900">{payResult.reference_code}</span>
                    <button onClick={() => { cpy(payResult.reference_code); showToast('Copiado!'); }}
                      className="p-0.5 hover:bg-gray-200 rounded"><Copy className="w-3 h-3 text-gray-400" /></button>
                  </div>
                </div>
              </div>

              {payResult.payment_details?.instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Instruções:</p>
                  <ol className="space-y-1.5">
                    {payResult.payment_details.instructions.map((inst, i) => (
                      <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">{i + 1}</span>
                        {inst}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {payResult.payment_url && (
                <a href={payResult.payment_url} target="_blank" rel="noopener noreferrer"
                  className="w-full mb-4 inline-flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 text-sm font-medium">
                  <ExternalLink className="w-4 h-4" /> Abrir MercadoPago
                </a>
              )}

              {payPollingId && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando pagamento automaticamente...</span>
                </div>
              )}

              <button onClick={() => { closeBuyModal(); closeRenewModal(); }}
                className="w-full px-4 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Modal: Confirmar remoção */}
        {renewingDomain?.action === 'remove' && (
          <ConfirmModal
            title="Remover Domínio"
            message={`Tem certeza que deseja remover ${renewingDomain.name}? O domínio será desconectado do container.`}
            confirmText="Remover"
            danger
            onConfirm={confirmRemoveDomain}
            onCancel={() => setRenewingDomain(null)}
          />
        )}

      </div>
      
      {showTransferModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Transferência de Domínio</h3>
        <button onClick={closeTransferModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
      </div>

      {/* Tabs IN / OUT */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        <button onClick={() => setTransferTab('in')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${transferTab === 'in' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
          Receber (Entrada)
        </button>
        <button onClick={() => setTransferTab('out')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${transferTab === 'out' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
          Enviar (Saída)
        </button>
      </div>

      {/* ── ENTRADA ── */}
      {transferTab === 'in' && !transferResult && (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800 space-y-1">
            <p className="font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Pré-requisitos</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Domínio não transferido nos últimos 60 dias</li>
              <li>Domínio desbloqueado no registrar atual</li>
              <li>Auth Code (EPP) válido</li>
              <li>Acesso ao email WHOIS para confirmar</li>
            </ul>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Domínio *</label>
              <input value={transferForm.domain} onChange={e => setTransferForm(p=>({...p,domain:e.target.value}))}
                placeholder="exemplo.com" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Auth Code / EPP *</label>
              <input value={transferForm.auth_code} onChange={e => setTransferForm(p=>({...p,auth_code:e.target.value}))}
                placeholder="Código do registrar atual" className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-700 mb-2">Dados do Registrante</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome *</label>
              <input value={registrantForm.first_name} onChange={e => setRegistrantForm(p=>({...p,first_name:e.target.value}))}
                placeholder="João" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Apelido *</label>
              <input value={registrantForm.last_name} onChange={e => setRegistrantForm(p=>({...p,last_name:e.target.value}))}
                placeholder="Silva" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email *</label>
              <input type="email" value={registrantForm.email_contact} onChange={e => setRegistrantForm(p=>({...p,email_contact:e.target.value}))}
                placeholder="joao@email.com" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone *</label>
              <input value={registrantForm.phone_contact} onChange={e => setRegistrantForm(p=>({...p,phone_contact:e.target.value}))}
                placeholder="841234567" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Morada *</label>
              <input value={registrantForm.address} onChange={e => setRegistrantForm(p=>({...p,address:e.target.value}))}
                placeholder="Av. Eduardo Mondlane, 123" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cidade *</label>
                <input value={registrantForm.city} onChange={e => setRegistrantForm(p=>({...p,city:e.target.value}))}
                  placeholder="Maputo" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">País</label>
                <input value={registrantForm.country} onChange={e => setRegistrantForm(p=>({...p,country:e.target.value}))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-700 mb-2">Pagamento</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { id: 'mpesa', name: 'M-Pesa', desc: '84/85', active: 'border-green-500 bg-green-50', icon: '🟢' },
              { id: 'emola', name: 'e-Mola', desc: '86/87', active: 'border-blue-500 bg-blue-50', icon: '🔵' },
              { id: 'mercadopago', name: 'MercadoPago', desc: 'Cartão/PIX', active: 'border-cyan-500 bg-cyan-50', icon: '💳' }
            ].map(m => (
              <button key={m.id} onClick={() => { setPayMethod(m.id); setPayPhoneError(''); }}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl border-2 transition-all text-center ${payMethod === m.id ? m.active : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="text-base mb-0.5">{m.icon}</span>
                <span className="text-xs font-semibold">{m.name}</span>
                <span className="text-[10px] text-gray-400">{m.desc}</span>
              </button>
            ))}
          </div>
          {(payMethod === 'mpesa' || payMethod === 'emola') && (
            <div className="mb-4">
              <input type="tel" placeholder={payMethod === 'mpesa' ? '841234567' : '861234567'}
                value={payPhone} onChange={e => handlePayPhoneChange(e.target.value)} maxLength={9}
                className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-lg focus:outline-none ${
                  payPhoneError ? 'border-red-300' : payPhone.length === 9 && !payPhoneError ? 'border-green-300' : 'border-gray-300'
                }`} />
              {payPhoneError && <p className="text-xs text-red-600 mt-1">{payPhoneError}</p>}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button onClick={closeTransferModal} className="flex-1 px-4 py-2.5 border rounded-lg text-gray-700 text-sm">Cancelar</button>
            <button onClick={submitTransferIn} disabled={transferProcessing ||
              !transferForm.domain || !transferForm.auth_code ||
              !registrantForm.first_name || !registrantForm.email_contact || !registrantForm.city ||
              ((payMethod === 'mpesa' || payMethod === 'emola') && (payPhone.length !== 9 || !!payPhoneError))}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
              {transferProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Iniciar Transferência
            </button>
          </div>
        </>
      )}

      {/* Resultado transferência entrada */}
      {transferTab === 'in' && transferResult && (
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 mb-1">Transferência Iniciada!</h4>
          <p className="text-sm text-gray-500 mb-4">Verifique o email WHOIS para confirmar.</p>
          <div className="bg-gray-50 rounded-lg p-3 text-left text-sm space-y-1 mb-4">
            <div className="flex justify-between"><span className="text-gray-500">Domínio</span><span className="font-bold">{transferResult.domain}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Referência</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs">{transferResult.reference_code}</span>
                <button onClick={() => { cpy(transferResult.reference_code); showToast('Copiado!'); }}><Copy className="w-3 h-3 text-gray-400" /></button>
              </div>
            </div>
          </div>
          <button onClick={closeTransferModal} className="w-full px-4 py-2.5 border rounded-lg text-gray-700 text-sm">Fechar</button>
        </div>
      )}

      {/* ── SAÍDA ── */}
      {transferTab === 'out' && !transferOutResult && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
            <p className="font-semibold mb-1 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Como funciona</p>
            <p>Iremos desbloquear o domínio e gerar o Auth Code (EPP) para transferir para outro registrar. Este processo é gratuito.</p>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Domínio a transferir *</label>
            <select value={transferOut.domain} onChange={e => setTransferOut({ domain: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione um domínio</option>
              {allDomainNames.map((d, i) => <option key={i} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-xs text-red-700">
            <p className="font-semibold mb-1">⚠️ Atenção</p>
            <p>Após iniciar a transferência você tem 5 dias para concluir no novo registrar. O domínio será desbloqueado automaticamente.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={closeTransferModal} className="flex-1 px-4 py-2.5 border rounded-lg text-gray-700 text-sm">Cancelar</button>
            <button onClick={submitTransferOut} disabled={transferProcessing || !transferOut.domain}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
              {transferProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Gerar Auth Code
            </button>
          </div>
        </>
      )}

      {/* Resultado saída */}
      {transferTab === 'out' && transferOutResult && (
        <div>
          <div className="text-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <h4 className="font-bold text-gray-900">Auth Code Gerado!</h4>
            <p className="text-sm text-gray-500">Use este código no novo registrar para concluir a transferência.</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-400 mb-1">Auth Code / EPP</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-green-400 font-mono text-sm break-all">{transferOutResult.auth_code}</code>
              <button onClick={() => { cpy(transferOutResult.auth_code); showToast('Auth code copiado!'); }}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex-shrink-0">
                <Copy className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-4">
            {transferOutResult.warning || 'Após iniciar no novo registrar, confirme por email. Prazo: 5 dias.'}
          </div>
          <button onClick={closeTransferModal} className="w-full px-4 py-2.5 border rounded-lg text-gray-700 text-sm">Fechar</button>
        </div>
      )}
    </div>
  </div>
)}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}