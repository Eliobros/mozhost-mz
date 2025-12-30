// admin/components/Sidebar.tsx
'use client';

import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
  { id: 'users', label: '👥 Usuários', icon: '👥' },
  { id: 'containers', label: '🐳 Containers', icon: '🐳' },
  { id: 'coins', label: '💰 Coins', icon: '💰' }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">🚀 MozHost</h1>
        <p className="text-sm text-gray-400 mt-1">Painel Administrativo</p>
      </div>
      
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

      <div className="mt-8 pt-8 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <p>Desenvolvido por MozHost</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </div>
  );
};
