// components/Dashboard/index.js
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

// Componentes separados
import WelcomeHeader from './WelcomeHeader';
import StatsGrid from './StatsGrid';
import PerformanceOverview from './PerformanceOverview';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import ContainersPreview from './ContainersPreview';
import UpgradeBanner from './UpgradeBanner';

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
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      if (token) {
        const response = await fetch('https://api.mozhost.shop/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setCoins(data.user.coins || 0);
          return;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do usuário:', e);
    }
    // Fallback to localStorage
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

      // Buscar containers e métricas reais em paralelo
      const [containersRes, metricsRes] = await Promise.all([
        fetch('https://api.mozhost.shop/api/containers', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('https://api.mozhost.shop/api/monitoring/system/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null)
      ]);

      if (containersRes.ok) {
        const data = await containersRes.json();
        setContainers(data.containers);
        setCoins(data.coins || 0);
        setStorageAlerts(Array.isArray(data.storageAlerts) ? data.storageAlerts : []);

        const running = data.containers.filter(c => c.status === 'running').length;
        const stopped = data.containers.filter(c => c.status === 'stopped').length;

        // Usar métricas reais do sistema
        let cpuUsage = 0;
        let memoryUsage = 0;
        let storageUsage = 0;

        if (metricsRes && metricsRes.ok) {
          const metrics = await metricsRes.json();
          cpuUsage = metrics.cpu || 0;
          memoryUsage = metrics.memory?.percent || 0;
          storageUsage = metrics.storage?.percent || 0;
        }

        setStats({
          total: data.containers.length,
          running,
          stopped,
          cpuUsage,
          memoryUsage,
          storageUsage,
          uptime: calculateUptime(data.containers)
        });

        generateRecentActivity(data.containers);

      } else if (containersRes.status === 401) {
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

  const calculateUptime = (containersList) => {
    // Calcular uptime real baseado no container mais antigo em execução
    const runningContainers = containersList.filter(c => c.status === 'running' && c.created_at);
    if (runningContainers.length === 0) return '0h';

    const oldest = runningContainers.reduce((prev, curr) => 
      new Date(prev.created_at) < new Date(curr.created_at) ? prev : curr
    );

    const now = new Date();
    const start = new Date(oldest.updated_at || oldest.created_at);
    const diffTime = Math.abs(now - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return diffDays > 0 ? `${diffDays} dias, ${diffHours}h` : `${diffHours} horas`;
  };

  const generateRecentActivity = (containersList) => {
    // Gerar atividade real baseada nos dados dos containers
    const activities = containersList
      .slice()
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 6)
      .map((container, index) => {
        // Determinar ação com base no status real
        const actionMap = {
          running: 'iniciado',
          stopped: 'parado',
          error: 'erro detectado',
          building: 'em construção'
        };
        const action = actionMap[container.status] || 'atualizado';

        // Calcular tempo real desde última atualização
        const updatedAt = new Date(container.updated_at);
        const now = new Date();
        const diffMs = now - updatedAt;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let time;
        if (diffMin < 1) time = 'agora mesmo';
        else if (diffMin < 60) time = `${diffMin} min atrás`;
        else if (diffHours < 24) time = `${diffHours}h atrás`;
        else time = `${diffDays} dia(s) atrás`;

        return {
          id: index,
          action,
          container: container.name,
          time,
          type: container.type
        };
      });

    setRecentActivity(activities);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WelcomeHeader user={user} coins={coins} uptime={stats.uptime} />

      {user?.plan === 'free' && (
        <UpgradeBanner user={user} containers={containers} />
      )}

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

      <StatsGrid stats={stats} />
      <PerformanceOverview stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivity} />
        <QuickActions />
      </div>

      <ContainersPreview containers={containers} />
    </div>
  );
};

export default Dashboard;
