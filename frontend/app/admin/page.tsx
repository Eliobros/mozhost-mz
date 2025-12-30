// admin/page.tsx
"use client"

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Users } from './components/Users';
import { Containers } from './components/Containers';
import { Coins } from './components/Coins';
import { Modal } from './components/Modal';
import { AuthGuard } from './components/AuthGuard';
import { useAdminAuth } from './hooks/useAdminAuth';

export default function AdminPanel() {
  const { password, isAuthenticated, login } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [modal, setModal] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleModalSuccess = () => {
    setRefreshKey(prev => prev + 1); // Force refresh dos componentes
  };

  // Se não autenticado, mostra tela de login
  if (!isAuthenticated) {
    return <AuthGuard onAuthenticate={login} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
      />
      
      <div className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && (
          <Dashboard password={password} key={`dashboard-${refreshKey}`} />
        )}
        
        {currentPage === 'users' && (
          <Users 
            password={password} 
            onOpenModal={setModal}
            key={`users-${refreshKey}`}
          />
        )}
        
        {currentPage === 'containers' && (
          <Containers 
            password={password}
            key={`containers-${refreshKey}`}
          />
        )}
        
        {currentPage === 'coins' && (
          <Coins 
            password={password} 
            onOpenModal={setModal}
            key={`coins-${refreshKey}`}
          />
        )}
      </div>

      <Modal 
        modal={modal} 
        onClose={() => setModal(null)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
