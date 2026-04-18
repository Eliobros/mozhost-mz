// app/domains/page.js
'use client';

import { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  AlertCircle,
  Copy,
  Trash2,
  RefreshCw
} from 'lucide-react';

const API_BASE_URL = 'https://api.mozhost.shop';

export default function DomainsPage() {
  const [domains, setDomains] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('mozhost_token');
    if (!token) {
      setError('Token não encontrado. Faça login novamente.');
      return null;
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadData = async () => {
    try {
      setError(null);
      const headers = getAuthHeaders();
      if (!headers) return;

      const [domainsRes, containersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/domains`, { headers }),
        fetch(`${API_BASE_URL}/api/containers`, { headers })
      ]);

      if (domainsRes.status === 401 || containersRes.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (domainsRes.ok && containersRes.ok) {
        const domainsData = await domainsRes.json();
        const containersData = await containersRes.json();

        setDomains(Array.isArray(domainsData) ? domainsData : []);
        const containersList = containersData?.containers || [];
        setContainers(Array.isArray(containersList) ? containersList : []);
      } else {
        setError('Erro ao carregar dados.');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const verifyDomain = async (domainId) => {
    setVerifying(prev => ({ ...prev, [domainId]: true }));

    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const res = await fetch(`${API_BASE_URL}/api/domains/${domainId}/verify`, {
        method: 'POST',
        headers
      });

      const data = await res.json();

      if (res.ok) {
        if (data.configured) {
          alert(`✅ DNS configurado corretamente!\nIP detectado: ${data.ip}`);
        } else {
          alert(`⏳ DNS ainda não propagou.\nIP detectado: ${data.ip || 'Nenhum'}\n\nAguarde alguns minutos e tente novamente.`);
        }
        loadData(); // Recarregar lista
      } else {
        alert(`❌ Erro ao verificar: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Erro ao verificar domínio');
    } finally {
      setVerifying(prev => ({ ...prev, [domainId]: false }));
    }
  };

  const addDomain = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/domains`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          containerId: selectedContainer,
          domain: newDomain.toLowerCase().trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowAddModal(false);
        setNewDomain('');
        setSelectedContainer('');
        loadData();

        alert(`✅ Domínio adicionado!\n\nConfigure seu DNS:\nTipo: A\nNome: @\nValor: ${data.instructions.ip}`);
      } else {
        setError(data.error || 'Erro ao adicionar domínio');
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
      alert('❌ Erro ao adicionar domínio');
    } finally {
      setSubmitting(false);
    }
  };

  const removeDomain = async (domainId, domainName) => {
    if (!confirm(`Tem certeza que deseja remover ${domainName}?`)) return;

    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const res = await fetch(`${API_BASE_URL}/api/domains/${domainId}`, { 
        method: 'DELETE',
        headers 
      });

      if (res.ok) {
        loadData();
      } else {
        alert('❌ Erro ao remover domínio');
      }
    } catch (error) {
      alert('❌ Erro ao remover domínio');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copiado!');
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        icon: Clock,
        color: 'text-yellow-500',
        bg: 'bg-yellow-50',
        text: 'Aguardando configuração'
      },
      dns_configured: {
        icon: RefreshCw,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
        text: 'DNS detectado, gerando SSL...'
      },
      ssl_generating: {
        icon: Lock,
        color: 'text-purple-500',
        bg: 'bg-purple-50',
        text: 'Gerando certificado SSL...'
      },
      active: {
        icon: CheckCircle2,
        color: 'text-green-500',
        bg: 'bg-green-50',
        text: 'Ativo'
      },
      failed: {
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-50',
        text: 'Falhou - verifique DNS'
      }
    };

    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Domínios Customizados</h1>
                <p className="text-gray-600">Conecte seus próprios domínios aos containers</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Adicionar Domínio
            </button>
          </div>
        </div>

        {/* Erro Geral */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-900 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Aviso de Plano */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Domínios customizados disponíveis no Plano Pro</h3>
            <p className="text-sm text-blue-700 mt-1">
              Você precisa ter seu próprio domínio registrado em Namecheap, GoDaddy, Cloudflare, etc.
            </p>
          </div>
        </div>

        {/* Lista de Domínios */}
        {domains.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum domínio configurado
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione seu primeiro domínio customizado para começar
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Adicionar Primeiro Domínio
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {domains.map((domain) => {
              const statusConfig = getStatusConfig(domain.status);
              const StatusIcon = statusConfig.icon;
              const container = containers.find(c => c.id === domain.container_id);

              return (
                <div key={domain.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {domain.domain}
                        </h3>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusConfig.bg}`}>
                          <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                          <span className={`text-sm font-medium ${statusConfig.color}`}>
                            {statusConfig.text}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        Container: <span className="font-medium">{container?.name || domain.container_id}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => removeDomain(domain.id, domain.domain)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover domínio"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Instruções DNS */}
                  {domain.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Configure seu DNS
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between bg-white rounded p-3">
                          <div>
                            <span className="text-gray-600">Tipo:</span>
                            <span className="ml-2 font-mono font-bold">A</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white rounded p-3">
                          <div>
                            <span className="text-gray-600">Nome:</span>
                            <span className="ml-2 font-mono font-bold">@</span>
                            <span className="text-gray-500 ml-2">(ou {domain.domain})</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white rounded p-3">
                          <div>
                            <span className="text-gray-600">Valor:</span>
                            <span className="ml-2 font-mono font-bold">{domain.server_ip || '208.110.72.191'}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(domain.server_ip || '208.110.72.191')}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-white rounded p-3">
                          <div>
                            <span className="text-gray-600">TTL:</span>
                            <span className="ml-2 font-mono font-bold">300</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-yellow-200">
                        <p className="text-xs text-yellow-700">
                          ⏳ A propagação DNS pode levar de 5 minutos a 24 horas
                        </p>
                        
                        {/* BOTÃO VERIFICAR AGORA */}
                        <button
                          onClick={() => verifyDomain(domain.id)}
                          disabled={verifying[domain.id]}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifying[domain.id] ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verificando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Verificar Agora
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SSL Info */}
                  {domain.status === 'active' && domain.ssl_expires_at && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <Lock className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">
                          SSL ativo e seguro
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Válido até {new Date(domain.ssl_expires_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <a
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Visitar Site
                      </a>
                    </div>
                  )}

                  {/* Erro */}
                  {domain.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-4">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 mb-1">
                            Falha na configuração
                          </h4>
                          <p className="text-sm text-red-700">
                            {domain.error_message || 'Verifique se o DNS está apontando corretamente para o IP do servidor. Aguarde a propagação e tente novamente.'}
                          </p>
                        </div>
                      </div>
                      
                      {/* BOTÃO VERIFICAR NOVAMENTE */}
                      <button
                        onClick={() => verifyDomain(domain.id)}
                        disabled={verifying[domain.id]}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                      >
                        {verifying[domain.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Tentar Novamente
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    Adicionado em {new Date(domain.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Adicionar Domínio */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Adicionar Domínio Customizado
            </h2>

            <form onSubmit={addDomain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Container
                </label>
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione um container</option>
                  {containers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domínio
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="meusite.com"
                  required
                  pattern="[a-z0-9\-\.]+"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apenas letras minúsculas, números, hífens e pontos
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  💡 <strong>Importante:</strong> Você precisa ser dono do domínio e ter acesso ao painel DNS.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewDomain('');
                    setSelectedContainer('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
