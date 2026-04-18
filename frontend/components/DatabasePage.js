// components/DatabasePage.js
import React, { useState, useEffect } from 'react';
import { Database, Copy, ExternalLink, Trash2, Check, AlertCircle, Eye, EyeOff, Plus, RefreshCw } from 'lucide-react';

const DatabasePage = () => {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'mysql',
    name: '',
    database_name: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    loadDatabases();
  }, []);

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
          
          <form onsubmit={handleCreateDatabase} className="space-y-6">
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

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {creating ? 'Criando...' : '✨ Criar Database'}
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
            <DatabaseCard key={db.id} database={db} onRefresh={loadDatabases} />
          ))}
        </div>
      )}
    </div>
  );
};

// Component para exibir cada database
const DatabaseCard = ({ database, onRefresh }) => {
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

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{dbIcons[database.type]}</span>
          <div>
            <h3 className="text-lg font-bold">{database.name}</h3>
            <span className="text-sm text-gray-500 uppercase">{database.type}</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          database.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {database.status === 'running' ? '🟢 Rodando' : '⚫ Parado'}
        </span>
      </div>

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
