'use client';
import React, { useState, useEffect } from 'react';
import { API_ROOT } from '../utils/api';

interface SupportAgentsProps {
  password: string;
}

interface FeedbackItem {
  ticket_id: number;
  user_id: number;
  rating: number;
  sentiment: string | null;
  summary: string | null;
  text: string | null;
  at: string;
}

interface AgentReport {
  agent_phone: string;
  agent_name: string;
  tickets_total: number;
  tickets_waiting: number;
  tickets_active: number;
  tickets_closed: number;
  tickets_cancelled: number;
  avg_rating: number | null;
  rating_count: number;
  recent_feedback: FeedbackItem[];
}

interface Summary {
  total_agents: number;
  tickets_waiting_total: number;
  tickets_active_total: number;
  tickets_closed_total: number;
  tickets_cancelled_total: number;
  tickets_in_queue: number;
}

interface ReportsPayload {
  agents: AgentReport[];
  summary: Summary;
}

const SENTIMENT_LABELS: Record<string, { label: string; cls: string }> = {
  muito_positivo: { label: '😍 Muito positivo', cls: 'bg-green-100 text-green-800 border-green-200' },
  positivo:       { label: '😊 Positivo',       cls: 'bg-green-50 text-green-700 border-green-200' },
  neutro:         { label: '😐 Neutro',         cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  negativo:       { label: '😟 Negativo',       cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  muito_negativo: { label: '😡 Muito negativo', cls: 'bg-red-100 text-red-800 border-red-200' },
};

const Star: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 14 }) => (
  <span style={{ color: filled ? '#f59e0b' : '#cbd5e1', fontSize: size, lineHeight: 1 }}>★</span>
);

const renderStars = (rating: number, size = 14) => (
  <span style={{ display: 'inline-flex', gap: '2px' }}>
    {[1, 2, 3, 4, 5].map(n => <Star key={n} filled={n <= Math.round(rating)} size={size} />)}
  </span>
);

export const SupportAgents: React.FC<SupportAgentsProps> = ({ password }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `${API_ROOT}/api/admin/support/agents/reports?password=${encodeURIComponent(password)}`;
      const res = await fetch(url, { headers: { 'x-admin-password': password } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Atualiza a cada 60s para o admin ter uma visão "live".
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-500">A carregar relatórios de suporte...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <div className="font-semibold mb-1">❌ Erro ao carregar</div>
          <div className="text-sm">{error}</div>
          <button
            onClick={fetchData}
            className="mt-3 underline text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { agents, summary } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🎧 Agentes de Suporte</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Relatórios de tickets por agente e avaliações recebidas
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Atualizado às {lastUpdated.toLocaleTimeString('pt-PT')} · auto-refresh a cada 60s
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50"
        >
          {loading ? '⏳ A atualizar...' : '🔄 Atualizar'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SummaryCard icon="👥" label="Agentes" value={summary.total_agents} color="gray" />
        <SummaryCard icon="⏳" label="Em fila (sem agente)" value={summary.tickets_in_queue} color="orange" />
        <SummaryCard icon="🟡" label="Em espera" value={summary.tickets_waiting_total} color="yellow" />
        <SummaryCard icon="💬" label="Em curso" value={summary.tickets_active_total} color="green" />
        <SummaryCard icon="✅" label="Encerrados" value={summary.tickets_closed_total} color="blue" />
        <SummaryCard icon="❌" label="Cancelados" value={summary.tickets_cancelled_total} color="red" />
      </div>

      {agents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          <div className="text-3xl mb-3">👥</div>
          <div className="font-medium">Nenhum agente configurado ainda.</div>
          <p className="text-xs mt-2">
            Define o env <code className="bg-gray-100 px-1 rounded">SUPPORT_AGENT_NUMBERS</code> ou
            insere linhas em <code className="bg-gray-100 px-1 rounded">support_agents</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(a => <AgentCard key={a.agent_phone} agent={a} />)}
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ icon: string; label: string; value: number; color: string }> = ({ icon, label, value, color }) => {
  const palette: Record<string, string> = {
    gray: 'border-gray-200',
    orange: 'border-orange-200',
    yellow: 'border-yellow-200',
    green: 'border-green-200',
    blue: 'border-blue-200',
    red: 'border-red-200',
  };
  const textColors: Record<string, string> = {
    gray: 'text-gray-700',
    orange: 'text-orange-700',
    yellow: 'text-yellow-700',
    green: 'text-green-700',
    blue: 'text-blue-700',
    red: 'text-red-700',
  };
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${palette[color]} p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${textColors[color]}`}>{value}</div>
    </div>
  );
};

const AgentCard: React.FC<{ agent: AgentReport }> = ({ agent }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      {/* Identity */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-800 truncate">🎧 {agent.agent_name}</h3>
          <div className="text-xs text-gray-400 font-mono truncate">{agent.agent_phone}</div>
        </div>
        {agent.avg_rating != null ? (
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 justify-end">
              {renderStars(agent.avg_rating)}
              <span className="font-bold text-gray-800 text-sm">{agent.avg_rating.toFixed(1)}</span>
            </div>
            <div className="text-xs text-gray-500">
              {agent.rating_count} avaliação{agent.rating_count !== 1 ? 'ões' : ''}
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">Sem avaliações</span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatBox icon="🟡" label="Em espera"   value={agent.tickets_waiting}   palette="bg-yellow-50 border-yellow-200 text-yellow-700" />
        <StatBox icon="💬" label="Em curso"    value={agent.tickets_active}    palette="bg-green-50 border-green-200 text-green-700" />
        <StatBox icon="✅" label="Encerrados"  value={agent.tickets_closed}    palette="bg-blue-50 border-blue-200 text-blue-700" />
        <StatBox icon="❌" label="Cancelados" value={agent.tickets_cancelled} palette="bg-gray-50 border-gray-200 text-gray-700" />
      </div>

      <div className="text-xs text-gray-500 border-t pt-2 mb-3">
        Total tickets: <span className="font-bold text-gray-700">{agent.tickets_total}</span>
      </div>

      {/* Feedback */}
      {agent.recent_feedback.length > 0 ? (
        <div className="border-t pt-3">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <span>⭐</span>
            <span>Últimas avaliações</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {agent.recent_feedback.map(f => (
              <FeedbackRow key={f.ticket_id} feedback={f} />
            ))}
          </div>
        </div>
      ) : agent.rating_count > 0 ? (
        <div className="border-t pt-3 text-xs text-gray-400 italic">
          Sem avaliações detalhadas (apenas a nota).
        </div>
      ) : (
        <div className="border-t pt-3 text-xs text-gray-400 italic">
          Sem avaliações ainda.
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ icon: string; label: string; value: number; palette: string }> = ({ icon, label, value, palette }) => (
  <div className={`border rounded-lg p-2 ${palette}`}>
    <div className="text-xs flex items-center gap-1">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
    <div className="text-xl font-bold mt-0.5">{value}</div>
  </div>
);

const FeedbackRow: React.FC<{ feedback: FeedbackItem }> = ({ feedback }) => {
  const sentInfo = feedback.sentiment ? SENTIMENT_LABELS[feedback.sentiment] : null;
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
      <div className="flex items-center flex-wrap gap-2 mb-1">
        {renderStars(feedback.rating, 12)}
        <span className={`text-xs px-1.5 py-0.5 rounded border ${sentInfo?.cls || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
          {sentInfo?.label || feedback.sentiment || '—'}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          #{feedback.ticket_id} · {new Date(feedback.at).toLocaleDateString('pt-PT')}
        </span>
      </div>
      {feedback.summary && (
        <div className="text-xs text-gray-700 italic mb-1">"{feedback.summary}"</div>
      )}
      {feedback.text && (
        <div className="text-xs text-gray-600 break-words">
          💬 {feedback.text.length > 140 ? feedback.text.slice(0, 140) + '…' : feedback.text}
        </div>
      )}
    </div>
  );
};
