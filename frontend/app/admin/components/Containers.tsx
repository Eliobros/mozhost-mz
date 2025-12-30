// admin/components/Containers.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';

interface ContainersProps {
  password: string;
}

interface Container {
  id: number;
  name: string;
  type: string;
  status: string;
  cpuLimit: number;
  memoryLimitMb: number;
  storageUsedMb: number;
  domain?: string;
  user: {
    username: string;
    email: string;
  };
}

export const Containers: React.FC<ContainersProps> = ({ password }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadContainers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminAPI.fetchContainers(password, statusFilter);
      setContainers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContainers();
  }, [password, statusFilter]);

  const getStatusBadge = (status: string) => {
    const badges = {
      running: 'bg-green-100 text-green-800',
      stopped: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      building: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciar Containers</h2>
        <p className="text-gray-600 mt-1">Total: {containers.length} containers</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="running">🟢 Running</option>
            <option value="stopped">⚫ Stopped</option>
            <option value="error">🔴 Error</option>
            <option value="building">🟡 Building</option>
          </select>
          <button
            onClick={loadContainers}
            disabled={loading}
            className="bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition font-semibold disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'} Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Nome</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Tipo</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Usuário</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">CPU</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">RAM (MB)</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Storage (MB)</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Domínio</th>
              </tr>
            </thead>
            <tbody>
              {containers.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 font-semibold text-gray-800">{c.name}</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      c.type === 'nodejs' ? 'bg-green-100 text-green-800' : 
                      c.type === 'python' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-800">{c.user.username}</div>
                      <div className="text-gray-500 text-xs">{c.user.email}</div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-700">{c.cpuLimit}</td>
                  <td className="p-3 text-gray-700">{c.memoryLimitMb}</td>
                  <td className="p-3 text-gray-700">{c.storageUsedMb}</td>
                  <td className="p-3">
                    {c.domain ? (
                      <a
                        href={`https://${c.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        {c.domain}
                        <span className="text-xs">↗</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {containers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">📦</p>
            <p className="mt-2">Nenhum container encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
