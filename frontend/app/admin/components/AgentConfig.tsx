'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_ROOT } from '../utils/api';

interface AgentConfigProps {
  password: string;
}

interface Agent {
  id: number;
  name: string;
  number: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

type FormState = { name: string; number: string };

const EMPTY_FORM: FormState = { name: '', number: '' };

export const AgentConfig: React.FC<AgentConfigProps> = ({ password }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Formulário
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    'x-admin-password': password,
  });

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_ROOT}/api/agents`, {
        headers: { 'x-admin-password': password },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAgents(json.agents || []);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const startEdit = (a: Agent) => {
    setEditingId(a.id);
    setForm({ name: a.name, number: a.number });
    setNotice('');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const isEdit = editingId !== null;
      const res = await fetch(isEdit ? `${API_ROOT}/api/agents/${editingId}` : `${API_ROOT}/api/agents`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setNotice(isEdit ? `✅ Agente "${json.agent.name}" atualizado` : `✅ Agente "${json.agent.name}" criado`);
      cancelEdit();
      await fetchAgents();
    } catch (e: any) {
      setError(e.message || 'Erro ao guardar agente');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Agent) => {
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${API_ROOT}/api/agents/${a.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ active: !a.active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setNotice(`✅ ${json.agent.name} ${json.agent.active ? 'ativado' : 'desativado'}`);
      await fetchAgents();
    } catch (e: any) {
      setError(e.message || 'Erro ao alterar estado');
    }
  };

  const handleDelete = async (a: Agent) => {
    if (!window.confirm(`Deletar o agente "${a.name}" (${a.number})?\n\nEsta ação não pode ser desfeita.`)) return;
    setDeletingId(a.id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${API_ROOT}/api/agents/${a.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setNotice(`🗑️ Agente "${a.name}" removido`);
      if (editingId === a.id) cancelEdit();
      await fetchAgents();
    } catch (e: any) {
      setError(e.message || 'Erro ao deletar agente');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">⚙️ Config. Agentes</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Agentes de suporte reconhecidos pelo bot WhatsApp. Geridos aqui (banco de dados) —
          não precisa de editar o <code className="bg-gray-100 px-1 rounded">.env</code>.
        </p>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
          ❌ {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">
          {notice}
        </div>
      )}

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6"
      >
        <h3 className="font-semibold text-gray-800 mb-4">
          {editingId !== null ? '✏️ Editar agente' : '➕ Novo agente'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: João Suporte"
              maxLength={100}
              required
              minLength={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Número WhatsApp
            </label>
            <input
              type="tel"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              placeholder="258841234567 (ou 841234567)"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? '⏳ A guardar...' : editingId !== null ? '💾 Guardar' : '➕ Criar'}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          O número é normalizado automaticamente (aceita +258, 258, 84… e é guardado com DDI).
        </p>
      </form>

      {/* Lista */}
      {loading && agents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          A carregar agentes...
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          <div className="text-3xl mb-3">🎧</div>
          <div className="font-medium">Nenhum agente cadastrado ainda.</div>
          <p className="text-xs mt-2">Cria o primeiro com o formulário acima.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-lg shadow-sm border p-4 flex items-center gap-4 flex-wrap ${
                a.active ? 'border-gray-200' : 'border-gray-200 opacity-70'
              }`}
            >
              {/* Identidade */}
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  🎧 {a.name}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      a.active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}
                  >
                    {a.active ? 'ativo' : 'inativo'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{a.number}</div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(a)}
                  title={a.active ? 'Desativar (deixa de receber tickets)' : 'Ativar'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    a.active
                      ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200'
                      : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                  }`}
                >
                  {a.active ? '⏸️ Desativar' : '▶️ Ativar'}
                </button>
                <button
                  onClick={() => startEdit(a)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={deletingId === a.id}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {deletingId === a.id ? '...' : '🗑️ Deletar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nota */}
      <div className="mt-6 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-sm">
        <div className="font-semibold mb-1">💡 Como funciona</div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>O agente reconhece o ticket tocando nos botões do template ou enviando <code className="bg-blue-100 px-1 rounded">!aceitar #123</code>.</li>
          <li>Agentes <strong>inativos</strong> continuam na lista mas não recebem novos tickets nem comandos.</li>
          <li>As alterações valem imediatamente (o bot atualiza a lista em ~30s).</li>
        </ul>
      </div>
    </div>
  );
};
