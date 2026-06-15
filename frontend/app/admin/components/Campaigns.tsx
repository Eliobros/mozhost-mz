'use client';
import React, { useState, useEffect } from 'react';

interface CampaignsProps {
  password: string;
}

export const Campaigns: React.FC<CampaignsProps> = ({ password }) => {
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [tipo, setTipo] = useState('sem_containers');

const grupos = [
  { id: 'todos', label: '👥 Todos os usuários' },
  { id: 'inativos', label: '😴 Inativos' },
  { id: 'sem_containers', label: '📦 Sem containers' },
  { id: 'free', label: '🆓 Membros Free' },
  { id: 'vip', label: '⭐ Membros VIP (Basic/Pro)' }
];


  const API = process.env.NEXT_PUBLIC_API_URL;

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password
  };

  // Carrega template salvo
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`${API}/api/admin/campaigns/template?password=${encodeURIComponent(password)}`, { headers });
        const data = await res.json();
        if (data.success && data.template) {
          setAssunto(data.template.assunto);
          setCorpo(data.template.corpo);
        }
      } catch (err) {
        console.error('Erro ao buscar template:', err);
      } finally {
        setLoadingTemplate(false);
      }
    };
    fetchTemplate();
  }, []);

  const salvarTemplate = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${API}/api/admin/campaigns/template?password=${encodeURIComponent(password)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assunto, corpo })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    alert('Template salvo com sucesso!');
  } catch (err: any) {
    setErro(err.message);
  } finally {
    setLoading(false);
  }
};

  const enviarCampanha = async () => {
  if (!confirm('Tens certeza que queres enviar para o grupo selecionado?')) return;
  setErro('');
  setResultado(null);
  setLoading(true);
  try {
    const res = await fetch(`${API}/api/admin/campaigns/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        password,
        tipo,       // grupo selecionado
        assunto,
        corpo
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    setResultado(data);
  } catch (err: any) {
    setErro(err.message);
  } finally {
    setLoading(false);
  }
};
     

  if (loadingTemplate) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-500">A carregar template...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📧 Campanhas de Email</h2>
        <p className="text-gray-500 mt-1">Envia emails para usuários sem container</p>
      </div>

      {/* Prefixos disponíveis */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-blue-700 mb-2">Prefixos disponíveis:</p>
        <div className="flex flex-wrap gap-2">
          {['{{username}}', '{{email}}', '{{coins}}', '{{link}}'].map(p => (
            <span
              key={p}
              className="bg-blue-100 text-blue-800 text-xs font-mono px-2 py-1 rounded cursor-pointer hover:bg-blue-200"
              onClick={() => setCorpo(prev => prev + p)}
            >
              {p}
            </span>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">Clica num prefixo para inserir no corpo</p>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
          <input
            type="text"
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            placeholder="Ex: Os teus {{coins}} coins estão esperando!"
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Corpo do Email (HTML)</label>
          <textarea
            value={corpo}
            onChange={e => setCorpo(e.target.value)}
            rows={10}
            placeholder={`<h2>Olá {{username}}!</h2>\n<p>Tens <strong>{{coins}} coins</strong> esperando por ti!</p>\n<a href="{{link}}">Começar agora →</a>`}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={salvarTemplate}
          disabled={loading || !assunto || !corpo}
          className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {loading ? 'A salvar...' : '💾 Salvar Template'}
        </button>
      </div>

      {/* Enviar */}
      <div className="bg-white rounded-lg shadow p-6">
  <h3 className="font-semibold text-gray-800 mb-2">Enviar Campanha</h3>
  <p className="text-sm text-gray-500 mb-4">
    Vai enviar o template acima para o grupo selecionado.
  </p>

  {/* Seletor de grupo */}
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Enviar para
    </label>
    <div className="space-y-2">
      {grupos.map(g => (
        <label
          key={g.id}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
            tipo === g.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="tipo"
            value={g.id}
            checked={tipo === g.id}
            onChange={() => setTipo(g.id)}
            className="text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">{g.label}</span>
        </label>
      ))}
    </div>
  </div>

  {erro && (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
      {erro}
    </div>
  )}

  {resultado && (
    <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
      ✅ {resultado.enviados} emails enviados! {resultado.erros > 0 && `(${resultado.erros} erros)`}
    </div>
  )}

  <button
    onClick={enviarCampanha}
    disabled={loading || !assunto || !corpo}
    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
  >
    {loading ? 'A enviar...' : '🚀 Enviar Campanha'}
  </button>
</div>
    </div>
  );
};
