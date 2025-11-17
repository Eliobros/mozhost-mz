// components/Dashboard/index.js
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';

// Componentes separados
import WelcomeHeader from './WelcomeHeader';
import StatsGrid from './StatsGrid';
import PerformanceOverview from './PerformanceOverview';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import ContainersPreview from './ContainersPreview';

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
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers);
        setCoins(data.coins || 0);
        setStorageAlerts(Array.isArray(data.storageAlerts) ? data.storageAlerts : []);

        const running = data.containers.filter(c => c.status === 'running').length;
        const stopped = data.containers.filter(c => c.status === 'stopped').length;

        setStats({
          total: data.containers.length,
          running,
          stopped,
          cpuUsage: Math.random() * 60 + 20,
          memoryUsage: Math.random() * 70 + 10,
          storageUsage: Math.random() * 40 + 5,
          uptime: calculateUptime()
        });

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
    const now = new Date();
    const start = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const diffTime = Math.abs(now - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return diffDays > 0 ? `${diffDays} dias, ${diffHours}h` : `${diffHours} horas`;
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
        <WelcomeHeader user={user} coins={coins} uptime={stats.uptime} />

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
    </DashboardLayout>
  );
};

export default Dashboard;
