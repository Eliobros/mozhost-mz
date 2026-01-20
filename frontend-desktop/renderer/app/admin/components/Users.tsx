// admin/components/Users.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';

interface UsersProps {
  password: string;
  onOpenModal: (modal: any) => void;
}

interface User {
  id: number;
  username: string;
  email: string;
  plan: string;
  coins: number;
  containerCount: number;
  isActive: boolean;
}

export const Users: React.FC<UsersProps> = ({ password, onOpenModal }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    plan: '',
    verified: ''
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminAPI.fetchUsers(password, filters);
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [password, filters]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciar Usuários</h2>
        <p className="text-gray-600 mt-1">Total: {users.length} usuários</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="🔍 Buscar username/email"
            className="p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
          <select
            className="p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.plan}
            onChange={(e) => setFilters({...filters, plan: e.target.value})}
          >
            <option value="">Todos os planos</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
          <select
            className="p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.verified}
            onChange={(e) => setFilters({...filters, verified: e.target.value})}
          >
            <option value="">Todos</option>
            <option value="true">Verificados</option>
            <option value="false">Não verificados</option>
          </select>
          <button
            onClick={loadUsers}
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
                <th className="p-3 text-left text-sm font-semibold text-gray-600">ID</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Username</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Email</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Plano</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Coins</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Containers</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 text-gray-600">{user.id}</td>
                  <td className="p-3 font-semibold text-gray-800">{user.username}</td>
                  <td className="p-3 text-sm text-gray-600">{user.email}</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.plan === 'pro' ? 'bg-purple-100 text-purple-800' :
                      user.plan === 'basic' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-yellow-600">{user.coins}</td>
                  <td className="p-3 text-gray-700">{user.containerCount}</td>
                  <td className="p-3">
                    <span className={`flex items-center gap-1 ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {user.isActive ? '✅ Ativo' : '❌ Inativo'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onOpenModal({ type: 'addCoins', user, password })}
                        className="text-xs bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 transition font-medium"
                        title="Adicionar coins"
                      >
                        ➕ Coins
                      </button>
                      <button
                        onClick={() => onOpenModal({ type: 'removeCoins', user, password })}
                        className="text-xs bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition font-medium"
                        title="Remover coins"
                      >
                        ➖ Coins
                      </button>
                      <button
                        onClick={() => onOpenModal({ type: 'changePlan', user, password })}
                        className="text-xs bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition font-medium"
                        title="Mudar plano"
                      >
                        📊 Plano
                      </button>
                      <button
                        onClick={() => onOpenModal({ type: 'toggleStatus', user, password })}
                        className="text-xs bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 transition font-medium"
                        title="Ativar/Desativar"
                      >
                        🔄
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">📭</p>
            <p className="mt-2">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
