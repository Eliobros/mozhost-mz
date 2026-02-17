import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Eye, 
  EyeOff,
  Terminal,
  Code,
  Bell,
  Shield,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';

const SettingsPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profileForm, setProfileForm] = useState({
    username: '',
    email: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [startupCommands, setStartupCommands] = useState({
    nodejs: 'npm install && npm start',
    python: 'pip install -r requirements.txt && python main.py'
  });

  const [notifications, setNotifications] = useState({
    containerStart: true,
    containerStop: true,
    systemAlerts: true,
    weeklyReport: false
  });

  const [containers, setContainers] = useState([]);
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [envVars, setEnvVars] = useState([]);
  const [loadingEnv, setLoadingEnv] = useState(false);

  useEffect(() => {
    loadUserData();
    loadContainers();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfileForm({
          username: data.user.username,
          email: data.user.email
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    setSaving({ ...saving, profile: true });
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      });

      if (response.ok) {
        const updatedUser = { ...user, ...profileForm };
        setUser(updatedUser);
        localStorage.setItem('mozhost_user', JSON.stringify(updatedUser));
        setSuccess('Perfil atualizado com sucesso!');
      } else {
        const error = await response.json();
        setError(error.message || 'Erro ao atualizar perfil');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setSaving({ ...saving, profile: false });
    }
  };

  const updatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving({ ...saving, password: true });
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/user/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSuccess('Senha atualizada com sucesso!');
      } else {
        const error = await response.json();
        setError(error.message || 'Erro ao atualizar senha');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setSaving({ ...saving, password: false });
    }
  };

  const saveStartupCommands = async () => {
    setSaving({ ...saving, startup: true });
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/auth/startup-commands', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(startupCommands)
      });

      if (response.ok) {
        setSuccess('Comandos de inicialização salvos!');
      } else {
        setError('Erro ao salvar comandos');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setSaving({ ...saving, startup: false });
    }
  };

  const exportData = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/user/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mozhost-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        setSuccess('Dados exportados com sucesso!');
      }
    } catch (err) {
      setError('Erro ao exportar dados');
    }
  };

  const deleteAccount = async () => {
    const confirmation = prompt('Digite "DELETAR CONTA" para confirmar a exclusão permanente:');
    if (confirmation !== 'DELETAR CONTA') {
      return;
    }

    const doubleConfirm = confirm('Esta ação é IRREVERSÍVEL. Todos os seus containers e dados serão perdidos. Continuar?');
    if (!doubleConfirm) {
      return;
    }

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/user/delete', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        localStorage.clear();
        alert('Conta deletada com sucesso. Redirecionando...');
        window.location.href = '/';
      } else {
        setError('Erro ao deletar conta');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const loadContainers = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/containers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers || []);
      }
    } catch (err) {
      console.error('Erro ao carregar containers:', err);
    }
  };

  const loadContainerEnv = async (containerId) => {
    if (!containerId) {
      setEnvVars([]);
      return;
    }
    setLoadingEnv(true);
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`https://api.mozhost.topaziocoin.online/api/containers/${containerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const env = data.container?.environment ? JSON.parse(data.container.environment) : {};
        const envArray = Object.entries(env).map(([key, value]) => ({
          key, value, id: Math.random().toString(36).substr(2, 9)
        }));
        setEnvVars(envArray);
      }
    } catch (err) {
      console.error('Erro ao carregar variáveis:', err);
    } finally {
      setLoadingEnv(false);
    }
  };

  const saveEnvironmentVars = async () => {
    if (!selectedContainerId) return;
    setSaving({ ...saving, env: true });
    setError('');
    setSuccess('');

    try {
      const environment = {};
      envVars.forEach(env => {
        if (env.key.trim()) {
          environment[env.key.trim()] = env.value;
        }
      });

      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`https://api.mozhost.topaziocoin.online/api/containers/${selectedContainerId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ environment })
      });

      if (response.ok) {
        setSuccess('Variáveis de ambiente salvas com sucesso!');
      } else {
        const err = await response.json();
        setError(err.message || 'Erro ao salvar variáveis');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setSaving({ ...saving, env: false });
    }
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '', id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeEnvVar = (id) => {
    setEnvVars(envVars.filter(env => env.id !== id));
  };

  const updateEnvVar = (id, field, value) => {
    setEnvVars(envVars.map(env => env.id === id ? { ...env, [field]: value } : env));
  };

  if (loading) {
    return (
      
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900">Configurações</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie suas informações pessoais e preferências da conta
          </p>
        </div>

        {/* Messages */}
        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Informações do Perfil
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome de usuário
                  </label>
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={updateProfile}
                    disabled={saving.profile}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving.profile ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Perfil
                  </button>
                </div>
              </div>
            </div>

            {/* Password Settings */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Alterar Senha
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha atual
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={updatePassword}
                    disabled={saving.password}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving.password ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Atualizar Senha
                  </button>
                </div>
              </div>
            </div>

            {/* Startup Commands */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Terminal className="w-5 h-5 mr-2" />
                  Comandos de Inicialização
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Defina comandos personalizados que serão executados quando seus containers iniciarem
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comando para containers Node.js
                  </label>
                  <textarea
                    value={startupCommands.nodejs}
                    onChange={(e) => setStartupCommands({ ...startupCommands, nodejs: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="npm install && npm start"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplo: npm install && npm start
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comando para containers Python
                  </label>
                  <textarea
                    value={startupCommands.python}
                    onChange={(e) => setStartupCommands({ ...startupCommands, python: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="pip install -r requirements.txt && python main.py"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplo: pip install -r requirements.txt && python main.py
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={saveStartupCommands}
                    disabled={saving.startup}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving.startup ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Code className="w-4 h-4 mr-2" />
                    )}
                    Salvar Comandos
                  </button>
                </div>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Variáveis de Ambiente
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Gerencie as variáveis de ambiente dos seus containers
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Container
                  </label>
                  <select
                    value={selectedContainerId}
                    onChange={(e) => {
                      setSelectedContainerId(e.target.value);
                      loadContainerEnv(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um container</option>
                    {containers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedContainerId && (
                  <>
                    {loadingEnv ? (
                      <div className="text-center py-4">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                        <p className="text-sm text-gray-500 mt-2">Carregando variáveis...</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Variáveis ({envVars.length})
                          </span>
                          <button
                            onClick={addEnvVar}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                          >
                            + Adicionar
                          </button>
                        </div>

                        <div className="space-y-2">
                          {envVars.map((env) => (
                            <div key={env.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="CHAVE"
                                value={env.key}
                                onChange={(e) => updateEnvVar(env.id, 'key', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              />
                              <span className="text-gray-400 font-bold">=</span>
                              <input
                                type="text"
                                placeholder="valor"
                                value={env.value}
                                onChange={(e) => updateEnvVar(env.id, 'value', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              />
                              <button
                                onClick={() => removeEnvVar(env.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {envVars.length === 0 && (
                          <div className="text-center py-6 text-gray-400">
                            <Settings className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhuma variável configurada</p>
                            <p className="text-xs">Clique em "Adicionar" para criar uma variável</p>
                          </div>
                        )}

                        <div className="pt-4 flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            ⚠️ Reinicie o container para aplicar as alterações
                          </p>
                          <button
                            onClick={saveEnvironmentVars}
                            disabled={saving.env}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            {saving.env ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Salvar Variáveis
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Informações da Conta</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Plano:</span>
                  <span className="text-sm font-medium capitalize">{user?.plan || 'Free'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Containers máx:</span>
                  <span className="text-sm font-medium">{user?.maxContainers || 2}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">RAM máx:</span>
                  <span className="text-sm font-medium">{user?.maxRamMb || 512}MB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Storage máx:</span>
                  <span className="text-sm font-medium">{user?.maxStorageMb || 1024}MB</span>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Gerenciar Dados</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                <button
                  onClick={exportData}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Dados
                </button>

                <div className="border-t border-gray-200 pt-3">
                  <button
                    onClick={deleteAccount}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar Conta
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Esta ação é irreversível
                  </p>
                </div>
              </div>
            </div>

            {/* Legal Links */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Legal</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                <a
                  href="#privacy"
                  className="block text-sm text-blue-600 hover:text-blue-700"
                >
                  Política de Privacidade
                </a>
                <a
                  href="#terms"
                  className="block text-sm text-blue-600 hover:text-blue-700"
                >
                  Termos e Condições
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    
  );
};

export default SettingsPage;
