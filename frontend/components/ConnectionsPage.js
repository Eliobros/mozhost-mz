"use client"

import React, { useState, useEffect } from 'react';
import {
  Link2, MessageCircle, Github, CheckCircle, AlertCircle, X,
  Smartphone, Unlink, GitBranch, RefreshCw, Trash2, ExternalLink,
  Server, Loader2, ChevronDown, Zap, Webhook
} from 'lucide-react';

const API = 'https://api.mozhost.shop';

// ========== TAB COMPONENT ==========
const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg transition-all ${
      active
        ? 'bg-white text-gray-900 shadow-md border border-gray-200'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
    {count !== undefined && (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
      }`}>
        {count}
      </span>
    )}
  </button>
);

// ========== WHATSAPP TAB ==========
const WhatsAppTab = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkStatus, setLinkStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    checkLinkStatus();
  }, []);

  const checkLinkStatus = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      if (!token) return;
      const response = await fetch(`${API}/api/whatsapp-link/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLinkStatus(data);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 11) {
      setError('Digite o código completo (ex: MOZH-AB12CD)');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`${API}/api/whatsapp-link/verify-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code.toUpperCase() })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('WhatsApp vinculado com sucesso! 🎉');
        setCode('');
        setTimeout(() => checkLinkStatus(), 1500);
      } else {
        setError(data.message || data.error || 'Código inválido ou expirado');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Tem certeza que deseja desvincular seu WhatsApp?')) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`${API}/api/whatsapp-link/unlink`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('WhatsApp desvinculado com sucesso!');
        setTimeout(() => { checkLinkStatus(); setSuccess(''); }, 1500);
      } else {
        setError(data.message || data.error || 'Erro ao desvincular');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Verificando status...</p>
        </div>
      </div>
    );
  }

  // Linked state
  if (linkStatus && linkStatus.linked) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">WhatsApp Vinculado!</h3>
              <p className="text-sm text-gray-600">Conta conectada ao WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-green-100">
            <Smartphone className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-gray-900">{linkStatus.whatsappNumber}</p>
              <p className="text-xs text-gray-500">Vinculado em: {new Date(linkStatus.linkedSince).toLocaleDateString('pt-MZ')}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-3">📱 Comandos Disponíveis:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
            {[
              ['!vincular', 'Verificar vinculação'],
              ['!plano', 'Ver detalhes do plano'],
              ['!faturas', 'Ver últimos pagamentos'],
              ['!containers', 'Listar containers'],
              ['!menu', 'Todos os comandos']
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex items-center gap-2">
                <code className="bg-white px-2 py-1 rounded font-mono text-xs">{cmd}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <button
          onClick={handleUnlink}
          disabled={loading}
          className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          <Unlink className="w-5 h-5 mr-2" />
          {loading ? 'Desvinculando...' : 'Desvincular WhatsApp'}
        </button>
      </div>
    );
  }

  // Not linked state
  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Como Vincular:</h3>
        <div className="space-y-4">
          {[
            ['Envie mensagem no WhatsApp', 'Envie !vincular para o bot da MozHost'],
            ['Receba o código', 'O bot enviará um código único (ex: MOZH-AB12CD)'],
            ['Digite o código aqui', 'Cole o código que recebeu no campo abaixo']
          ].map(([title, desc], i) => (
            <div key={i} className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">
                {i + 1}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{title}</h4>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Digite seu Código</h3>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}
        <div className="mb-4">
          <input
            type="text"
            placeholder="MOZH-AB12CD"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={11}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-center text-lg font-mono tracking-wider"
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Digite o código exatamente como recebeu (11 caracteres)
          </p>
        </div>
        <button
          onClick={handleVerifyCode}
          disabled={loading || !code || code.length !== 11}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-5 h-5 mr-2" />
          )}
          {loading ? 'Verificando...' : 'Vincular Conta'}
        </button>
      </div>
    </div>
  );
};

// ========== GITHUB TAB ==========
const GitHubTab = () => {
  const [ghStatus, setGhStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [repos, setRepos] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deploys, setDeploys] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedRepos, setLinkedRepos] = useState([]);

  const getToken = () => localStorage.getItem('mozhost_token');

  const headers = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  });

  // Check GitHub status on mount
  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API}/api/github/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGhStatus(data);
        if (data.connected) {
          loadRepos();
          loadContainers();
        }
      }
    } catch (err) {
      console.error('Erro ao verificar GitHub:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API}/api/github/repos`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch (err) {
      console.error('Erro ao listar repos:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const loadContainers = async () => {
    try {
      const res = await fetch(`${API}/api/containers`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setContainers(data.containers || []);
      }
    } catch (err) {
      console.error('Erro ao listar containers:', err);
    }
  };

  const loadBranches = async (repoFullName) => {
    setLoadingBranches(true);
    try {
      const [owner, repo] = repoFullName.split('/');
      const res = await fetch(`${API}/api/github/repos/${owner}/${repo}/branches`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
        if (data.branches?.length) setSelectedBranch(data.branches[0].name);
      }
    } catch (err) {
      console.error('Erro ao listar branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
    loadBranches(repo.full_name);
  };

  const handleConnect = async () => {
    if (!selectedRepo || !selectedContainer) {
      setError('Selecione um repositório e um container');
      return;
    }

    setConnecting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/github/connect`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          container_id: selectedContainer,
          repo_url: selectedRepo.url,
          repo_name: selectedRepo.full_name,
          branch: selectedBranch
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`✅ Repositório ${selectedRepo.full_name} conectado ao container! Push no GitHub = deploy automático 🚀`);
        setSelectedRepo(null);
        setSelectedContainer('');
      } else {
        setError(data.error || 'Erro ao conectar repositório');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar sua conta GitHub?')) return;
    try {
      const res = await fetch(`${API}/api/github/disconnect`, {
        method: 'DELETE',
        headers: headers()
      });
      if (res.ok) {
        setGhStatus({ connected: false, github_username: null });
        setRepos([]);
        setSelectedRepo(null);
        setSuccess('GitHub desconectado com sucesso');
      }
    } catch (err) {
      setError('Erro ao desconectar GitHub');
    }
  };

  const handleAuthGitHub = async () => {
    try {
      const res = await fetch(`${API}/api/github/auth`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch (err) {
      setError('Erro ao iniciar autenticação GitHub');
    }
  };

  // Loading state
  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Verificando GitHub...</p>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!ghStatus?.connected) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Github className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Conecte seu GitHub</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Conecte sua conta GitHub para sincronizar repositórios com seus containers.
            A cada push, seu container é atualizado automaticamente! 🚀
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start text-left">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleAuthGitHub}
            className="bg-gray-900 text-white py-3 px-8 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center mx-auto"
          >
            <Github className="w-5 h-5 mr-2" />
            Conectar com GitHub
          </button>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: 'Deploy Automático', desc: 'Push no GitHub = container atualizado', color: 'blue' },
            { icon: Webhook, title: 'Webhooks', desc: 'Recebe eventos em tempo real', color: 'green' },
            { icon: GitBranch, title: 'Branches', desc: 'Escolha qual branch sincronizar', color: 'purple' }
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className={`bg-white rounded-xl border border-gray-200 p-5 text-center`}>
              <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
            <Github className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">GitHub Conectado</h3>
            <p className="text-sm text-gray-600">@{ghStatus.github_username}</p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-1"
        >
          <Unlink className="w-4 h-4" />
          Desconectar
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Repo selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Conectar Repositório a um Container</h3>
          <button
            onClick={loadRepos}
            disabled={loadingRepos}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRepos ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {loadingRepos ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
            <p className="text-gray-500">Carregando repositórios...</p>
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-8">
            <Github className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum repositório encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Repository list */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                1. Selecione o Repositório
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      selectedRepo?.id === repo.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Github className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{repo.full_name}</p>
                        <p className="text-xs text-gray-500">
                          {repo.private ? '🔒 Privado' : '🌐 Público'} · Atualizado: {new Date(repo.updated_at).toLocaleDateString('pt-MZ')}
                        </p>
                      </div>
                    </div>
                    {selectedRepo?.id === repo.id && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Branch selector */}
            {selectedRepo && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  2. Selecione a Branch
                </label>
                {loadingBranches ? (
                  <div className="flex items-center py-3">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin mr-2" />
                    <span className="text-sm text-gray-500">Carregando branches...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {branches.map((b) => (
                      <button
                        key={b.name}
                        onClick={() => setSelectedBranch(b.name)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedBranch === b.name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <GitBranch className="w-3.5 h-3.5 inline mr-1" />
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Container selector */}
            {selectedRepo && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  3. Selecione o Container
                </label>
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="">Escolha um container...</option>
                  {containers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type || 'node'}) - {c.status || 'stopped'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Connect button */}
            {selectedRepo && selectedContainer && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3 px-6 rounded-lg font-bold hover:from-gray-900 hover:to-black disabled:opacity-50 transition-all flex items-center justify-center"
              >
                {connecting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Zap className="w-5 h-5 mr-2" />
                )}
                {connecting ? 'Conectando...' : 'Conectar e Fazer Deploy'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Como Funciona?</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p>Conecte seu repositório GitHub a um container</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p>Um webhook é criado automaticamente no GitHub</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p>A cada push na branch selecionada, o código é clonado/atualizado no container</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">✓</span>
            <p className="font-medium text-gray-900">Container reinicia automaticamente com as atualizações!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== MAIN PAGE ==========
const ConnectionsPage = () => {
  // Read tab from URL hash or query
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [githubAlert, setGithubAlert] = useState(null);

  useEffect(() => {
    // Check for github=success|error from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const githubStatus = params.get('github');
    if (githubStatus === 'success' || githubStatus === 'error') {
      setActiveTab('github');
      if (githubStatus === 'success') {
        setGithubAlert({ type: 'success', text: 'GitHub conectado com sucesso! 🎉' });
      } else {
        const reason = params.get('reason');
        const messages = {
          missing_code: 'GitHub não devolveu o código de autorização. Tente novamente.',
          invalid_state: 'Sessão de conexão expirada. Clique em "Conectar com GitHub" novamente.',
          no_token: 'Não foi possível obter o token do GitHub. Tente novamente.',
          server_error: 'Erro interno ao conectar o GitHub. Tente novamente.'
        };
        setGithubAlert({ type: 'error', text: messages[reason] || 'Falha ao conectar o GitHub. Tente novamente.' });
      }
      // Limpa a query da URL para o alerta não reaparecer ao recarregar
      window.history.replaceState({}, '', '/connections#github');
    }
    // Check hash
    const hash = window.location.hash.replace('#', '');
    if (hash === 'github' || hash === 'whatsapp') {
      setActiveTab(hash);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conexões</h1>
            <p className="text-gray-600">Gerencie integrações com WhatsApp e GitHub</p>
          </div>
        </div>
      </div>

      {/* GitHub OAuth feedback */}
      {githubAlert && (
        <div className={`mb-6 rounded-xl border p-4 flex items-start justify-between ${
          githubAlert.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start">
            {githubAlert.type === 'success'
              ? <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />}
            <p className={`text-sm ${githubAlert.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {githubAlert.text}
            </p>
          </div>
          <button onClick={() => setGithubAlert(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl">
        <TabButton
          active={activeTab === 'whatsapp'}
          onClick={() => setActiveTab('whatsapp')}
          icon={MessageCircle}
          label="WhatsApp"
        />
        <TabButton
          active={activeTab === 'github'}
          onClick={() => setActiveTab('github')}
          icon={Github}
          label="GitHub"
        />
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        {activeTab === 'whatsapp' && <WhatsAppTab />}
        {activeTab === 'github' && <GitHubTab />}
      </div>
    </div>
  );
};

export default ConnectionsPage;
