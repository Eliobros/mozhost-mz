import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Settings, 
  Eye,
  Edit3,
  Copy,
  ExternalLink,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader,
  X,
  Globe
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import ContainerSettingsModal from './ContainerSettingsModal';

const ContainersPage = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'nodejs',
    environment: {}
  });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadContainers();
  }, []);

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

  const handleContainerAction = async (containerId, action) => {
    setActionLoading(prev => ({ ...prev, [containerId]: action }));
    
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`https://api.mozhost.topaziocoin.online/api/containers/${containerId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadContainers(); // Recarregar lista
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error || 'Falha na operação'}`);
      }
    } catch (error) {
      console.error(`Erro ao executar ${action}:`, error);
      alert('Erro de conexão');
    } finally {
      setActionLoading(prev => ({ ...prev, [containerId]: null }));
    }
  };

  const handleCreateContainer = async () => {
    if (!createForm.name.trim()) {
      alert('Por favor, insira um nome para o container');
      return;
    }
    
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/containers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({ name: '', type: 'nodejs', environment: {} });
        await loadContainers();
      } else {
        const error = await response.json();
        alert(`Erro ao criar container: ${error.error || error.message}`);
      }
    } catch (error) {
      console.error('Erro ao criar container:', error);
      alert('Erro de conexão');
    }
  };

  const handleDeleteContainer = async (container) => {
    if (!confirm(`Tem certeza que deseja deletar "${container.name}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [container.id]: 'deleting' }));
    
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`https://api.mozhost.topaziocoin.online/api/containers/${container.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadContainers();
      } else {
        const error = await response.json();
        alert(`Erro ao deletar: ${error.error || 'Falha na operação'}`);
      }
    } catch (error) {
      console.error('Erro ao deletar container:', error);
      alert('Erro de conexão');
    } finally {
      setActionLoading(prev => ({ ...prev, [container.id]: null }));
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
      <DashboardLayout currentPage="containers">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando containers...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="containers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900">
              Containers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie todos os seus containers em um só lugar
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Container
          </button>
        </div>

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
                actionLoading={actionLoading[container.id]}
                onAction={handleContainerAction}
                onDelete={() => handleDeleteContainer(container)}
                onEdit={(container) => {
                  setSelectedContainer(container);
                  setShowSettingsModal(true);
                }}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateContainerModal
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreateContainer}
            onClose={() => {
              setShowCreateModal(false);
              setCreateForm({ name: '', type: 'nodejs', environment: {} });
            }}
          />
        )}

        {/* Settings Modal */}
        {showSettingsModal && selectedContainer && (
          <ContainerSettingsModal
            container={selectedContainer}
            isOpen={showSettingsModal}
            onClose={() => {
              setShowSettingsModal(false);
              setSelectedContainer(null);
            }}
            onUpdate={loadContainers}
            onDelete={() => {
              setShowSettingsModal(false);
              setSelectedContainer(null);
              loadContainers();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

const ContainerCard = ({ container, actionLoading, onAction, onDelete, onEdit }) => {
  const statusConfig = {
    running: { color: 'green', icon: CheckCircle, text: 'Rodando' },
    stopped: { color: 'gray', icon: Square, text: 'Parado' },
    error: { color: 'red', icon: AlertCircle, text: 'Erro' }
  };

  const status = statusConfig[container.status] || statusConfig.stopped;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              status.color === 'green' ? 'bg-green-500' :
              status.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate">{container.name}</h3>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${
                  status.color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                  status.color === 'red' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.text}
                </span>
                <span className="ml-2 text-xs text-gray-600 uppercase font-medium">{container.type}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onEdit(container)}
            className="text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-gray-700">
            <Server className="w-4 h-4 mr-2 text-gray-600" />
            <span className="font-medium">ID: {container.id.substring(0, 8)}</span>
          </div>
          
          {container.port && (
            <div className="flex items-center text-sm text-gray-700">
              <ExternalLink className="w-4 h-4 mr-2 text-gray-600" />
              <span className="font-medium">Porta: {container.port}</span>
            </div>
          )}
          
          {container.domain && (
            <div className="flex items-center text-sm text-gray-700">
              <Globe className="w-4 h-4 mr-2 text-gray-600" />
              <a 
                href={`http://${container.domain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-800 hover:underline font-medium"
              >
                {container.domain}
              </a>
            </div>
          )}
          
          
          <div className="flex items-center text-sm text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-gray-600" />
            <span className="font-medium">Criado: {new Date(container.created_at).toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-700">
            <Clock className="w-4 h-4 mr-2 text-gray-600" />
            <span className="font-medium">Atualizado: {new Date(container.updated_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {container.status === 'stopped' ? (
              <button
                onClick={() => onAction(container.id, 'start')}
                disabled={actionLoading === 'start'}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === 'start' ? (
                  <Loader className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                Iniciar
              </button>
            ) : container.status === 'running' ? (
              <>
                <button
                  onClick={() => onAction(container.id, 'stop')}
                  disabled={actionLoading === 'stop'}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                >
                  {actionLoading === 'stop' ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Square className="w-3 h-3 mr-1" />
                  )}
                  Parar
                </button>
                <button
                  onClick={() => onAction(container.id, 'restart')}
                  disabled={actionLoading === 'restart'}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'restart' ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="w-3 h-3 mr-1" />
                  )}
                  Restart
                </button>
              </>
            ) : (
              <button
                onClick={() => onAction(container.id, 'start')}
                disabled={actionLoading === 'start'}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === 'start' ? (
                  <Loader className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                Iniciar
              </button>
            )}
          </div>

          <button
            onClick={onDelete}
            disabled={actionLoading === 'deleting'}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {actionLoading === 'deleting' ? (
              <Loader className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Trash2 className="w-3 h-3 mr-1" />
            )}
            Deletar
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateContainerModal = ({ form, setForm, onSubmit, onClose }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Criar Novo Container</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Container
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="meu-bot-whatsapp"
          />
          <p className="mt-1 text-xs text-gray-500">
            Use apenas letras, números, hífens e underscores
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Aplicação
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="nodejs">Node.js</option>
            <option value="python">Python</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {form.type === 'nodejs' ? 'Para bots em JavaScript/TypeScript' : 'Para bots em Python'}
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-md hover:from-blue-700 hover:to-purple-700"
          >
            Criar Container
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default ContainersPage;
