"use client"

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import {
  Server,
  Plus,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  Coins
} from 'lucide-react';
import ContainerCard from './ContainerCard';
import CreateContainerModal from './CreateContainerModal';
import PaymentModal from './PaymentModal';
import { loadContainers as fetchContainers, upgradeStorage, performContainerAction, createContainer, deleteContainer } from './containerService';

const ContainersPage = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // ← NOVO ESTADO
  const [createForm, setCreateForm] = useState({
  name: '',
  type: 'api',
  projectType: 'api', // 'api' ou 'bot'
  template: 'api', // 'api', 'bot-baileys', 'bot-wwebjs'
  environment: {}
});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [coins, setCoins] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [storageAlerts, setStorageAlerts] = useState([]);
  const REQUIRED_COINS = 500;
  const [statsMap, setStatsMap] = useState({});
  const searchParams = useSearchParams();
const router = useRouter();
const [paymentResultStatus, setPaymentResultStatus] = useState(null);

 useEffect(() => {
  loadContainers();
  loadStats();
  const interval = setInterval(loadStats, 30000);
  return () => clearInterval(interval);
}, []); 

useEffect(() => {
  const paymentParam = searchParams.get('payment');
  const status = searchParams.get('status');

  if (paymentParam === 'result' && status) {
    setPaymentResultStatus(status);

    // Limpa a URL pra não ficar reprocessando se o usuário atualizar a página
    router.replace('/containers');

    if (status === 'success') {
      // Recarrega containers/coins pra refletir o saldo atualizado
      loadContainers();
    }
  }
}, [searchParams]);



  const loadContainers = async () => {
    try {
      const data = await fetchContainers();
      setContainers(data.containers);
      setCoins(data.coins || 0);
      setStorageAlerts(Array.isArray(data.storageAlerts) ? data.storageAlerts : []);
    } catch (error) {
      console.error('Erro ao carregar containers:', error);
    } finally {
      setLoading(false);
    }
  };

 const loadStats = async () => {
  try {
    const token = localStorage.getItem('mozhost_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop'}/api/containers/stats/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.stats) {
      const map = {};
      data.stats.forEach(s => { map[s.id] = s.stats; });
      setStatsMap(map);
    }
  } catch (error) {
    console.error('Erro ao carregar stats:', error);
  }
};


  const handleUpgradeStorage = async (containerId) => {
    const input = prompt('Adicionar quanto de armazenamento? (em MB, mínimo 100)');
    if (!input) return;
    const addMb = parseInt(input, 10);
    if (isNaN(addMb) || addMb < 100) {
      alert('Valor inválido. Informe um número em MB (>= 100).');
      return;
    }

    try {
      const data = await upgradeStorage(containerId, addMb);
      alert(`Armazenamento atualizado! Novo limite: ${data.maxStorageMb} MB. Coins restantes: ${data.coins}.`);
      await loadContainers();
    } catch (error) {
      alert(`Falha no upgrade: ${error.message}`);
    }
  };

  const handleContainerAction = async (containerId, action) => {
    setActionLoading(prev => ({ ...prev, [containerId]: action }));

    try {
      await performContainerAction(containerId, action);
      await loadContainers();
    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [containerId]: null }));
    }
  };

  const handleCreateContainer = async () => {
    if (!createForm.name.trim()) {
      alert('Por favor, insira um nome para o container');
      return;
    }

    // ✅ PREVINE MÚLTIPLOS CLIQUES
    if (isCreating) return;

    setIsCreating(true); // ← ATIVA LOADING

    try {
      await createContainer(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'nodejs', environment: {} });
      await loadContainers();
    } catch (error) {
      alert(`Erro ao criar container: ${error.message}`);
    } finally {
      setIsCreating(false); // ← DESATIVA LOADING
    }
  };

  const handleDeleteContainer = async (container) => {
    if (!confirm(`Tem certeza que deseja deletar "${container.name}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [container.id]: 'deleting' }));

    try {
      await deleteContainer(container.id);
      await loadContainers();
    } catch (error) {
      alert(`Erro ao deletar: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [container.id]: null }));
    }
  };

  const handleRenewContainer = async (containerId) => {
    if (!confirm('Renovar este container por mais 30 dias custará 500 coins. Continuar?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [containerId]: 'renewing' }));

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop'}/api/containers/${containerId}/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          alert(`Coins insuficientes! Você tem ${data.have} coins e precisa de ${data.needed}.`);
          setShowPaymentModal(true);
          return;
        }
        throw new Error(data.error || data.message || 'Erro ao renovar');
      }

      alert(`✅ Container renovado! Nova expiração: ${new Date(data.expiresAt).toLocaleDateString('pt-MZ')}`);
      setCoins(data.coins);
      await loadContainers();

    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [containerId]: null }));
    }
  };

  const filteredContainers = containers.filter(container => {
    const matchesFilter = filter === 'all' || container.status === filter;
    const matchesSearch = container.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const containerStats = {
    total: containers.length,
    running: containers.filter(c => c.status === 'running').length,
    stopped: containers.filter(c => c.status === 'stopped').length,
    error: containers.filter(c => c.status === 'error').length
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando containers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900">Containers</h1>
            <p className="mt-1 text-sm text-gray-500">Gerencie todos os seus containers em um só lugar</p>
            <div className="mt-2 inline-flex items-center text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-1">
              <Coins className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="font-semibold">Coins:</span>
              <span className="ml-1">{coins}</span>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="ml-3 inline-flex items-center px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium"
              >
                <Coins className="w-3 h-3 mr-1" /> Comprar coins
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Container
          </button>
        </div>
        
        {paymentResultStatus === 'success' && (
  <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 flex items-center justify-between">
    <div className="flex items-center">
      <CheckCircle className="w-5 h-5 mr-2" />
      Pagamento confirmado! Suas coins já foram creditadas.
    </div>
    <button onClick={() => setPaymentResultStatus(null)} className="text-green-600 hover:text-green-800">✕</button>
  </div>
)}

{paymentResultStatus === 'failed' && (
  <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-center justify-between">
    <div className="flex items-center">
      <AlertCircle className="w-5 h-5 mr-2" />
      Pagamento não foi concluído. Tenta novamente.
    </div>
    <button onClick={() => setPaymentResultStatus(null)} className="text-red-600 hover:text-red-800">✕</button>
  </div>
)}

        {/* Storage Alerts */}
        {storageAlerts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-md p-4">
            <div className="font-semibold mb-1">Armazenamento quase cheio</div>
            <ul className="list-disc list-inside text-sm">
              {storageAlerts.map(a => (
                <li key={a.id}>
                  {a.name}: {a.usedMB}MB de {a.maxMB}MB usados. Considere fazer upgrade.
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center">
              <Server className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-700">Total</p>
                <p className="text-2xl font-bold text-gray-900">{containerStats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center">
              <Play className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-700">Em Execução</p>
                <p className="text-2xl font-bold text-gray-900">{containerStats.running}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center">
              <Square className="w-8 h-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-700">Parados</p>
                <p className="text-2xl font-bold text-gray-900">{containerStats.stopped}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-700">Com Erro</p>
                <p className="text-2xl font-bold text-gray-900">{containerStats.error}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar containers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'running', 'stopped', 'error'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Todos' :
                   status === 'running' ? 'Rodando' :
                   status === 'stopped' ? 'Parado' : 'Erro'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Containers Grid */}
        {filteredContainers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border">
            <Server className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              {containers.length === 0 ? 'Nenhum container encontrado' : 'Nenhum container corresponde aos filtros'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {containers.length === 0
                ? 'Comece criando seu primeiro container para hospedar seus bots.'
                : 'Tente ajustar os filtros ou criar um novo container.'
              }
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Container
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContainers.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
		stats={statsMap[container.id]} 
                actionLoading={actionLoading[container.id]}
                onAction={handleContainerAction}
                onDelete={() => handleDeleteContainer(container)}
                onUpgrade={handleUpgradeStorage}
                onRenew={handleRenewContainer}
                isNearLimit={!!storageAlerts.find(a => a.id === container.id)}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateContainerModal
            form={createForm}
            setForm={setCreateForm}
            coins={coins}
            requiredCoins={REQUIRED_COINS}
            isCreating={isCreating} // ← PASSA A PROP
            onSubmit={handleCreateContainer}
            onClose={() => {
  if (isCreating) return;
  setShowCreateModal(false);
  setCreateForm({ 
    name: '', 
    type: 'api', 
    projectType: 'api',
    template: 'api',
    environment: {} 
  });
}}
          />
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <PaymentModal
            onClose={() => setShowPaymentModal(false)}
            onSuccess={(coinsAdded) => {
              setShowPaymentModal(false);
              loadContainers();
              
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ContainersPage;
