// admin/components/Coins.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';

interface CoinsProps {
  password: string;
  onOpenModal: (modal: any) => void;
}

interface User {
  id: number;
  username: string;
  email: string;
  coins: number;
  plan: string;
}

export const Coins: React.FC<CoinsProps> = ({ password, onOpenModal }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await adminAPI.fetchUsers(password);
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [password]);

  const totalCoins = users.reduce((sum, user) => sum + user.coins, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciar Coins</h2>
        <p className="text-gray-600 mt-1">Total de coins no sistema: <span className="font-bold text-yellow-600">{totalCoins}</span></p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <h3 className="text-xl font-bold mb-3 text-green-800 flex items-center gap-2">
            <span className="text-2xl">➕</span>
            Adicionar Coins
          </h3>
          <p className="text-sm text-green-700 mb-4">
            Creditar coins para um usuário específico
          </p>
          <button
            onClick={() => onOpenModal({ type: 'addCoins', password, users })}
            className="w-full bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition text-lg font-semibold shadow"
          >
            💰 Adicionar Coins a um Usuário
          </button>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <h3 className="text-xl font-bold mb-3 text-red-800 flex items-center gap-2">
            <span className="text-2xl">➖</span>
            Remover Coins
          </h3>
          <p className="text-sm text-red-700 mb-4">
            Debitar coins de um usuário específico
          </p>
          <button
            onClick={() => onOpenModal({ type: 'removeCoins', password, users })}
            className="w-full bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 transition text-lg font-semibold shadow"
          >
            ⚠️ Remover Coins de um Usuário
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-100 border-b">
          <h3 className="text-xl font-bold text-gray-800">Lista de Usuários e Coins</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Username</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Email</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Coins</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Plano</th>
              </tr>
            </thead>
            <tbody>
              {users
                .sort((a, b) => b.coins - a.coins)
                .map(user => (
                <tr key={user.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 font-semibold text-gray-800">{user.username}</td>
                  <td className="p-3 text-sm text-gray-600">{user.email}</td>
                  <td className="p-3">
                    <span className="font-bold text-yellow-600 text-lg">
                      {user.coins} 💰
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.plan === 'pro' ? 'bg-purple-100 text-purple-800' :
                      user.plan === 'basic' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">💰</p>
            <p className="mt-2">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
