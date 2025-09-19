import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock, 
  Server, 
  CreditCard,
  Settings,
  Trash2,
  Filter,
  Search
} from 'lucide-react';

const NotificationsSystem = ({ isOpen, onClose, onUnreadChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Simular carregamento de notificações
      // Em produção, faria uma requisição para a API
      const mockNotifications = [
        { id: 1, type: 'success', title: 'Container criado', message: 'Seu container "meu-bot" foi criado.', timestamp: new Date(Date.now() - 5 * 60 * 1000), read: false, category: 'container' },
        { id: 2, type: 'info', title: 'Container iniciado', message: 'O container "meu-bot" foi iniciado.', timestamp: new Date(Date.now() - 30 * 60 * 1000), read: false, category: 'container' },
        { id: 3, type: 'warning', title: 'Armazenamento quase cheio', message: 'Falta pouco para atingir o limite. Considere upgrade.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), read: true, category: 'billing' },
        { id: 4, type: 'info', title: 'Boas-vindas', message: 'Bem-vindo ao MozHost! Você começa com 250 coins.', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), read: true, category: 'welcome' },
        { id: 5, type: 'info', title: 'Upgrade de armazenamento', message: 'Aumente armazenamento usando coins.', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), read: true, category: 'system' }
      ];
      
      setNotifications(mockNotifications);
      if (onUnreadChange) {
        const unread = mockNotifications.filter(n => !n.read).length;
        onUnreadChange(unread);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // Em produção, faria uma requisição para marcar como lida
      const next = notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
      setNotifications(next);
      if (onUnreadChange) onUnreadChange(next.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Em produção, faria uma requisição para marcar todas como lidas
      const next = notifications.map(n => ({ ...n, read: true }));
      setNotifications(next);
      if (onUnreadChange) onUnreadChange(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Em produção, faria uma requisição para deletar
      const next = notifications.filter(n => n.id !== notificationId);
      setNotifications(next);
      if (onUnreadChange) onUnreadChange(next.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      success: CheckCircle,
      error: AlertCircle,
      warning: AlertCircle,
      info: Info
    };
    return icons[type] || Info;
  };

  const getNotificationColor = (type) => {
    const colors = {
      success: 'text-green-600 bg-green-100',
      error: 'text-red-600 bg-red-100',
      warning: 'text-yellow-600 bg-yellow-100',
      info: 'text-blue-600 bg-blue-100'
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      container: Server,
      system: Settings,
      billing: CreditCard,
      welcome: CheckCircle
    };
    return icons[category] || Info;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days} dias atrás`;
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || notification.category === filter;
    const matchesSearch = notification.title.toLowerCase().includes(search.toLowerCase()) ||
                         notification.message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Bell className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar notificações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'container', 'system', 'billing', 'welcome'].map(category => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === category
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {category === 'all' ? 'Todas' :
                   category === 'container' ? 'Containers' :
                   category === 'system' ? 'Sistema' :
                   category === 'billing' ? 'Cobrança' : 'Boas-vindas'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando notificações...</p>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {search || filter !== 'all' ? 'Nenhuma notificação encontrada' : 'Nenhuma notificação'}
                </h3>
                <p className="text-gray-500">
                  {search || filter !== 'all' 
                    ? 'Tente ajustar os filtros ou termo de busca'
                    : 'Você receberá notificações sobre eventos importantes aqui'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const CategoryIcon = getCategoryIcon(notification.category);
                const colorClasses = getNotificationColor(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${colorClasses} flex items-center justify-center mr-3`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center text-xs text-gray-500">
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              <span className="mr-3 capitalize">{notification.category}</span>
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{formatTimeAgo(notification.timestamp)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-4">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-gray-400 hover:text-green-600 transition-colors"
                                title="Marcar como lida"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Deletar notificação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {filteredNotifications.length} de {notifications.length} notificações
            </p>
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSystem;