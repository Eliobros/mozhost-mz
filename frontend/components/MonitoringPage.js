import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Settings,
  Zap,
  Globe,
  Database,
  Network
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const MonitoringPage = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realTimeData, setRealTimeData] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [selectedContainer, setSelectedContainer] = useState('all');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    storage: 0,
    network: 0
  });
  const [previousMetrics, setPreviousMetrics] = useState({
    cpu: 0,
    memory: 0,
    storage: 0,
    network: 0
  });

  useEffect(() => {
    loadContainers();
    loadInitialMetrics();

    let interval;
    if (isLiveMode) {
      interval = setInterval(() => {
        updateRealTimeData();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLiveMode, selectedTimeRange]);

  const loadContainers = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/containers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers);
      }
    } catch (error) {
      console.error('Erro ao carregar containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialMetrics = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/monitoring/system/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const metrics = {
          cpu: data.cpu,
          memory: data.memory.percent,
          storage: data.storage.percent,
          network: data.network.total
        };
        
        setSystemMetrics(metrics);
        setPreviousMetrics(metrics);

        // Gera dados iniciais
        const now = new Date();
        const initialData = [];
        const points = selectedTimeRange === '1h' ? 20 : selectedTimeRange === '6h' ? 60 : 120;
        
        for (let i = points; i >= 0; i--) {
          const time = new Date(now - i * 3 * 60000); // 3 minutos por ponto
          initialData.push({
            time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: time,
            cpu: metrics.cpu,
            memory: metrics.memory,
            storage: metrics.storage,
            network: metrics.network,
            containers: containers.filter(c => c.status === 'running').length
          });
        }
        
        setRealTimeData(initialData);
      }
    } catch (error) {
      console.error('Erro ao carregar métricas iniciais:', error);
    }
  };

  const updateRealTimeData = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/monitoring/system/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Atualiza métricas anteriores antes de setar as novas
        setPreviousMetrics(systemMetrics);
        
        const newMetrics = {
          cpu: data.cpu,
          memory: data.memory.percent,
          storage: data.storage.percent,
          network: data.network.total
        };
        
        setSystemMetrics(newMetrics);

        setRealTimeData(prevData => {
          const newData = [...prevData];
          const now = new Date();

          const maxPoints = selectedTimeRange === '1h' ? 20 : selectedTimeRange === '6h' ? 60 : 120;
          if (newData.length >= maxPoints) {
            newData.shift();
          }

          newData.push({
            time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: now,
            cpu: data.cpu,
            memory: data.memory.percent,
            storage: data.storage.percent,
            network: data.network.total,
            containers: containers.filter(c => c.status === 'running').length
          });

          return newData;
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar dados em tempo real:', error);
    }
  };

  const containerStatusData = [
    { name: 'Rodando', value: containers.filter(c => c.status === 'running').length, color: '#10B981' },
    { name: 'Parado', value: containers.filter(c => c.status === 'stopped').length, color: '#6B7280' },
    { name: 'Erro', value: containers.filter(c => c.status === 'error').length, color: '#EF4444' }
  ];

  const resourceAlerts = [
    {
      type: systemMetrics.cpu > 80 ? 'error' : systemMetrics.cpu > 60 ? 'warning' : 'ok',
      metric: 'CPU',
      value: systemMetrics.cpu,
      message: systemMetrics.cpu > 80 ? 'Uso de CPU muito alto' : systemMetrics.cpu > 60 ? 'Uso de CPU elevado' : 'CPU normal'
    },
    {
      type: systemMetrics.memory > 85 ? 'error' : systemMetrics.memory > 70 ? 'warning' : 'ok',
      metric: 'Memória',
      value: systemMetrics.memory,
      message: systemMetrics.memory > 85 ? 'Memória crítica' : systemMetrics.memory > 70 ? 'Memória alta' : 'Memória normal'
    },
    {
      type: systemMetrics.storage > 90 ? 'error' : systemMetrics.storage > 75 ? 'warning' : 'ok',
      metric: 'Armazenamento',
      value: systemMetrics.storage,
      message: systemMetrics.storage > 90 ? 'Espaço crítico' : systemMetrics.storage > 75 ? 'Espaço baixo' : 'Espaço normal'
    }
  ];

  const calculateTrend = (current, previous) => {
    const diff = current - previous;
    return {
      direction: diff > 0 ? 'up' : 'down',
      value: Math.abs(diff).toFixed(1)
    };
  };

  const exportData = () => {
    const dataStr = JSON.stringify(realTimeData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monitoring-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="monitoring">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando monitoramento...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="monitoring">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900">
              Monitoramento
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Métricas em tempo real dos seus containers e sistema
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => setIsLiveMode(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Tempo Real</span>
              </label>
              {isLiveMode && (
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-1"></div>
                  <span className="text-xs">LIVE</span>
                </div>
              )}
            </div>

            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="1h">Última hora</option>
              <option value="6h">Últimas 6 horas</option>
              <option value="24h">Últimas 24 horas</option>
            </select>

            <button
              onClick={exportData}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="CPU"
            value={systemMetrics.cpu}
            unit="%"
            icon={Cpu}
            color="blue"
            trend={calculateTrend(systemMetrics.cpu, previousMetrics.cpu).direction}
            trendValue={calculateTrend(systemMetrics.cpu, previousMetrics.cpu).value}
          />
          <MetricCard
            title="Memória"
            value={systemMetrics.memory}
            unit="%"
            icon={MemoryStick}
            color="green"
            trend={calculateTrend(systemMetrics.memory, previousMetrics.memory).direction}
            trendValue={calculateTrend(systemMetrics.memory, previousMetrics.memory).value}
          />
          <MetricCard
            title="Armazenamento"
            value={systemMetrics.storage}
            unit="%"
            icon={HardDrive}
            color="purple"
            trend={calculateTrend(systemMetrics.storage, previousMetrics.storage).direction}
            trendValue={calculateTrend(systemMetrics.storage, previousMetrics.storage).value}
          />
          <MetricCard
            title="Rede"
            value={systemMetrics.network}
            unit="MB/s"
            icon={Network}
            color="orange"
            trend={calculateTrend(systemMetrics.network, previousMetrics.network).direction}
            trendValue={calculateTrend(systemMetrics.network, previousMetrics.network).value}
          />
        </div>

        {resourceAlerts.some(alert => alert.type !== 'ok') && (
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas do Sistema</h3>
            <div className="space-y-3">
              {resourceAlerts.filter(alert => alert.type !== 'ok').map((alert, index) => (
                <div key={index} className={`flex items-center p-3 rounded-lg ${
                  alert.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                } border`}>
                  <AlertTriangle className={`w-5 h-5 mr-3 ${
                    alert.type === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.metric}: {alert.value.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Uso de Recursos</h3>
            </div>
            <div className="p-6">
              <div className="h-80">
                {realTimeData && realTimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={realTimeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stackId="1"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.2}
                        name="CPU (%)"
                      />
                      <Area
                        type="monotone"
                        dataKey="memory"
                        stackId="2"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.2}
                        name="Memória (%)"
                      />
                      <Area
                        type="monotone"
                        dataKey="storage"
                        stackId="3"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.2}
                        name="Storage (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Carregando dados...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Status dos Containers</h3>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={containerStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {containerStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Uso de Rede</h3>
          </div>
          <div className="p-6">
            <div className="h-64">
              {realTimeData && realTimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{ value: 'MB/s', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="network"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                      name="Rede (MB/s)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-500">Carregando dados de rede...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {containers.length > 0 && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes dos Containers</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {containers.map((container) => (
                  <ContainerMetricCard
                    key={container.id}
                    container={container}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const MetricCard = ({ title, value, unit, icon: Icon, color, trend, trendValue }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600' },
    green: { bg: 'bg-green-500', text: 'text-green-600' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600' }
  };

  const colors = colorClasses[color] || colorClasses.blue;
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-red-600' : 'text-green-600';

  return (
    <div className="bg-white rounded-lg shadow border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-lg ${colors.bg} bg-opacity-10 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toFixed(1) : value}
              </p>
              <p className="text-sm text-gray-500 ml-1">{unit}</p>
            </div>
          </div>
        </div>
        <div className={`flex items-center ${trendColor}`}>
          <TrendIcon className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{trendValue}</span>
        </div>
      </div>
    </div>
  );
};

const ContainerMetricCard = ({ container }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (container.status !== 'running') {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('mozhost_token');
        const response = await fetch(
          `https://api.mozhost.topaziocoin.online/api/monitoring/containers/${container.id}/stats`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            setMetrics(data);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);

    return () => clearInterval(interval);
  }, [container.id, container.status]);

  const statusColors = {
    running: 'bg-green-100 text-green-800 border-green-200',
    stopped: 'bg-gray-100 text-gray-800 border-gray-200',
    error: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Server className="w-5 h-5 text-gray-400 mr-2" />
          <h4 className="text-sm font-medium text-gray-900 truncate">{container.name}</h4>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColors[container.status]}`}>
          {container.status}
        </span>
      </div>

      {container.status === 'running' && (
        <>
          {loading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-gray-400 mt-2">Carregando métricas...</p>
            </div>
          ) : metrics ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">CPU:</span>
                <span className="font-medium">{metrics.cpu.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Memória:</span>
                <span className="font-medium">{metrics.memory.percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(metrics.memory.percent, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                <span className="text-gray-600">Uso:</span>
                <span className="font-medium text-xs">
                  {metrics.memory.usedMB} / {metrics.memory.limitMB} MB
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Métricas indisponíveis</p>
            </div>
          )}
        </>
      )}

      {container.status === 'stopped' && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Container parado</p>
          <p className="text-xs text-gray-400 mt-1">Nenhuma métrica disponível</p>
        </div>
      )}

      {container.status === 'error' && (
        <div className="text-center py-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">Erro no container</p>
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;
