import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  Server, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Globe, 
  Settings, 
  Edit3, 
  Trash2, 
  Play, 
  Square, 
  Loader,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

const ContainerSettingsModal = ({ container, isOpen, onClose, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState({
    name: '',
    auto_restart: true,
    cpu_limit: 0.5,
    memory_limit_mb: 512,
    environment: {}
  });
  const [environmentVars, setEnvironmentVars] = useState([]);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (container && isOpen) {
      setFormData({
        name: container.name || '',
        auto_restart: container.auto_restart !== false,
        cpu_limit: container.cpu_limit || 0.5,
        memory_limit_mb: container.memory_limit_mb || 512,
        environment: container.environment || {}
      });
      
      // Converter environment object para array
      const envArray = Object.entries(container.environment || {}).map(([key, value]) => ({
        key,
        value,
        id: Math.random().toString(36).substr(2, 9)
      }));
      setEnvironmentVars(envArray);
    }
  }, [container, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Converter environment array para object
      const environment = {};
      environmentVars.forEach(env => {
        if (env.key.trim()) {
          environment[env.key.trim()] = env.value.trim();
        }
      });

      const updateData = {
        ...formData,
        environment
      };

      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`http://50.116.46.130:3001/api/containers/${container.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' });
        onUpdate && onUpdate();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Erro ao atualizar configurações' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  const handleContainerAction = async (action) => {
    setActionLoading(action);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`http://50.116.46.130:3001/api/containers/${container.id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Container ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'} com sucesso!` });
        onUpdate && onUpdate();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || `Erro ao ${action} container` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja deletar o container "${container.name}"?\n\nEsta ação não pode ser desfeita e todos os dados serão perdidos.`)) {
      return;
    }

    setActionLoading('deleting');
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`http://50.116.46.130:3001/api/containers/${container.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Container deletado com sucesso!' });
        onDelete && onDelete();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Erro ao deletar container' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setActionLoading(null);
    }
  };

  const addEnvironmentVar = () => {
    setEnvironmentVars([...environmentVars, { key: '', value: '', id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeEnvironmentVar = (id) => {
    setEnvironmentVars(environmentVars.filter(env => env.id !== id));
  };

  const updateEnvironmentVar = (id, field, value) => {
    setEnvironmentVars(environmentVars.map(env => 
      env.id === id ? { ...env, [field]: value } : env
    ));
  };

  const getStatusColor = (status) => {
    const colors = {
      running: 'text-green-600 bg-green-100',
      stopped: 'text-gray-600 bg-gray-100',
      error: 'text-red-600 bg-red-100',
      building: 'text-yellow-600 bg-yellow-100'
    };
    return colors[status] || colors.stopped;
  };

  const getStatusIcon = (status) => {
    const icons = {
      running: CheckCircle,
      stopped: Square,
      error: AlertCircle,
      building: Loader
    };
    return icons[status] || Square;
  };

  if (!isOpen || !container) return null;

  const StatusIcon = getStatusIcon(container.status);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Configurações do Container
              </h3>
              <p className="text-sm text-gray-500">
                {container.name} • {container.type.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'general', name: 'Geral', icon: Settings },
              { id: 'resources', name: 'Recursos', icon: Cpu },
              { id: 'environment', name: 'Variáveis', icon: Edit3 },
              { id: 'actions', name: 'Ações', icon: RotateCcw }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mx-6 mt-4 rounded-md p-4 ${
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Container Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Informações do Container</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Server className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">ID:</span>
                    <span className="text-sm font-mono text-gray-900 ml-2">{container.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex items-center">
                    <StatusIcon className={`w-4 h-4 mr-2 ${getStatusColor(container.status).split(' ')[0]}`} />
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium ml-2 ${getStatusColor(container.status).split(' ')[0]}`}>
                      {container.status}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Porta:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{container.port || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Domínio:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2 truncate">
                      {container.domain || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Basic Settings */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Configurações Básicas</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Container
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome do container"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Reinicialização Automática
                      </label>
                      <p className="text-xs text-gray-500">
                        Reiniciar automaticamente se o container parar
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.auto_restart}
                        onChange={(e) => setFormData({ ...formData, auto_restart: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <h4 className="text-sm font-medium text-gray-900">Limites de Recursos</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite de CPU
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={formData.cpu_limit}
                      onChange={(e) => setFormData({ ...formData, cpu_limit: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Cpu className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cores de CPU (0.1 = 10% de 1 core)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite de Memória
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="128"
                      max="2048"
                      value={formData.memory_limit_mb}
                      onChange={(e) => setFormData({ ...formData, memory_limit_mb: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <MemoryStick className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Memória em MB (128-2048)
                  </p>
                </div>
              </div>

              {/* Resource Usage Visualization */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Uso Atual de Recursos</h5>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">CPU</span>
                      <span className="text-gray-900">25%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Memória</span>
                      <span className="text-gray-900">180 MB / {formData.memory_limit_mb} MB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(180 / formData.memory_limit_mb) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'environment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Variáveis de Ambiente</h4>
                <button
                  onClick={addEnvironmentVar}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {environmentVars.map((env, index) => (
                  <div key={env.id} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Nome da variável"
                      value={env.key}
                      onChange={(e) => updateEnvironmentVar(env.id, 'key', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-400">=</span>
                    <input
                      type="text"
                      placeholder="Valor"
                      value={env.value}
                      onChange={(e) => updateEnvironmentVar(env.id, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeEnvironmentVar(env.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {environmentVars.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Edit3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma variável de ambiente configurada</p>
                  <p className="text-sm">Adicione variáveis para configurar seu container</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              <h4 className="text-sm font-medium text-gray-900">Ações do Container</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Container Actions */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-700">Controle do Container</h5>
                  
                  {container.status === 'running' ? (
                    <>
                      <button
                        onClick={() => handleContainerAction('stop')}
                        disabled={actionLoading === 'stop'}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                      >
                        {actionLoading === 'stop' ? (
                          <Loader className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Square className="w-4 h-4 mr-2" />
                        )}
                        Parar Container
                      </button>
                      
                      <button
                        onClick={() => handleContainerAction('restart')}
                        disabled={actionLoading === 'restart'}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === 'restart' ? (
                          <Loader className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-2" />
                        )}
                        Reiniciar Container
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleContainerAction('start')}
                      disabled={actionLoading === 'start'}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === 'start' ? (
                        <Loader className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Iniciar Container
                    </button>
                  )}
                </div>

                {/* Danger Zone */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-red-700">Zona de Perigo</h5>
                  
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading === 'deleting'}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === 'deleting' ? (
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Deletar Container
                  </button>
                  
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Ação Irreversível
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          Deletar o container removerá todos os dados permanentemente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {activeTab === 'general' && 'Configurações básicas do container'}
            {activeTab === 'resources' && 'Limites de CPU e memória'}
            {activeTab === 'environment' && 'Variáveis de ambiente'}
            {activeTab === 'actions' && 'Ações e controle do container'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerSettingsModal;