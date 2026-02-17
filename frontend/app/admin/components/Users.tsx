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
  const [filters, setFilters] = useState({ search: '', plan: '', verified: '' });

  const loadUsers = async () => {
    try { setLoading(true); setError('');
      const data = await adminAPI.fetchUsers(password, filters);
      setUsers(data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, [password, filters]);

  const planBadge = (plan: string) =>
    plan === 'pro' ? 'bg-purple-100 text-purple-800' :
    plan === 'basic' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';

  const ActionButtons = ({ user: u }: { user: User }) => (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => onOpenModal({ type: 'addCoins', user: u, password })} className="text-xs bg-green-500 text-white px-2 py-1.5 rounded hover:bg-green-600 font-medium">➕ Coins</button>
      <button onClick={() => onOpenModal({ type: 'removeCoins', user: u, password })} className="text-xs bg-red-500 text-white px-2 py-1.5 rounded hover:bg-red-600 font-medium">➖ Coins</button>
      <button onClick={() => onOpenModal({ type: 'changePlan', user: u, password })} className="text-xs bg-blue-500 text-white px-2 py-1.5 rounded hover:bg-blue-600 font-medium">📊 Plano</button>
      <button onClick={() => onOpenModal({ type: 'toggleStatus', user: u, password })} className="text-xs bg-yellow-500 text-white px-2 py-1.5 rounded hover:bg-yellow-600 font-medium">🔄</button>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Gerenciar Usuários</h2>
        <p className="text-gray-600 mt-1 text-sm">Total: {users.length} usuários</p>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <input type="text" placeholder="🔍 Buscar username/email" className="p-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
          <select className="p-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={filters.plan} onChange={(e) => setFilters({...filters, plan: e.target.value})}>
            <option value="">Todos os planos</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
          <select className="p-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={filters.verified} onChange={(e) => setFilters({...filters, verified: e.target.value})}>
            <option value="">Todos</option>
            <option value="true">Verificados</option>
            <option value="false">Não verificados</option>
          </select>
          <button onClick={loadUsers} disabled={loading} className="bg-blue-600 text-white p-2.5 rounded hover:bg-blue-700 transition font-semibold disabled:opacity-50 text-sm">
            {loading ? '⏳' : '🔄'} Atualizar
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">❌ {error}</div>}

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-800 truncate">{u.username}</div>
                <div className="text-xs text-gray-500 truncate">{u.email}</div>
              </div>
              <span className={`ml-2 text-sm ${u.isActive ? 'text-green-600' : 'text-red-600'}`}>{u.isActive ? '✅' : '❌'}</span>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planBadge(u.plan)}`}>{u.plan.toUpperCase()}</span>
              <span className="text-xs text-yellow-600 font-bold">{u.coins} 💰</span>
              <span className="text-xs text-gray-500">{u.containerCount} 🐳</span>
            </div>
            <ActionButtons user={u} />
          </div>
        ))}
        {users.length === 0 && !loading && <div className="text-center py-8 text-gray-500"><p className="text-xl">📭</p><p className="mt-2">Nenhum usuário encontrado</p></div>}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
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
              {users.map(u => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-gray-600">{u.id}</td>
                  <td className="p-3 font-semibold text-gray-800">{u.username}</td>
                  <td className="p-3 text-sm text-gray-600">{u.email}</td>
                  <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${planBadge(u.plan)}`}>{u.plan.toUpperCase()}</span></td>
                  <td className="p-3 font-bold text-yellow-600">{u.coins}</td>
                  <td className="p-3 text-gray-700">{u.containerCount}</td>
                  <td className="p-3"><span className={u.isActive ? 'text-green-600' : 'text-red-600'}>{u.isActive ? '✅ Ativo' : '❌ Inativo'}</span></td>
                  <td className="p-3"><ActionButtons user={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && !loading && <div className="text-center py-12 text-gray-500"><p className="text-xl">📭</p><p className="mt-2">Nenhum usuário encontrado</p></div>}
      </div>
    </div>
  );
};
