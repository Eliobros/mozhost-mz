import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import CodeEditor from './CodeEditor';
import WebTerminal from './WebTerminal';
import ContainersPage from './ContainersPage';
import MonitoringPage from './MonitoringPage';
import ProfilePage from './ProfilePage';
import SettingsPage from './SettingsPage';
import TermsConditionsPage from './TermsConditionsPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    checkAuthentication();
  }, []);

  // Escutar mudanças na URL (simulação básica de roteamento)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setCurrentPage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Verificar hash inicial

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

      // Verificar se token ainda é válido
      const response = await fetch('http://50.116.46.130:3001/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        // Token inválido, limpar dados
        localStorage.removeItem('mozhost_token');
        localStorage.removeUser('mozhost_user');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      localStorage.removeItem('mozhost_token');
      localStorage.removeItem('mozhost_user');
    } finally {
      setLoading(false);
    }
  };

  // Tela de loading
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

  // Páginas legais (acessíveis sem autenticação)
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

  // Se não autenticado, mostrar login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Roteamento básico baseado na página atual
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
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
        return <SettingsPage />; // Implementaremos depois se necessário
      default:
        return <Dashboard />;
    }
  };

  return renderCurrentPage();
};

export default App;
