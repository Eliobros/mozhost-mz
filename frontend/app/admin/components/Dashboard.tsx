// admin/components/Dashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { adminAPI } from '../utils/api';

interface DashboardProps {
  password: string;
}

interface Stats {
  users: {
    total: number;
    active: number;
    byPlan: Array<{ plan: string; count: number }>;
  };
  containers: {
    running: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  coins: {
    total: number;
  };
  resources: {
    cpu: number;
    ram: number;
    storage: number;
  };
}

const StatsCard = ({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) => (
  <div className={`bg-white rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 border-l-4 ${color} transform transition hover:scale-105`}>
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-gray-500 text-xs sm:text-sm font-medium truncate">{title}</p>
        <p className="text-lg sm:text-2xl lg:text-3xl font-bold mt-1 sm:mt-2 text-gray-800">{value}</p>
      </div>
      <div className="text-2xl sm:text-4xl lg:text-5xl opacity-80 ml-2 flex-shrink-0">{icon}</div>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ password }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await adminAPI.fetchStats(password);
        setStats(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [password]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-600 mt-1">Visão geral do sistema MozHost</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <StatsCard
          title="Total Usuários"
          value={stats.users.total}
          icon="👥"
          color="border-blue-500"
        />
        <StatsCard
          title="Usuários Ativos"
          value={stats.users.active}
          icon="✅"
          color="border-green-500"
        />
        <StatsCard
          title="Containers Rodando"
          value={stats.containers.running}
          icon="🐳"
          color="border-purple-500"
        />
        <StatsCard
          title="Total Coins"
          value={stats.coins.total.toFixed(2)}
          icon="💰"
          color="border-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Usuários por Plano</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.users.byPlan}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plan" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Containers por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.containers.byStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Uso de Recursos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-600 font-medium">CPU Total</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mt-2">{stats.resources.cpu.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-gray-600 font-medium">RAM Total (MB)</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 mt-2">{stats.resources.ram}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-gray-600 font-medium">Storage (MB)</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mt-2">{stats.resources.storage}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
