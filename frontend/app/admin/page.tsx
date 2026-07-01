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
import { Campaigns } from './components/Campaigns';
import { SupportAgents } from './components/SupportAgents';

export default function AdminPanel() {
  const { password, isAuthenticated, login } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [modal, setModal] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleModalSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!isAuthenticated) {
    return <AuthGuard onAuthenticate={login} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        currentPage={currentPage} 
        onPageChange={(page) => {
          setCurrentPage(page);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 overflow-auto min-w-0">
        <div className="sticky top-0 z-20 bg-gray-900 text-white p-3 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-lg">🚀 MozHost Admin</span>
          <div className="w-10" />
        </div>

        {currentPage === 'dashboard' && <Dashboard password={password} key={`dashboard-${refreshKey}`} />}
        {currentPage === 'users' && <Users password={password} onOpenModal={setModal} key={`users-${refreshKey}`} />}
        {currentPage === 'containers' && <Containers password={password} key={`containers-${refreshKey}`} />}
        {currentPage === 'coins' && <Coins password={password} onOpenModal={setModal} key={`coins-${refreshKey}`} />}
        {currentPage === 'campaigns' && <Campaigns password={password} key={`campaigns-${refreshKey}`} />}
        {currentPage === 'support-agents' && <SupportAgents password={password} key={`support-agents-${refreshKey}`} />}
      </div>

      <Modal modal={modal} onClose={() => setModal(null)} onSuccess={handleModalSuccess} />
    </div>
  );
}
