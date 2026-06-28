"use client"

// components/DatabasePage.js
import React, { useState, useEffect } from 'react';
import { Database, Copy, ExternalLink, Trash2, Check, AlertCircle, Eye, EyeOff, Plus, RefreshCw, Coins, Link2, Terminal } from 'lucide-react';

const DatabasePage = () => {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [userCoins, setUserCoins] = useState(null);

  // Custo em coins — deve bater com backend/config/constants.js DATABASE_COST_COINS
  const DB_COST_COINS = 5;

  // Form state
  const [formData, setFormData] = useState({
    type: 'mysql',
    name: '',
    database_name: '',
    username: '',
    password: '',
    container: ''
  });

  useEffect(() => {
    loadDatabases();
    loadAuxData();
  }, []);

  const handleDeleteDatabase = async (id, name) => {
    setDeletingId(id);
    try {
      const token = localStorage.getItem('mozhost_token');
      const res = await fetch(`https://api.mozhost.shop/api/databases/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg(`Database "${name}" removido`);
        setTimeout(() => setSuccessMsg(null), 3000);
        await loadDatabases();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Erro ao deletar database');
      }
    } catch (e) {
      setError('Erro de conexão ao deletar');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const insufficientCoins = userCoins !== null && userCoins < DB_COST_COINS;

  const loadDatabases = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('mozhost_token');

      if (!token) {
        setError('Token não encontrado. Faça login novamente.');
        setLoading(false);
        return;
      }

      const response = await fetch('https://api.mozhost.shop/api/databases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setDatabases(data.databases || []);
      } else {
        setError('Erro ao carregar databases.');
      }
    } catch (error) {
      console.error('Erro ao carregar databases:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carrega containers do usuário para o select de vínculo.
  // O saldo de coins será exibido automaticamente se o backend expuser /api/auth/me;
  // caso contrário o card mostra só o custo (sem mentir sobre o saldo).
  const loadAuxData = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      if (!token) return;
      const cRes = await fetch('https://api.mozhost.shop/api/containers', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => null);

      if (cRes && cRes.ok) {
        const cData = await cRes.json();
        setContainers(cData.containers || cData || []);
      }

      // Tenta buscar saldo sem bloquear a UI se falhar
      const uRes = await fetch('https://api.mozhost.shop/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => null);
      if (uRes && uRes.ok) {
        const uData = await uRes.json();
        setUserCoins(uData.coins ?? uData.user?.coins ?? null);
      }
    } catch (_) { /* silencioso - é apenas preview */ }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleCreateDatabase = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.name.trim()) {
      setError('Nome do database é obrigatório');
      return;
    }
    if (!formData.database_name.trim()) {
      setError('Nome do banco de dados é obrigatório');
      return;
    }
    if (!formData.username.trim()) {
      setError('Username é obrigatório');
      return;
    }
    if (!formData.password.trim()) {
      setError('Password é obrigatória');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.shop/api/databases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        await loadDatabases();
        setShowCreateForm(false);
        // Reset form
        setFormData({
          type: 'mysql',
          name: '',
          database_name: '',
          username: '',
          password: ''
        });
      } else {
        setError(data.error || 'Falha ao criar database.');
      }
    } catch (error) {
      console.error('Erro ao criar database:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-gray-200 h-64 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6" />
          Meus Databases
        </h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          {showCreateForm ? 'Cancelar' : <><Plus className="w-4 h-4" /> Criar Database</>}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6">🆕 Criar Novo Database</h2>
          
          <form onSubmit={handleCreateDatabase} className="space-y-6">
            {/* Tipo de Database */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de Database <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { value: 'mysql', icon: '🐬', name: 'MySQL' },
                  { value: 'postgres', icon: '🐘', name: 'PostgreSQL' },
                  { value: 'mongodb', icon: '🍃', name: 'MongoDB' },
                  { value: 'redis', icon: '🔴', name: 'Redis' },
                  { value: 'mariadb', icon: '🦭', name: 'MariaDB' }
                ].map(db => (
                  <label
                    key={db.value}
                    className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === db.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={db.value}
                      checked={formData.type === db.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="text-3xl mb-2">{db.icon}</span>
                    <span className="text-sm font-semibold">{db.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nome do Database (identificador) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome do Database (Identificador) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ex: meu-projeto-db"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nome para identificar este database na MozHost
              </p>
            </div>

            {/* Nome do Banco de Dados */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome do Banco de Dados <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.database_name}
                onChange={(e) => setFormData(prev => ({ ...prev, database_name: e.target.value }))}
                placeholder="ex: meu_banco"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nome do banco de dados que será criado
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="ex: meu_usuario"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dica: pode ser apenas uma referência; as credenciais finais são geradas pelo backend.
              </p>
            </div>

            {/* Container (opcional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vincular a um container <span className="text-xs font-normal text-gray-500">(opcional)</span>
              </label>
              <select
                value={formData.container}
                onChange={(e) => setFormData(prev => ({ ...prev, container: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Não vincular agora</option>
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Permite que o container acesse este DB via variáveis de ambiente.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Digite uma senha forte"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use uma senha forte com letras, números e símbolos
              </p>
            </div>

            {/* Cost preview */}
            <div className={`rounded-lg p-3 flex items-center justify-between border ${
              insufficientCoins ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <Coins className={`w-4 h-4 ${insufficientCoins ? 'text-red-600' : 'text-amber-600'}`} />
                <span className={`text-sm font-medium ${insufficientCoins ? 'text-red-700' : 'text-amber-700'}`}>
                  Custo: {DB_COST_COINS} coins
                </span>
              </div>
              <span className={`text-xs ${insufficientCoins ? 'text-red-600' : 'text-amber-600'}`}>
                Saldo: {userCoins !== null ? `${userCoins} coins` : '…'}
                {insufficientCoins && ' (insuficiente)'}
              </span>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={creating || insufficientCoins}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {creating ? 'Criando...' : insufficientCoins ? 'Saldo insuficiente' : '✨ Criar Database'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Databases */}
      {databases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhum database criado
          </h3>
          <p className="text-gray-500 mb-6">
            Crie seu primeiro database para começar!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {databases.map(db => (
            <DatabaseCard
              key={db.id}
              database={db}
              onDelete={() => setConfirmDelete(db)}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmação de delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Deletar Database</h3>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
              <p className="text-sm text-red-800">
                Você está prestes a deletar <strong>{confirmDelete.name}</strong> ({String(confirmDelete.type).toUpperCase()}).
                Todos os dados e credenciais serão removidos permanentemente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteDatabase(confirmDelete.id, confirmDelete.name)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {deletingId === confirmDelete.id ? 'Deletando...' : '🗑️ Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component para exibir cada database
const DatabaseCard = ({ database, onDelete }) => {
  const [copied, setCopied] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const dbIcons = {
    mysql: '🐬',
    postgres: '🐘',
    mongodb: '🍃',
    redis: '🔴',
    mariadb: '🦭'
  };

  // containers vem como array de strings (lista) OU array de objetos (single)
  const linkedContainers = Array.isArray(database.containers)
    ? database.containers.map(c => typeof c === 'string' ? c : c.name).filter(Boolean)
    : [];

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0">{dbIcons[database.type] || '💾'}</span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{database.name}</h3>
            <span className="text-sm text-gray-500 uppercase">{database.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            database.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {database.status === 'running' ? '🟢 Rodando' : '⚫ Parado'}
          </span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Deletar database"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Linked containers */}
      {linkedContainers.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            Vinculado a:
          </span>
          {linkedContainers.map((cname, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md">
              {cname}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <CredRow label="Host" value={database.host} onCopy={() => copyToClipboard(database.host, `host-${database.id}`)} copied={copied === `host-${database.id}`} />
        <CredRow label="Porta" value={database.port} onCopy={() => copyToClipboard(database.port.toString(), `port-${database.id}`)} copied={copied === `port-${database.id}`} />
        <CredRow label="Database" value={database.database_name} onCopy={() => copyToClipboard(database.database_name, `db-${database.id}`)} copied={copied === `db-${database.id}`} />
        <CredRow label="Username" value={database.username} onCopy={() => copyToClipboard(database.username, `user-${database.id}`)} copied={copied === `user-${database.id}`} />
        <CredRow
          label="Password"
          value={database.password}
          onCopy={() => copyToClipboard(database.password, `pass-${database.id}`)}
          copied={copied === `pass-${database.id}`}
          isPassword
          showPassword={showPassword}
          onToggleShow={() => setShowPassword(!showPassword)}
        />
      </div>

      {/* Connection string */}
      {database.connection_string && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              Connection string
            </span>
            <button
              onClick={() => copyToClipboard(database.connection_string, `conn-${database.id}`)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              {copied === `conn-${database.id}` ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar</>}
            </button>
          </div>
          <code className="block bg-gray-50 px-3 py-2 rounded text-xs font-mono text-gray-700 break-all">
            {database.connection_string}
          </code>
        </div>
      )}
    </div>
  );
};

const CredRow = ({ label, value, onCopy, copied, isPassword, showPassword, onToggleShow }) => {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-sm font-semibold text-gray-600">{label}:</span>
      <div className="flex items-center gap-2">
        <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
          {isPassword && !showPassword ? '••••••••' : value}
        </code>
        {isPassword && (
          <button onClick={onToggleShow} className="text-gray-500 hover:text-gray-700">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button onClick={onCopy} className="text-gray-500 hover:text-gray-700">
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default DatabasePage;
