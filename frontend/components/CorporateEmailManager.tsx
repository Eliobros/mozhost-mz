'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Mail, Plus, Loader2, CheckCircle2, RefreshCw, Copy, Trash2,
  ExternalLink, Info, AlertCircle, X, Inbox, Server,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop';
const WEBMAIL_URL = 'https://mail.eliobrostech.site';
const MAIL_SERVER = 'mail.eliobrostech.site';
const SPF_VALUE = 'v=spf1 ip4:13.121.82.195 ~all';
const NAMESERVERS = ['ns1.mozhost.shop', 'ns2.mozhost.shop'];

type Alert = { type: 'success' | 'warning' | 'error'; message: string } | null;
type DomainStatus = { domain: string; exists: boolean; verified: boolean; token: string | null };
type MailAccount = { id: number; email: string; quota_gb?: number | string | null };

interface CorporateEmailManagerProps {
  domains?: string[];
}

const hdrs = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mozhost_token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const normalizeDomain = (value: string) =>
  value.trim().toLowerCase().replace(/^@+/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');

const isValidDomain = (value: string) => /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/.test(value);

export default function CorporateEmailManager({ domains = [] }: CorporateEmailManagerProps) {
  const [domainInput, setDomainInput] = useState('');
  const [alert, setAlert] = useState<Alert>(null);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const statusRequestRef = useRef(0);

  const [activating, setActivating] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const domain = normalizeDomain(domainInput);
  const domainValid = isValidDomain(domain);
  const status = domainStatus && domainStatus.domain === domain ? domainStatus : null;
  const stage: 'idle' | 'checking' | 'inactive' | 'pending' | 'active' =
    !domainValid
      ? 'idle'
      : status
        ? status.verified
          ? 'active'
          : status.exists
            ? 'pending'
            : 'inactive'
        : checkingStatus
          ? 'checking'
          : 'idle';

  const fetchStatus = useCallback(async (target: string) => {
    const requestId = ++statusRequestRef.current;
    setCheckingStatus(true);
    try {
      const res = await fetch(`${API}/api/emails/corporate/domain/status/${encodeURIComponent(target)}`, {
        headers: hdrs(),
      });
      const data = await res.json().catch(() => ({}));
      if (requestId !== statusRequestRef.current) return null;
      if (!res.ok) {
        setDomainStatus(null);
        setAlert({ type: 'error', message: data.error || 'Não foi possível consultar o status deste domínio.' });
        return null;
      }
      const next: DomainStatus = {
        domain: target,
        exists: !!data.exists,
        verified: !!data.verified,
        token: data.token || null,
      };
      setDomainStatus(next);
      return next;
    } catch {
      if (requestId !== statusRequestRef.current) return null;
      setDomainStatus(null);
      setAlert({ type: 'error', message: 'Erro de conexão ao consultar o status do domínio.' });
      return null;
    } finally {
      if (requestId === statusRequestRef.current) setCheckingStatus(false);
    }
  }, []);

  // Consulta o status no backend (com debounce) sempre que o domínio muda.
  useEffect(() => {
    if (!domainValid) {
      statusRequestRef.current++;
      setCheckingStatus(false);
      setDomainStatus(null);
      setAlert(null);
      return;
    }
    setCheckingStatus(true);
    setAlert(null);
    setPrefix('');
    setPassword('');
    const timer = setTimeout(() => {
      fetchStatus(domain);
    }, 400);
    return () => clearTimeout(timer);
  }, [domain, domainValid, fetchStatus]);

  const loadAccounts = useCallback(async (target: string) => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`${API}/api/emails/corporate/accounts/${encodeURIComponent(target)}`, {
        headers: hdrs(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      } else {
        setAccounts([]);
        setAlert({ type: 'error', message: data.error || 'Não foi possível carregar as contas de e-mail.' });
      }
    } catch {
      setAccounts([]);
      setAlert({ type: 'error', message: 'Erro de conexão ao carregar as contas de e-mail.' });
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (stage === 'active' && domain) {
      loadAccounts(domain);
    } else {
      setAccounts([]);
    }
  }, [stage, domain, loadAccounts]);

  const activateEmail = async () => {
    if (!domainValid) {
      setAlert({ type: 'error', message: 'Informe um domínio válido, por exemplo: seunegocio.com' });
      return;
    }
    setActivating(true);
    try {
      const res = await fetch(`${API}/api/emails/corporate/domain/add`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ domainName: domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDomainStatus({ domain, exists: true, verified: false, token: data.txtRecordValue || null });
        setAlert({
          type: 'success',
          message: data.message || 'Domínio registrado! Agora adicione os 3 registros DNS abaixo.',
        });
      } else if (/j[áa] (est[áa]|se encontra) cadastrad/i.test(data.error || '')) {
        const fresh = await fetchStatus(domain);
        setAlert({
          type: fresh?.verified ? 'success' : 'warning',
          message: fresh?.verified
            ? 'Este domínio já está verificado no serviço de e-mail. Você já pode criar as contas.'
            : 'Este domínio já estava cadastrado no serviço de e-mail. Confira os registros DNS abaixo e clique em "Verificar Registros de DNS".',
        });
      } else {
        setAlert({
          type: 'error',
          message: data.error || 'Não foi possível ativar o e-mail corporativo para este domínio.',
        });
      }
    } catch {
      setAlert({ type: 'error', message: 'Erro de conexão ao ativar o e-mail corporativo.' });
    } finally {
      setActivating(false);
    }
  };

  const verifyDomain = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${API}/api/emails/corporate/domain/verify`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ domainName: domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDomainStatus(prev =>
          prev && prev.domain === domain
            ? { ...prev, verified: true }
            : { domain, exists: true, verified: true, token: null },
        );
        setAlert({
          type: 'success',
          message: data.message || `Domínio ${domain} verificado! Agora você já pode criar as contas de e-mail.`,
        });
      } else {
        setAlert({
          type: 'error',
          message:
            data.error ||
            'Ainda não encontramos os registros DNS. Aguarde a propagação (de minutos até algumas horas) e tente novamente.',
        });
      }
    } catch {
      setAlert({ type: 'error', message: 'Erro de conexão ao verificar os registros DNS.' });
    } finally {
      setVerifying(false);
    }
  };

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPrefix = prefix.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(cleanPrefix)) {
      setAlert({ type: 'error', message: 'Prefixo inválido. Use letras, números, ponto, hífen ou underline.' });
      return;
    }
    if (password.length < 8) {
      setAlert({ type: 'error', message: 'A senha deve ter no mínimo 8 caracteres.' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/emails/corporate/account/create`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ domainName: domain, emailPrefix: cleanPrefix, plainPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPrefix('');
        setPassword('');
        setAlert({ type: 'success', message: data.message || `Conta ${cleanPrefix}@${domain} criada com sucesso!` });
        loadAccounts(domain);
      } else {
        setAlert({ type: 'error', message: data.error || 'Não foi possível criar a conta de e-mail.' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Erro de conexão ao criar a conta de e-mail.' });
    } finally {
      setCreating(false);
    }
  };

  const deleteAccount = async (email: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`Excluir a conta ${email}? Todos os e-mails dessa caixa serão removidos.`)) {
      return;
    }
    setDeleting(email);
    try {
      const res = await fetch(`${API}/api/emails/corporate/account/delete`, {
        method: 'DELETE',
        headers: hdrs(),
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setAccounts(prev => prev.filter(a => a.email !== email));
        setAlert({ type: 'success', message: `Conta ${email} excluída.` });
      } else {
        setAlert({ type: 'error', message: data.error || 'Não foi possível excluir a conta de e-mail.' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Erro de conexão ao excluir a conta de e-mail.' });
    } finally {
      setDeleting(null);
    }
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setAlert({ type: 'success', message: `${label} copiado!` });
    } catch {
      setAlert({ type: 'error', message: 'Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.' });
    }
  };

  const token = status?.token || null;
  const dnsRecords = [
    { key: 'verify', type: 'TXT', value: token || 'token gerado ao ativar o domínio', priority: '—', copyable: !!token, label: 'Registro TXT' },
    { key: 'mx', type: 'MX', value: MAIL_SERVER, priority: '10', copyable: true, label: 'Registro MX' },
    { key: 'spf', type: 'TXT', value: SPF_VALUE, priority: '—', copyable: true, label: 'Registro SPF' },
  ];

  const domainOptions = Array.from(new Set(domains.filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* Cabeçalho + seletor de domínio */}
      <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">E-mail Corporativo</h3>
              <p className="text-sm text-gray-500">
                Caixas de e-mail profissionais no formato <span className="font-mono">nome@{domain || 'seudominio.com'}</span>.
              </p>
            </div>
          </div>
          <a
            href={WEBMAIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm flex-shrink-0"
          >
            <ExternalLink className="w-4 h-4" /> Acessar Webmail
          </a>
        </div>

        <div className="mt-5">
          <label htmlFor="corporate-email-domain" className="block text-sm font-medium text-gray-700 mb-1">
            Domínio
          </label>
          <input
            id="corporate-email-domain"
            type="text"
            list="corporate-email-domain-options"
            value={domainInput}
            onChange={e => setDomainInput(e.target.value)}
            placeholder="seudominio.com"
            autoComplete="off"
            spellCheck={false}
            className="w-full sm:max-w-md px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
          />
          <datalist id="corporate-email-domain-options">
            {domainOptions.map(d => <option key={d} value={d} />)}
          </datalist>
          {domainInput && !domainValid && (
            <p className="text-xs text-red-600 mt-1">Informe um domínio válido, ex: seunegocio.com</p>
          )}
        </div>
      </div>

      {/* Alertas */}
      {alert && (
        <div
          className={`rounded-xl border p-3 flex items-start gap-2 text-sm ${
            alert.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : alert.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <p className="flex-1">{alert.message}</p>
          <button onClick={() => setAlert(null)} aria-label="Fechar aviso" className="p-0.5 rounded hover:bg-black/5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Estado 0: nenhum domínio informado */}
      {stage === 'idle' && (
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
          {domainValid ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-gray-500 flex-1">
                Não foi possível consultar o status de {domain}.
              </p>
              <button
                onClick={() => fetchStatus(domain)}
                className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Selecione um dos seus domínios (ou digite um) para ativar o e-mail corporativo e criar as caixas.
            </p>
          )}
        </div>
      )}

      {/* Estado 1: consultando o status no backend */}
      {stage === 'checking' && (
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />
          <p className="text-sm text-gray-500">Consultando o status de {domain}...</p>
        </div>
      )}

      {/* Estado 2: domínio ainda não cadastrado no serviço de e-mail */}
      {stage === 'inactive' && (
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Ative o e-mail corporativo em {domain}</h4>
              <p className="text-sm text-gray-500 mt-1">
                Vamos registrar o domínio no servidor de e-mail e gerar o registro TXT de verificação.
                Depois basta adicionar 3 registros no painel de DNS do seu domínio.
              </p>
              <button
                onClick={activateEmail}
                disabled={activating}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {activating ? 'Ativando...' : 'Ativar E-mail Corporativo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado 3: domínio registrado, aguardando DNS */}
      {stage === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                Configure os registros DNS
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-200">
                  Aguardando verificação
                </span>
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Adicione os registros abaixo na Cloudflare (<span className="font-medium">DNS → Records</span>) ou no
                provedor de DNS do seu domínio. O registro MX deve ficar sem proxy (<span className="font-medium">DNS only</span>).
              </p>
            </div>
            <span className="text-sm font-mono text-gray-700">{domain}</span>
          </div>

          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Tipo</th>
                    <th className="text-left font-semibold px-4 py-3">Nome</th>
                    <th className="text-left font-semibold px-4 py-3">Valor</th>
                    <th className="text-left font-semibold px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dnsRecords.map(record => (
                    <tr key={record.key} className="align-top">
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono font-semibold">
                          {record.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">@</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 break-all">{record.value}</td>
                      <td className="px-4 py-3 text-gray-600">{record.priority}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => copyValue(record.value, record.label)}
                          disabled={!record.copyable}
                          title="Copiar valor"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">TTL: deixe em Auto (padrão).</p>

          <div className="mt-5 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-400" /> Ou aponte os nameservers da MozHost
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Se o DNS do domínio não estiver na Cloudflare, pode trocar os nameservers no registrador
              (“Nameservers” / “DNS personalizado”) em vez de criar os 3 registros acima. A propagação costuma
              levar de minutos até algumas horas.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {NAMESERVERS.map(ns => (
                <div key={ns} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-gray-800 break-all">{ns}</span>
                  <button
                    onClick={() => copyValue(ns, `Nameserver ${ns}`)}
                    title={`Copiar ${ns}`}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {!token && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  O servidor não retornou o token TXT deste domínio. Se ele não aparecer após recarregar a
                  página, fale com o suporte para recuperá-lo.
                </span>
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={verifyDomain}
              disabled={verifying}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {verifying ? 'Verificando DNS...' : 'Verificar Registros de DNS'}
            </button>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> A propagação pode levar de minutos até algumas horas.
            </p>
          </div>
        </div>
      )}

      {/* Estado 4: domínio verificado */}
      {stage === 'active' && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                  {domain}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                    <CheckCircle2 className="w-3 h-3" /> Verificado
                  </span>
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Servidor de e-mail ativo. As contas abaixo acessam pelo webmail{' '}
                  <span className="font-medium">mail.eliobrostech.site</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Nova conta de e-mail
            </h4>
            <form onSubmit={createAccount} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="corporate-email-prefix" className="block text-xs font-medium text-gray-600 mb-1">
                  Endereço
                </label>
                <div className="flex rounded-lg border overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    id="corporate-email-prefix"
                    type="text"
                    value={prefix}
                    onChange={e => setPrefix(e.target.value)}
                    placeholder="financeiro"
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 min-w-0 px-3 py-2 text-sm outline-none font-mono"
                  />
                  <span className="px-3 py-2 bg-gray-50 border-l text-sm text-gray-500 whitespace-nowrap font-mono">
                    @{domain}
                  </span>
                </div>
              </div>
              <div>
                <label htmlFor="corporate-email-password" className="block text-xs font-medium text-gray-600 mb-1">
                  Senha
                </label>
                <input
                  id="corporate-email-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={creating || !prefix.trim() || password.length < 8}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Criando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 pb-3 flex items-center justify-between gap-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" /> Contas de e-mail
                {accounts.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {accounts.length}
                  </span>
                )}
              </h4>
              <button
                onClick={() => loadAccounts(domain)}
                disabled={loadingAccounts}
                title="Atualizar lista"
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAccounts ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingAccounts ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="px-5 pb-6 text-center">
                <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nenhuma conta criada ainda para este domínio.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="text-left font-semibold px-5 sm:px-6 py-3">E-mail</th>
                      <th className="text-left font-semibold px-4 py-3">Quota</th>
                      <th className="px-5 sm:px-6 py-3 text-right"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {accounts.map(account => (
                      <tr key={account.id ?? account.email} className="hover:bg-gray-50/60">
                        <td className="px-5 sm:px-6 py-3 font-mono text-gray-900 break-all">{account.email}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {account.quota_gb ? `${account.quota_gb} GB` : '—'}
                        </td>
                        <td className="px-5 sm:px-6 py-3 text-right">
                          <button
                            onClick={() => deleteAccount(account.email)}
                            disabled={deleting === account.email}
                            title="Excluir conta"
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          >
                            {deleting === account.email ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
