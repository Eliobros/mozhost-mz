'use client';
import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Usuários', icon: '👥' },
  { id: 'containers', label: 'Containers', icon: '🐳' },
  { id: 'coins', label: 'Coins', icon: '💰' }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, isOpen = false, onClose }) => {
  const navContent = (
    <nav className="space-y-2">
      {menuItems.map(item => (
        <button
          key={item.id}
          onClick={() => onPageChange(item.id)}
          className={`w-full text-left p-3 rounded transition-all duration-200 flex items-center gap-3 ${
            currentPage === item.id
              ? 'bg-blue-600 text-white shadow-lg'
              : 'hover:bg-gray-800 text-gray-300'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block w-64 bg-gray-900 text-white min-h-screen p-4 flex-shrink-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">🚀 MozHost</h1>
          <p className="text-sm text-gray-400 mt-1">Painel Administrativo</p>
        </div>
        {navContent}
        <div className="mt-8 pt-8 border-t border-gray-700 text-xs text-gray-400 space-y-1">
          <p>Desenvolvido por MozHost</p>
          <p>v1.0.0</p>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white p-4 transform transition-transform duration-300 lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">🚀 MozHost</h1>
            <p className="text-xs text-gray-400 mt-1">Painel Admin</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-800 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent}
        <div className="absolute bottom-4 left-4 right-4 pt-4 border-t border-gray-700 text-xs text-gray-400 space-y-1">
          <p>Desenvolvido por MozHost</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </>
  );
};
