import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import CodeEditor from './CodeEditor';
import WebTerminal from './WebTerminal/WebTerminal';
import SuportePage from './SuportPage';
import ContainersPage from './ContainersPage';
import MonitoringPage from './MonitoringPage';
import ProfilePage from './ProfilePage';
import SettingsPage from './SettingsPage';
import ResetPasswordPage from './ResetPasswordPage';
import TermsConditionsPage from './TermsConditionsPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import WhatsAppLink from './WhatsAppLink';
import DatabasePage from './DatabasePage';
import DashboardLayout from './DashboardLayout';
//import CoinsPage from './CoinsPage';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setCurrentPage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const userData = localStorage.getItem('mozhost_user');

      if (!token || !userData) {
        setLoading(false);
        return;
      }

      const response = await fetch('https://api.mozhost.topaziocoin.online/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setUnreadNotifications(0);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('mozhost_token');
        localStorage.removeItem('mozhost_user');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      localStorage.removeItem('mozhost_token');
      localStorage.removeItem('mozhost_user');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando MozHost...</p>
        </div>
      </div>
    );
  }

  if (currentPage.startsWith('reset')) {
    return <ResetPasswordPage />;
  }

  if (currentPage === 'terms') {
    return <TermsConditionsPage onBack={() => {
      window.location.hash = isAuthenticated ? 'dashboard' : '';
      setCurrentPage(isAuthenticated ? 'dashboard' : 'login');
    }} />;
  }

  if (currentPage === 'privacy') {
    return <PrivacyPolicyPage onBack={() => {
      window.location.hash = isAuthenticated ? 'dashboard' : '';
      setCurrentPage(isAuthenticated ? 'dashboard' : 'login');
    }} />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setUnreadNotifications={setUnreadNotifications} />;
      case 'files':
      case 'editor':
        return <CodeEditor />;
      case 'terminal':
        return <WebTerminal />;
      case 'containers':
        return <ContainersPage />;
      case 'monitoring':
        return <MonitoringPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      case 'whatsapp':
        return <WhatsAppLink />;
      case 'database':
        return <DatabasePage />;
      case 'suporte':
	return <SuportePage />;
      //case 'coins':
      //  return <CoinsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage}>
      {renderCurrentPage()}
    </DashboardLayout>
  );
};

export default App;
