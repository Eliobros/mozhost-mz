"use client"

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = 'https://api.mozhost.topaziocoin.online/api/admin';

const AdminPanel = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    plan: '',
    status: '',
    verified: ''
  });

  const fetchStats = async (password: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stats?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      } else {
        alert(data.error || 'Erro ao buscar estatísticas');
      }
    } catch (e) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (password: string) => {
    try {
      setLoading(true);
      let url = `${API_BASE}/users?password=${encodeURIComponent(password)}`;
      if (filters.search) url += `&search=${filters.search}`;
      if (filters.plan) url += `&plan=${filters.plan}`;
      if (filters.verified) url += `&verified=${filters.verified}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      } else {
        alert(data.error || 'Erro ao buscar usuários');
      }
    } catch (e) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const fetchContainers = async (password: string) => {
    try {
      setLoading(true);
      let url = `${API_BASE}/containers?password=${encodeURIComponent(password)}`;
      if (filters.status) url += `&status=${filters.status}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setContainers(data.containers);
      } else {
        alert(data.error || 'Erro ao buscar containers');
      }
    } catch (e) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoins = async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/coins/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}\nNovo saldo: ${data.user.coins} coins`);
        setModal(null);
        if (currentPage === 'users') fetchUsers(formData.password);
      } else {
        alert('❌ ' + (data.error || 'Erro ao adicionar coins'));
      }
    } catch (e) {
      alert('Erro de conexão');
    }
  };

  const handleRemoveCoins = async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/coins/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}\nNovo saldo: ${data.user.coins} coins`);
        setModal(null);
        if (currentPage === 'users') fetchUsers(formData.password);
      } else {
        alert('❌ ' + (data.error || data.message || 'Erro ao remover coins'));
      }
    } catch (e) {
      alert('Erro de conexão');
    }
  };

  const handleUpdatePlan = async (userId, plan, password) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        setModal(null);
        fetchUsers(password);
      } else {
        alert('❌ ' + (data.error || 'Erro ao atualizar plano'));
      }
    } catch (e) {
      alert('Erro de conexão');
    }
  };

  const handleToggleStatus = async (userId, isActive, password) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        setModal(null);
        fetchUsers(password);
      } else {
        alert('❌ ' + (data.error || 'Erro ao atualizar status'));
      }
    } catch (e) {
      alert('Erro de conexão');
    }
  };

  const Sidebar = () => (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">🚀 MozHost Admin</h1>
      <nav className="space-y-2">
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'users', label: '👥 Usuários' },
          { id: 'containers', label: '🐳 Containers' },
          { id: 'coins', label: '💰 Coins' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full text-left p-3 rounded transition ${
              currentPage === item.id 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );

  const StatsCard = ({ title, value, icon, color }) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  const Dashboard = () => {
    const [password, setPassword] = useState('');

    useEffect(() => {
      if (password) fetchStats(password);
    }, [password]);

    if (!password) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4">🔐 Autenticação Admin</h2>
            <input
              type="password"
              placeholder="Senha do administrador"
              className="w-full p-3 border rounded mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') setPassword(e.target.value);
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousSibling;
                setPassword(input.value);
              }}
              className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
            >
              Entrar
            </button>
          </div>
        </div>
      );
    }

    if (!stats) return <div className="p-8">Carregando...</div>;

    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Usuários por Plano</h3>
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

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Containers por Status</h3>
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

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Uso de Recursos</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-500">CPU Total</p>
              <p className="text-2xl font-bold">{stats.resources.cpu.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">RAM Total (MB)</p>
              <p className="text-2xl font-bold">{stats.resources.ram}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Storage (MB)</p>
              <p className="text-2xl font-bold">{stats.resources.storage}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Users = () => {
    const [password, setPassword] = useState('');

    useEffect(() => {
      if (password) fetchUsers(password);
    }, [password, filters]);

    if (!password) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4">🔐 Autenticação Admin</h2>
            <input
              type="password"
              placeholder="Senha do administrador"
              className="w-full p-3 border rounded mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') setPassword(e.target.value);
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousSibling;
                setPassword(input.value);
              }}
              className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
            >
              Entrar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6">Gerenciar Usuários</h2>
        
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Buscar username/email"
              className="p-2 border rounded"
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
            <select 
              className="p-2 border rounded"
              onChange={(e) => setFilters({...filters, plan: e.target.value})}
            >
              <option value="">Todos os planos</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
            <select 
              className="p-2 border rounded"
              onChange={(e) => setFilters({...filters, verified: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="true">Verificados</option>
              <option value="false">Não verificados</option>
            </select>
            <button
              onClick={() => fetchUsers(password)}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Username</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Plano</th>
                <th className="p-3 text-left">Coins</th>
                <th className="p-3 text-left">Containers</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{user.id}</td>
                  <td className="p-3 font-semibold">{user.username}</td>
                  <td className="p-3 text-sm text-gray-600">{user.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.plan === 'pro' ? 'bg-purple-100 text-purple-800' :
                      user.plan === 'basic' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-yellow-600">{user.coins}</td>
                  <td className="p-3">{user.containerCount}</td>
                  <td className="p-3">
                    {user.isActive ? '✅ Ativo' : '❌ Inativo'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModal({ type: 'addCoins', user, password })}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                        title="Adicionar coins"
                      >
                        ➕
                      </button>
                      <button
                        onClick={() => setModal({ type: 'removeCoins', user, password })}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        title="Remover coins"
                      >
                        ➖
                      </button>
                      <button
                        onClick={() => setModal({ type: 'changePlan', user, password })}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        title="Mudar plano"
                      >
                        📊
                      </button>
                      <button
                        onClick={() => setModal({ type: 'toggleStatus', user, password })}
                        className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
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
      </div>
    );
  };

  const Containers = () => {
    const [password, setPassword] = useState('');

    useEffect(() => {
      if (password) fetchContainers(password);
    }, [password, filters]);

    if (!password) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4">🔐 Autenticação Admin</h2>
            <input
              type="password"
              placeholder="Senha do administrador"
              className="w-full p-3 border rounded mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') setPassword(e.target.value);
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousSibling;
                setPassword(input.value);
              }}
              className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
            >
              Entrar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6">Gerenciar Containers</h2>
        
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select 
              className="p-2 border rounded"
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos os status</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="error">Error</option>
              <option value="building">Building</option>
            </select>
            <button
              onClick={() => fetchContainers(password)}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Usuário</th>
                <th className="p-3 text-left">CPU</th>
                <th className="p-3 text-left">RAM (MB)</th>
                <th className="p-3 text-left">Storage (MB)</th>
                <th className="p-3 text-left">Domínio</th>
              </tr>
            </thead>
            <tbody>
              {containers.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      c.type === 'nodejs' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      c.status === 'running' ? 'bg-green-100 text-green-800' :
                      c.status === 'stopped' ? 'bg-gray-100 text-gray-800' :
                      c.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">
                      <div className="font-semibold">{c.user.username}</div>
                      <div className="text-gray-500 text-xs">{c.user.email}</div>
                    </div>
                  </td>
                  <td className="p-3">{c.cpuLimit}</td>
                  <td className="p-3">{c.memoryLimitMb}</td>
                  <td className="p-3">{c.storageUsedMb}</td>
                  <td className="p-3">
                    {c.domain && (
                      <a 
                        href={`https://${c.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        {c.domain}
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const Coins = () => {
    const [password, setPassword] = useState('');
    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
      if (password) {
        fetch(`${API_BASE}/users?password=${encodeURIComponent(password)}`)
          .then(res => res.json())
          .then(data => {
            if (data.users) setAllUsers(data.users);
          });
      }
    }, [password]);

    if (!password) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4">🔐 Autenticação Admin</h2>
            <input
              type="password"
              placeholder="Senha do administrador"
              className="w-full p-3 border rounded mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') setPassword(e.target.value);
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousSibling;
                setPassword(input.value);
              }}
              className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
            >
              Entrar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6">Gerenciar Coins</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4 text-green-600">➕ Adicionar Coins</h3>
            <button
              onClick={() => setModal({ type: 'addCoins', password, users: allUsers })}
              className="w-full bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 text-lg font-semibold"
            >
              💰 Adicionar Coins a um Usuário
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">➖ Remover Coins</h3>
            <button
              onClick={() => setModal({ type: 'removeCoins', password, users: allUsers })}
              className="w-full bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 text-lg font-semibold"
            >
              ⚠️ Remover Coins de um Usuário
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-xl font-bold">Lista de Usuários e Coins</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Username</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Coins</th>
                  <th className="p-3 text-left">Plano</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(user => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-semibold">{user.username}</td>
                    <td className="p-3 text-sm text-gray-600">{user.email}</td>
                    <td className="p-3 font-bold text-yellow-600 text-lg">{user.coins}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
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
        </div>
      </div>
    );
  };

  const Modal = () => {
    if (!modal) return null;

    const [formData, setFormData] = useState({
      username: modal.user?.username || '',
      amount: '',
      password: modal.password || '',
      plan: modal.user?.plan || 'free',
      isActive: modal.user?.isActive ?? true,
      useDropdown: true
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (modal.type === 'addCoins') {
        handleAddCoins(formData);
      } else if (modal.type === 'removeCoins') {
        handleRemoveCoins(formData);
      } else if (modal.type === 'changePlan') {
        handleUpdatePlan(modal.user.id, formData.plan, formData.password);
      } else if (modal.type === 'toggleStatus') {
        handleToggleStatus(modal.user.id, formData.isActive, formData.password);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-screen overflow-y-auto">
          <h3 className="text-2xl font-bold mb-4">
            {modal.type === 'addCoins' && '💰 Adicionar Coins'}
            {modal.type === 'removeCoins' && '⚠️ Remover Coins'}
            {modal.type === 'changePlan' && '📊 Mudar Plano'}
            {modal.type === 'toggleStatus' && '🔄 Alterar Status'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            {(modal.type === 'addCoins' || modal.type === 'removeCoins') && (
              <>
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.useDropdown}
                      onChange={(e) => setFormData({...formData, useDropdown: e.target.checked, username: ''})}
                    />
                    Usar lista de usuários
                  </label>

                  {formData.useDropdown ? (
                    <select
                      className="w-full p-3 border rounded"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                    >
                      <option value="">Selecione um usuário</option>
                      {(modal.users || []).map(u => (
                        <option key={u.id} value={u.username}>
                          {u.username} ({u.coins} coins)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Digite o username"
                      className="w-full p-3 border rounded"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Quantidade de Coins</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 500"
                    className="w-full p-3 border rounded"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Senha Admin</label>
                  <input
                    type="password"
                    placeholder="Digite a senha"
                    className="w-full p-3 border rounded"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
              </>
            )}

            {modal.type === 'changePlan' && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Usuário: <strong>{modal.user.username}</strong></p>
                  <p className="text-sm text-gray-600">Plano atual: <strong>{modal.user.plan.toUpperCase()}</strong></p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Novo Plano</label>
                  <div className="space-y-2">
                    {['free', 'basic', 'pro'].map(plan => (
                      <label key={plan} className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="plan"
                          value={plan}
                          checked={formData.plan === plan}
                          onChange={(e) => setFormData({...formData, plan: e.target.value})}
                        />
                        <div>
                          <div className="font-semibold">{plan.toUpperCase()}</div>
                          <div className="text-xs text-gray-500">
                            {plan === 'free' && '2 containers, 512MB RAM'}
                            {plan === 'basic' && '5 containers, 1GB RAM'}
                            {plan === 'pro' && '10 containers, 2GB RAM'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Senha Admin</label>
                  <input
                    type="password"
                    placeholder="Digite a senha"
                    className="w-full p-3 border rounded"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
              </>
            )}

            {modal.type === 'toggleStatus' && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Usuário: <strong>{modal.user.username}</strong></p>
                  <p className="text-sm text-gray-600">Status atual: <strong>{modal.user.isActive ? 'Ativo' : 'Inativo'}</strong></p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Novo Status</label>
                  <select
                    className="w-full p-3 border rounded"
                    value={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                  >
                    <option value="true">✅ Ativo</option>
                    <option value="false">❌ Inativo</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Senha Admin</label>
                  <input
                    type="password"
                    placeholder="Digite a senha"
                    className="w-full p-3 border rounded"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 bg-gray-300 text-gray-700 p-3 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex-1 text-white p-3 rounded font-semibold ${
                  modal.type === 'addCoins' ? 'bg-green-600 hover:bg-green-700' :
                  modal.type === 'removeCoins' ? 'bg-red-600 hover:bg-red-700' :
                  modal.type === 'changePlan' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {modal.type === 'addCoins' && 'Adicionar'}
                {modal.type === 'removeCoins' && 'Remover'}
                {modal.type === 'changePlan' && 'Atualizar'}
                {modal.type === 'toggleStatus' && 'Alterar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'users' && <Users />}
        {currentPage === 'containers' && <Containers />}
        {currentPage === 'coins' && <Coins />}
      </div>
      <Modal />
    </div>
  );
};

export default AdminPanel;
