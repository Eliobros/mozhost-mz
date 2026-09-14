"use client"

import React, { useState, useEffect } from 'react';
import {
  Zap, Youtube, Music, Instagram, Facebook, Cloud, DollarSign,
  Music2, Mic2, CheckCircle, AlertCircle, Loader2, ShoppingCart, Activity, Lock
} from 'lucide-react';

const API = 'https://api.mozhost.shop';

const SERVICE_ICONS = {
  youtube: Youtube, tiktok: Music, instagram: Instagram, facebook: Facebook,
  spotify: Music2, shazam: Mic2, lyrics: Mic2, weather: Cloud, currency: DollarSign
};

// Visão geral: saldo + status da Alauda
const Overview = ({ status, onBuyClick }) => {
  if (!status) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Saldo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Saldo de Requisições</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {status.balance?.requests_remaining ?? 0}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        {status.balance?.quota_reset_at && (
          <p className="text-xs text-gray-400 mt-2">
            Cota renova em: {new Date(status.balance.quota_reset_at).toLocaleDateString('pt-MZ')}
          </p>
        )}
      </div>

      {/* Status da API */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Status da API</p>
            <p className="text-lg font-bold mt-1 flex items-center gap-2">
              {status.alauda_online ? (
                <>
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-green-600">Online</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                  <span className="text-red-600">Offline</span>
                </>
              )}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Plano: {status.plan?.toUpperCase()}</p>
      </div>

      {/* Comprar pacote */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <p className="text-sm text-blue-100">Precisas de mais requests?</p>
        <h3 className="text-xl font-bold mt-1 mb-4">Comprar Pacote</h3>
        <button
          onClick={onBuyClick}
          className="bg-white text-blue-700 py-2 px-4 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          Ver pacotes
        </button>
      </div>
    </div>
  );
};

// Catálogo de endpoints
const Catalog = ({ onTest }) => {
  const [catalog, setCatalog] = useState([]);
  const [openService, setOpenService] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/alauda/endpoints`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mozhost_token')}` }
    })
      .then(r => r.json())
      .then(d => setCatalog(d.catalog || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      {catalog.map((svc) => {
        const Icon = SERVICE_ICONS[svc.service] || Zap;
        const isOpen = openService === svc.service;

        return (
          <div key={svc.service} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setOpenService(isOpen ? null : svc.service)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{svc.name}</p>
                  <p className="text-xs text-gray-500">{svc.endpoints.length} endpoint(s)</p>
                </div>
              </div>
              <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-4 space-y-3">
                {svc.endpoints.map((ep) => (
                  <div key={ep.path} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ep.method}
                        </span>
                        <code className="text-xs text-gray-700 truncate">{ep.path}</code>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{ep.desc}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                        {ep.cost} req{ep.cost > 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => onTest(ep)}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Testar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Testador de endpoint
const EndpointTester = ({ endpoint, onClose }) => {
  const [body, setBody] = useState(JSON.stringify(endpoint.body || {}, null, 2));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('mozhost_token')}`,
          'Content-Type': 'application/json'
        },
        body: endpoint.method === 'POST' ? body : undefined
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Erro na requisição');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">Testar Endpoint</h3>
            <code className="text-xs text-gray-500">{endpoint.method} {endpoint.path}</code>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {endpoint.method === 'POST' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Body (JSON)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full font-mono text-xs border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <button
            onClick={handleTest}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? 'Executando...' : 'Executar Requisição'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resposta</label>
              <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-64">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Logs de uso
const UsageLogs = () => {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/alauda/usage`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mozhost_token')}` }
    })
      .then(r => r.json())
      .then(d => setUsage(d.usage || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>;
  }

  if (!usage.length) {
    return (
      <div className="text-center py-10 text-gray-500">
        <Activity className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma requisição ainda</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left p-3 font-semibold text-gray-700">Endpoint</th>
            <th className="text-left p-3 font-semibold text-gray-700">Custo</th>
            <th className="text-left p-3 font-semibold text-gray-700">Status</th>
            <th className="text-left p-3 font-semibold text-gray-700">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {usage.map((u, i) => (
            <tr key={i}>
              <td className="p-3 font-mono text-xs text-gray-700">{u.endpoint}</td>
              <td className="p-3 text-gray-600">{u.cost}</td>
              <td className="p-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  u.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {u.status}
                </span>
              </td>
              <td className="p-3 text-xs text-gray-500">
                {new Date(u.created_at).toLocaleString('pt-MZ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Página principal
const ApiPage = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('catalog');
  const [testingEndpoint, setTestingEndpoint] = useState(null);
  const [showPacks, setShowPacks] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/alauda/status`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mozhost_token')}` }
    })
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Sem acesso (plano abaixo do Basic)
  if (status && !status.has_access) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">API indisponível no teu plano</h1>
        <p className="text-gray-600 mb-2">{status.message}</p>
        <p className="text-sm text-gray-500 mb-8">
          Faz upgrade para Basic, Pro ou Business e desbloqueia downloads do YouTube, TikTok,
          Instagram, Spotify, lyrics, clima e muito mais — direto dos teus containers!
        </p>
        <a
          href="/billing"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-8 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          <Zap className="w-5 h-5" />
          Ver Planos
        </a>
      </div>
    );
  }

  const PACKS = [
    { amount: 500, price: 50, label: 'Starter Pack' },
    { amount: 2000, price: 150, label: 'Pro Pack' },
    { amount: 10000, price: 500, label: 'Business Pack' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API de Cases</h1>
            <p className="text-gray-600">Downloads, lyrics, clima e mais — direto dos teus bots</p>
          </div>
        </div>
      </div>

      <Overview status={status} onBuyClick={() => setShowPacks(true)} />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl">
        {[
          ['catalog', 'Endpoints'],
          ['usage', 'Logs de Uso']
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              tab === id ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && <Catalog onTest={setTestingEndpoint} />}
      {tab === 'usage' && <UsageLogs />}

      {/* Modal de teste */}
      {testingEndpoint && (
        <EndpointTester
          endpoint={testingEndpoint}
          onClose={() => setTestingEndpoint(null)}
        />
      )}

      {/* Modal de pacotes */}
      {showPacks && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Comprar Requests</h3>
              <button onClick={() => setShowPacks(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              {PACKS.map((p) => (
                <div key={p.amount} className="flex items-center justify-between border border-gray-200 rounded-xl p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{p.label}</p>
                    <p className="text-sm text-gray-500">{p.amount.toLocaleString()} requests</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-600">{p.price} MT</span>
                    <button
                      onClick={() => alert('Integração com M-Pesa/e-Mola em breve!')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Pagamento via M-Pesa / e-Mola — integração com o billing em breve
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiPage;
