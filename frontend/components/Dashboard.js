import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Play, 
  Square, 
  Activity, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  TrendingUp,
  Plus,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  FileText,
  Terminal,
  Clock,
  Calendar,
  Users,
  Globe,
  Zap,
  Shield,
  Code,
  Database,
  GitBranch
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const Dashboard = () => {
  const [containers, setContainers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    stopped: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    storageUsage: 0,
    uptime: '0 dias'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [storageAlerts, setStorageAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadUserData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUserData = () => {
    const userData = localStorage.getItem('mozhost_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      if (!token) {
        window.location.href = '/';
        return;
      }

      const response = await fetch('https://api.mozhost.topaziocoin.online/api/containers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers);
        setCoins(data.coins || 0);
        setStorageAlerts(Array.isArray(data.storageAlerts) ? data.storageAlerts : []);
        
        // Calcular estatísticas
        const running = data.containers.filter(c => c.status === 'running').length;
        const stopped = data.containers.filter(c => c.status === 'stopped').length;
        const error = data.containers.filter(c => c.status === 'error').length;
        
        setStats({
          total: data.containers.length,
          running,
          stopped,
          error,
          cpuUsage: Math.random() * 60 + 20, // Mock data
          memoryUsage: Math.random() * 70 + 10,
          storageUsage: Math.random() * 40 + 5,
          uptime: calculateUptime()
        });

        // Simular atividade recente
        generateRecentActivity(data.containers);
        
      } else if (response.status === 401) {
        localStorage.removeItem('mozhost_token');
        localStorage.removeItem('mozhost_user');
        window.location.href = '/';
      } else {
        setError('Erro ao carregar dados');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const calculateUptime = () => {
    // Simular uptime baseado em quando o usuário se registrou
    const now = new Date();
    const start = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Até 30 dias
    const diffTime = Math.abs(now - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} dias, ${diffHours}h`;
    } else {
      return `${diffHours} horas`;
    }
  };

  const generateRecentActivity = (containers) => {
    const activities = [];
    const actions = ['criado', 'iniciado', 'parado', 'reiniciado'];
    const timeAgo = ['2 min atrás', '15 min atrás', '1 hora atrás', '3 horas atrás', '1 dia atrás'];
    
    containers.slice(0, 5).forEach((container, index) => {
      activities.push({
        id: index,
        action: actions[Math.floor(Math.random() * actions.length)],
        container: container.name,
        time: timeAgo[index] || '1 hora atrás',
        type: container.type
      });
    });
    
    setRecentActivity(activities.slice(0, 6));
  };

  const quickActions = [
    {
      title: 'Novo Container Node.js',
      description: 'Criar container para bots JavaScript',
      icon: Code,
      color: 'bg-green-500',
      href: '#containers'
    },
    {
      title: 'Novo Container Python',
      description: 'Criar container para bots Python',
      icon: Database,
      color: 'bg-blue-500',
      href: '#containers'
    },
    {
      title: 'Abrir Editor',
      description: 'Editar códigos dos seus bots',
      icon: FileText,
      color: 'bg-purple-500',
      href: '#files'
    },
    {
      title: 'Acessar Terminal',
      description: 'Terminal web para comandos',
      icon: Terminal,
      color: 'bg-gray-700',
      href: '#terminal'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="dashboard">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Bem-vindo de volta, {user?.username || 'Usuário'}! 👋
              </h1>
              <p className="mt-2 text-blue-100">
                Aqui está um resumo da sua conta MozHost
              </p>
              <div className="mt-3 inline-flex items-center bg-yellow-100 text-yellow-900 px-3 py-1 rounded-md">
                <span className="text-sm font-semibold">Coins: {coins}</span>
                <a
                  href="https://api.whatsapp.com/send?phone=258862840075&text=Ola+quero+comprar+coins"
                  target="_blank" rel="noopener noreferrer"
                  className="ml-3 text-sm underline"
                >Comprar coins</a>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center bg-white/10 backdrop-blur rounded-lg px-4 py-2">
                <Activity className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Uptime: {stats.uptime}</span>
              </div>
            </div>
          </div>
        </div>

        {storageAlerts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-md p-4">
            <div className="font-semibold mb-1">Armazenamento quase cheio</div>
            <ul className="list-disc list-inside text-sm">
              {storageAlerts.map(a => (
                <li key={a.id}>
                  {a.name}: {a.usedMB}MB de {a.maxMB}MB usados. Vá em Containers → Upgrade Storage.
                </li>
              ))}
            </ul>
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

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total de Containers"
            value={stats.total}
            icon={Server}
            color="blue"
            subtitle={`${stats.running} rodando agora`}
          />
          <StatsCard
            title="Containers Ativos"
            value={stats.running}
            icon={Play}
            color="green"
            subtitle="Em execução"
          />
          <StatsCard
            title="Uso de CPU"
            value={`${stats.cpuUsage.toFixed(1)}%`}
            icon={Cpu}
            color="purple"
            subtitle="Média dos containers"
          />
          <StatsCard
            title="Uso de Memória"
            value={`${stats.memoryUsage.toFixed(1)}%`}
            icon={MemoryStick}
            color="orange"
            subtitle="RAM utilizada"
          />
        </div>

        {/* Performance Overview */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visão Geral de Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ResourceCard
              title="CPU"
              percentage={stats.cpuUsage}
              icon={Cpu}
              color="blue"
            />
            <ResourceCard
              title="Memória"
              percentage={stats.memoryUsage}
              icon={MemoryStick}
              color="green"
            />
            <ResourceCard
              title="Armazenamento"
              percentage={stats.storageUsage}
              icon={HardDrive}
              color="purple"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
            </div>
            <div className="p-6">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma atividade recente</p>
                  <p className="text-sm">Crie um container para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.action === 'criado' ? 'bg-green-500' :
                        activity.action === 'iniciado' ? 'bg-blue-500' :
                        activity.action === 'parado' ? 'bg-orange-500' :
                        'bg-purple-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          Container <span className="font-medium">{activity.container}</span> foi {activity.action}
                        </p>
                        <div className="flex items-center mt-1 space-x-2">
                          <p className="text-xs text-gray-500">{activity.time}</p>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">
                            {activity.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <a
                    key={index}
                    href={action.href}
                    className="group relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-4 py-3 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {action.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {action.description}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Containers Overview */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Seus Containers</h3>
              <a
                href="#containers"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todos →
              </a>
            </div>
          </div>
          <div className="p-6">
            {containers.length === 0 ? (
              <div className="text-center py-8">
                <Server className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900">Nenhum container</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Comece criando seu primeiro container para hospedar seus bots.
                </p>
                <div className="mt-6">
                  <a
                    href="#containers"
                    className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Container
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {containers.slice(0, 4).map((container) => (
                  <ContainerMiniCard
                    key={container.id}
                    container={container}
                  />
                ))}
                {containers.length > 4 && (
                  <div className="md:col-span-2 text-center py-4">
                    <a
                      href="#containers"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Ver mais {containers.length - 4} containers →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Platform Features */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recursos da Plataforma</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-medium text-gray-900">Isolamento Seguro</h4>
                <p className="text-xs text-gray-500 mt-1">Containers Docker isolados para máxima segurança</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="text-sm font-medium text-gray-900">Deploy Rápido</h4>
                <p className="text-xs text-gray-500 mt-1">Seus bots online em poucos segundos</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="text-sm font-medium text-gray-900">Sempre Online</h4>
                <p className="text-xs text-gray-500 mt-1">99.9% de uptime garantido</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const StatsCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-700',
    green: 'bg-green-500 text-green-700',
    purple: 'bg-purple-500 text-purple-700',
    orange: 'bg-orange-500 text-orange-700'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
      <div className="flex items-center">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color].split(' ')[0]} bg-opacity-15 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[1]}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          {subtitle && <p className="text-xs text-gray-600 mt-1 font-medium">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

const ResourceCard = ({ title, percentage, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-700 bg-blue-600',
    green: 'text-green-700 bg-green-600',
    purple: 'text-purple-700 bg-purple-600'
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-3">
        <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[0]} mr-2`} />
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>
      
      {/* Circular Progress */}
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-300"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${percentage * 2.01} 201`}
            className={colorClasses[color].split(' ')[1]}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="w-full bg-gray-300 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color].split(' ')[1]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

const ContainerMiniCard = ({ container }) => {
  const statusColors = {
    running: 'bg-green-100 text-green-800 border-green-200',
    stopped: 'bg-gray-100 text-gray-800 border-gray-200',
    error: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Server className="w-8 h-8 text-gray-600" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-semibold text-gray-900">{container.name}</p>
          <div className="flex items-center mt-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${statusColors[container.status]}`}>
              {container.status}
            </span>
            <span className="ml-2 text-xs text-gray-600 uppercase font-medium">{container.type}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        {container.port && (
          <p className="text-xs text-gray-600 font-medium">Porta {container.port}</p>
        )}
        <p className="text-xs text-gray-600">
          {new Date(container.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
