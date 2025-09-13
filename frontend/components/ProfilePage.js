import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Settings, 
  Bell, 
  CreditCard, 
  Activity, 
  Server, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Globe,
  Clock,
  Save,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  Crown,
  Zap,
  Star
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalContainers: 0,
    runningContainers: 0,
    totalUptime: '0 dias',
    totalStorage: 0,
    averageCpu: 0,
    averageMemory: 0
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      email: true,
      containerEvents: true,
      systemAlerts: true,
      billing: true
    },
    preferences: {
      theme: 'light',
      language: 'pt',
      timezone: 'America/Sao_Paulo'
    }
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadUserData();
    loadUserStats();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('http://50.116.46.130:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData(prev => ({
          ...prev,
          username: data.user.username,
          email: data.user.email
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('http://50.116.46.130:3001/api/containers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const containers = data.containers;
        
        setStats({
          totalContainers: containers.length,
          runningContainers: containers.filter(c => c.status === 'running').length,
          totalUptime: calculateTotalUptime(containers),
          totalStorage: containers.reduce((sum, c) => sum + (c.storage_used_mb || 0), 0),
          averageCpu: Math.random() * 60 + 20, // Mock data
          averageMemory: Math.random() * 70 + 10 // Mock data
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const calculateTotalUptime = (containers) => {
    // Simular uptime baseado na data de criação
    const now = new Date();
    const totalDays = containers.reduce((sum, container) => {
      const created = new Date(container.created_at);
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    
    if (totalDays > 0) {
      return `${totalDays} dias`;
    }
    return '0 dias';
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mozhost_token');
      
      // Validar senhas se fornecidas
      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'As senhas não coincidem' });
        return;
      }

      const updateData = {
        username: formData.username,
        email: formData.email,
        ...(formData.newPassword && { 
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword 
        }),
        notifications: formData.notifications,
        preferences: formData.preferences
      };

      const response = await fetch('http://50.116.46.130:3001/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        setEditing(false);
        await loadUserData();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  const getPlanInfo = (plan) => {
    const plans = {
      free: { name: 'Gratuito', icon: Star, color: 'text-gray-600', bg: 'bg-gray-100' },
      basic: { name: 'Básico', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
      pro: { name: 'Pro', icon: Crown, color: 'text-purple-600', bg: 'bg-purple-100' }
    };
    return plans[plan] || plans.free;
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="profile">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando perfil...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const planInfo = getPlanInfo(user?.plan);

  return (
    <DashboardLayout currentPage="profile">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900">
              Meu Perfil
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie suas informações e configurações
            </p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-purple-700"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {editing ? 'Cancelar' : 'Editar Perfil'}
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome de Usuário
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900">
                        <User className="w-4 h-4 mr-2" />
                        {user?.username}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    {editing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900">
                        <Mail className="w-4 h-4 mr-2" />
                        {user?.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plano Atual
                    </label>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${planInfo.bg} ${planInfo.color}`}>
                      <planInfo.icon className="w-4 h-4 mr-1" />
                      {planInfo.name}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membro desde
                    </label>
                    <div className="flex items-center text-gray-900">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(user?.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Section */}
            {editing && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Alterar Senha</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Digite sua senha atual"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nova Senha
                      </label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Digite a nova senha"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirme a nova senha"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
              </div>
              <div className="p-6 space-y-4">
                {Object.entries(formData.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {key === 'email' && 'Notificações por Email'}
                        {key === 'containerEvents' && 'Eventos de Container'}
                        {key === 'systemAlerts' && 'Alertas do Sistema'}
                        {key === 'billing' && 'Informações de Cobrança'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {key === 'email' && 'Receber notificações importantes por email'}
                        {key === 'containerEvents' && 'Notificar sobre start/stop/restart de containers'}
                        {key === 'systemAlerts' && 'Alertas de sistema e manutenção'}
                        {key === 'billing' && 'Lembretes de cobrança e limites de uso'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: {
                            ...formData.notifications,
                            [key]: e.target.checked
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            {editing && (
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Estatísticas da Conta</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Server className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Total de Containers</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.totalContainers}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Containers Ativos</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.runningContainers}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Uptime Total</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.totalUptime}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <HardDrive className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Armazenamento</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.totalStorage} MB</span>
                </div>
              </div>
            </div>

            {/* Resource Usage */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Uso de Recursos</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">CPU Médio</span>
                    <span className="text-sm font-bold text-gray-900">{stats.averageCpu.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(stats.averageCpu, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Memória Média</span>
                    <span className="text-sm font-bold text-gray-900">{stats.averageMemory.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(stats.averageMemory, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center transition-colors">
                  <Shield className="w-4 h-4 mr-2" />
                  Segurança da Conta
                </button>
                <button className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center transition-colors">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Gerenciar Cobrança
                </button>
                <button className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center transition-colors">
                  <Bell className="w-4 h-4 mr-2" />
                  Central de Notificações
                </button>
                <button className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center transition-colors">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações Avançadas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;