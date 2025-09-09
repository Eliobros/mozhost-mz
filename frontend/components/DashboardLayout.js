import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Home,
  FileText,
  Terminal,
  Activity,
  Bell,
  Search
} from 'lucide-react';

const DashboardLayout = ({ children, currentPage = 'dashboard' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications] = useState(3); // Mock notifications

  useEffect(() => {
    // Carregar dados do usuário do localStorage
    const userData = localStorage.getItem('mozhost_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mozhost_token');
    localStorage.removeItem('mozhost_user');
    window.location.href = '/';
  };

  const navigation = [
    { name: 'Dashboard', href: '#dashboard', icon: Home, current: currentPage === 'dashboard' },
    { name: 'Containers', href: '#containers', icon: Server, current: currentPage === 'containers' },
    { name: 'Editor', href: '#files', icon: FileText, current: currentPage === 'files' },
    { name: 'Terminal', href: '#terminal', icon: Terminal, current: currentPage === 'terminal' },
    { name: 'Monitoramento', href: '#monitoring', icon: Activity, current: currentPage === 'monitoring' },
    { name: 'Configurações', href: '#settings', icon: Settings, current: currentPage === 'settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-col bg-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent navigation={navigation} user={user} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent navigation={navigation} user={user} onLogout={handleLogout} />
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 pl-3" />
              <input
                className="block h-full w-full border-0 py-0 pl-10 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm bg-transparent"
                placeholder="Pesquisar containers, arquivos..."
                type="search"
              />
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <button type="button" className="relative -m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <div className="flex items-center gap-x-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span className="hidden lg:flex lg:items-center">
                    <span className="ml-2 text-sm font-semibold leading-6 text-gray-900">
                      {user?.username || 'Usuário'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <button 
                  onClick={() => window.location.hash = 'terms'}
                  className="hover:text-gray-900 transition-colors"
                >
                  Termos e Condições
                </button>
                <button 
                  onClick={() => window.location.hash = 'privacy'}
                  className="hover:text-gray-900 transition-colors"
                >
                  Política de Privacidade
                </button>
                <a 
                  href="mailto:support@mozhost.com" 
                  className="hover:text-gray-900 transition-colors"
                >
                  Suporte
                </a>
              </div>
              <div className="mt-4 sm:mt-0 text-sm text-gray-500">
                © 2025 Eliobros Tech. Todos os direitos reservados.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

const SidebarContent = ({ navigation, user, onLogout }) => (
  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-800 px-6 pb-4">
    {/* Logo */}
    <div className="flex h-16 shrink-0 items-center">
      <div className="flex items-center">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
          <Server className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">MozHost</h1>
          <p className="text-xs text-blue-200">Bot Hosting</p>
        </div>
      </div>
    </div>

    {/* User info */}
    {user && (
      <div className="bg-white/10 rounded-lg p-4 mb-2">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-xs text-blue-200 capitalize">{user.plan} Plan</p>
          </div>
        </div>
        <div className="mt-3 flex justify-between text-xs text-blue-200">
          <span>Containers: {user.maxContainers || 2}</span>
          <span>RAM: {user.maxRamMb || 512}MB</span>
        </div>
      </div>
    )}

    {/* Navigation */}
    <nav className="flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`
                    group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors
                    ${item.current
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </li>
        
        {/* Quick Actions */}
        <li className="mt-auto">
          <div className="bg-white/5 rounded-lg p-4">
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all">
              <Plus className="w-4 h-4" />
              Novo Container
            </button>
          </div>
          
          <button
            onClick={onLogout}
            className="group -mx-2 flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-red-200 hover:text-white hover:bg-red-600/20 transition-colors mt-2"
          >
            <LogOut className="h-6 w-6 shrink-0" />
            Sair
          </button>
        </li>
      </ul>
    </nav>
  </div>
);

export default DashboardLayout;
