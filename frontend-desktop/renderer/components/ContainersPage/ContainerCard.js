import React, { useState } from 'react';
import {
  Server,
  Play,
  Square,
  RotateCcw,
  Trash2,
  HardDrive,
  Calendar,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader,
  Globe,
  Database,
  Copy,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';

const ContainerCard = ({ container, actionLoading, onAction, onDelete, onUpgrade, onRenew, isNearLimit }) => {
  const [showPassword, setShowPassword] = useState(false);

  const statusConfig = {
    running: { color: 'green', icon: CheckCircle, text: 'Rodando' },
    stopped: { color: 'gray', icon: Square, text: 'Parado' },
    error: { color: 'red', icon: AlertCircle, text: 'Erro' }
  };

  const status = statusConfig[container.status] || statusConfig.stopped;
  const StatusIcon = status.icon;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copiado!`);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
      {/* Subscription Expiration Banner */}
      {container.subscription?.expired && (
        <div className="px-4 py-2 bg-red-500 text-white text-sm font-medium flex items-center justify-between rounded-t-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Expirado - Recarregue 500 coins
          </div>
          {onRenew && (
            <button
              onClick={() => onRenew(container.id)}
              className="px-3 py-1 bg-white text-red-600 text-xs rounded-md font-medium hover:bg-red-50"
            >
              Renovar Agora
            </button>
          )}
        </div>
      )}
      {container.subscription?.expiringSoon && !container.subscription?.expired && (
        <div className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium flex items-center justify-between rounded-t-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Expira em {container.subscription.daysLeft} dias - Renove agora!
          </div>
          {onRenew && (
            <button
              onClick={() => onRenew(container.id)}
              className="px-3 py-1 bg-white text-yellow-600 text-xs rounded-md font-medium hover:bg-yellow-50"
            >
              Renovar
            </button>
          )}
        </div>
      )}

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

          {/* MySQL Credentials - COM CONEXÃO EXTERNA */}
          {(container.type === 'php' || container.type === 'PHP') && (container.db_name || container.database_name) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center mb-2">
                <Database className="w-4 h-4 mr-2 text-blue-700" />
                <span className="text-xs font-semibold text-blue-900">Credenciais MySQL</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* HOST EXTERNO */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Host:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-white px-2 py-1 rounded border border-blue-200 text-[10px] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {container.mysql_domain || 'mysql'}
                    </code>
                    <button
                      onClick={() => copyToClipboard(container.mysql_domain || 'mysql', 'Host')}
                      className="p-1 hover:bg-blue-100 rounded"
                      title="Copiar host"
                    >
                      <Copy className="w-3 h-3 text-blue-700" />
                    </button>
                  </div>
                </div>

                {/* PORTA EXTERNA */}
                {container.mysql_port && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Porta:</span>
                    <div className="flex items-center gap-1">
                      <code className="bg-white px-2 py-1 rounded border border-blue-200">
                        {container.mysql_port}
                      </code>
                      <button
                        onClick={() => copyToClipboard(container.mysql_port.toString(), 'Porta')}
                        className="p-1 hover:bg-blue-100 rounded"
                        title="Copiar porta"
                      >
                        <Copy className="w-3 h-3 text-blue-700" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Banco:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-white px-2 py-1 rounded border border-blue-200">
                      {container.db_name || container.database_name}
                    </code>
                    <button
                      onClick={() => copyToClipboard(container.db_name || container.database_name, 'Nome do banco')}
                      className="p-1 hover:bg-blue-100 rounded"
                      title="Copiar banco"
                    >
                      <Copy className="w-3 h-3 text-blue-700" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Usuário:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-white px-2 py-1 rounded border border-blue-200">
                      {container.db_user || container.database_user || 'root'}
                    </code>
                    <button
                      onClick={() => copyToClipboard(container.db_user || container.database_user || 'root', 'Usuário')}
                      className="p-1 hover:bg-blue-100 rounded"
                      title="Copiar usuário"
                    >
                      <Copy className="w-3 h-3 text-blue-700" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Senha:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-white px-2 py-1 rounded border border-blue-200 text-[10px] max-w-[120px] overflow-hidden">
                      {showPassword
                        ? (container.db_password || container.database_password || '********')
                        : '••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 hover:bg-blue-100 rounded"
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3 h-3 text-blue-700" />
                      ) : (
                        <Eye className="w-3 h-3 text-blue-700" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(container.db_password || container.database_password || '', 'Senha')}
                      className="p-1 hover:bg-blue-100 rounded"
                      title="Copiar senha"
                    >
                      <Copy className="w-3 h-3 text-blue-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE ACESSO RÁPIDO */}
              <div className="mt-3 pt-2 border-t border-blue-200 flex flex-wrap gap-2">
                {(container.pma_domain || container.phpmyadmin_domain) && (
                  <a
                    href={`http://${container.pma_domain || container.phpmyadmin_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-700 hover:text-blue-800 hover:underline font-medium"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Abrir PHPMyAdmin
                  </a>
                )}
                
                {/* Copiar comando MySQL completo */}
                {container.mysql_domain && container.mysql_port && (
                  <button
                    onClick={() => {
                      const cmd = `mysql -h ${container.mysql_domain} -P ${container.mysql_port} -u ${container.db_user || 'mozhost_user'} -p`;
                      copyToClipboard(cmd, 'Comando MySQL');
                    }}
                    className="inline-flex items-center text-xs text-blue-700 hover:text-blue-800 hover:underline font-medium"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar comando MySQL
                  </button>
                )}
              </div>
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

          {/* Subscription Days Left */}
          {container.subscription?.daysLeft > 0 && !container.subscription?.expired && (
            <div className="flex items-center text-sm text-gray-700">
              <Clock className="w-4 h-4 mr-2 text-gray-600" />
              <span className={`font-medium ${container.subscription?.expiringSoon ? 'text-yellow-600' : 'text-green-600'}`}>
                {container.subscription.daysLeft} dias restantes
              </span>
            </div>
          )}
        </div>

        {/* Near-limit banner */}
        {isNearLimit && (
          <div className="mb-4 p-3 rounded-md bg-orange-50 border border-orange-200 text-orange-800 text-xs">
            Armazenamento quase cheio. Considere fazer upgrade.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {container.status === 'stopped' ? (
              <div className="relative group">
                <button
                  onClick={() => onAction(container.id, 'start')}
                  disabled={actionLoading === 'start' || container.subscription?.expired}
                  className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    container.subscription?.expired
                      ? 'bg-gray-400'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionLoading === 'start' ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}
                  Iniciar
                </button>
                {container.subscription?.expired && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Renove a subscription para iniciar
                  </div>
                )}
              </div>
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
              <div className="relative group">
                <button
                  onClick={() => onAction(container.id, 'start')}
                  disabled={actionLoading === 'start' || container.subscription?.expired}
                  className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    container.subscription?.expired
                      ? 'bg-gray-400'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionLoading === 'start' ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}
                  Iniciar
                </button>
                {container.subscription?.expired && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Renove a subscription para iniciar
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Renew button in actions area */}
          {(container.subscription?.expired || container.subscription?.expiringSoon) && (
            <button
              onClick={() => onRenew && onRenew(container.id)}
              className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-md font-medium"
            >
              Renovar (500 coins)
            </button>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => onUpgrade(container.id)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700"
            >
              <HardDrive className="w-3 h-3 mr-1" /> Upgrade
            </button>
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
    </div>
  );
};

export default ContainerCard;
