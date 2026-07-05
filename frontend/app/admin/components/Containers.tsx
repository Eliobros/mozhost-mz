'use client';
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';

interface ContainersProps { password: string; }
interface Container { id: number; name: string; type: string; status: string; cpuLimit: number; memoryLimitMb: number; storageUsedMb: number; domain?: string; user: { username: string; email: string; }; }

export const Containers: React.FC<ContainersProps> = ({ password }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadContainers = async () => {
    try { setLoading(true); setError('');
      const data = await adminAPI.fetchContainers(password, statusFilter);
      setContainers(data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadContainers(); }, [password, statusFilter]);

  const statusBadge = (s: string) => ({ running: 'bg-green-100 text-green-800', stopped: 'bg-gray-100 text-gray-800', error: 'bg-red-100 text-red-800', building: 'bg-yellow-100 text-yellow-800' }[s] || 'bg-gray-100 text-gray-800');
  const typeBadge = (t: string) => t === 'nodejs' ? 'bg-green-100 text-green-800' : t === 'python' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Gerenciar Containers</h2>
        <p className="text-gray-600 mt-1 text-sm">Total: {containers.length} containers</p>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <select className="flex-1 p-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="running">🟢 Running</option>
            <option value="stopped">⚫ Stopped</option>
            <option value="error">🔴 Error</option>
          </select>
          <button onClick={loadContainers} disabled={loading} className="bg-blue-600 text-white p-2.5 rounded hover:bg-blue-700 transition font-semibold disabled:opacity-50 text-sm">
            {loading ? '⏳' : '🔄'} Atualizar
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">❌ {error}</div>}

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {containers.map(c => (
          <div key={c.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-800 truncate flex-1">{c.name}</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(c.status)}`}>{c.status}</span>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge(c.type)}`}>{c.type}</span>
              <span className="text-xs text-gray-500">👤 {c.user.username}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-50 rounded p-2"><div className="text-gray-500">CPU</div><div className="font-bold">{c.cpuLimit}</div></div>
              <div className="bg-gray-50 rounded p-2"><div className="text-gray-500">RAM</div><div className="font-bold">{c.memoryLimitMb}MB</div></div>
              <div className="bg-gray-50 rounded p-2"><div className="text-gray-500">Storage</div><div className="font-bold">{c.storageUsedMb}MB</div></div>
            </div>
            {c.domain && <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="block mt-2 text-xs text-blue-600 hover:underline truncate">🌐 {c.domain}</a>}
          </div>
        ))}
        {containers.length === 0 && !loading && <div className="text-center py-8 text-gray-500"><p className="text-xl">📦</p><p className="mt-2">Nenhum container encontrado</p></div>}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100"><tr>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">Nome</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">Tipo</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">Usuário</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">CPU</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">RAM</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">Storage</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600">Domínio</th>
            </tr></thead>
            <tbody>
              {containers.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-800">{c.name}</td>
                  <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeBadge(c.type)}`}>{c.type}</span></td>
                  <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(c.status)}`}>{c.status}</span></td>
                  <td className="p-3"><div className="text-sm font-semibold text-gray-800">{c.user.username}</div><div className="text-xs text-gray-500">{c.user.email}</div></td>
                  <td className="p-3 text-gray-700">{c.cpuLimit}</td>
                  <td className="p-3 text-gray-700">{c.memoryLimitMb}</td>
                  <td className="p-3 text-gray-700">{c.storageUsedMb}</td>
                  <td className="p-3">{c.domain ? <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">{c.domain} ↗</a> : <span className="text-gray-400">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {containers.length === 0 && !loading && <div className="text-center py-12 text-gray-500"><p className="text-xl">📦</p><p className="mt-2">Nenhum container encontrado</p></div>}
      </div>
    </div>
  );
};
