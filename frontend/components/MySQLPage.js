// components/MySQLPage.js

import React, { useState, useEffect } from 'react';
import { Database, Copy, ExternalLink, Trash2 } from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const MySQLPage = () => {
  const [database, setDatabase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/mysql/credentials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDatabase(data);
      }
    } catch (error) {
      console.error('Erro ao carregar database:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDatabase = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/mysql/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadDatabase();
      }
    } catch (error) {
      console.error('Erro ao criar database:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Carregando...</div>
      </DashboardLayout>
    );
  }

  if (!database) {
    return (
      <DashboardLayout currentPage="mysql">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">MySQL Database</h2>
          <p className="text-gray-600 mb-8">
            Crie um banco de dados MySQL para usar nos seus bots
          </p>
          <button
            onClick={createDatabase}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Criar Meu Database
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="mysql">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Credenciais do Database</h2>

          <div className="space-y-4">
            <CredentialRow 
              label="Host" 
              value={database.credentials.host}
              onCopy={() => copyToClipboard(database.credentials.host)}
            />
            <CredentialRow 
              label="Porta" 
              value={database.credentials.port}
              onCopy={() => copyToClipboard(database.credentials.port.toString())}
            />
            <CredentialRow 
              label="Database" 
              value={database.credentials.database}
              onCopy={() => copyToClipboard(database.credentials.database)}
            />
            <CredentialRow 
              label="Usuário" 
              value={database.credentials.user}
              onCopy={() => copyToClipboard(database.credentials.user)}
            />
            <CredentialRow 
              label="Senha" 
              value={database.credentials.password}
              onCopy={() => copyToClipboard(database.credentials.password)}
              isPassword
            />
          </div>

          <div className="mt-6">
            <a
              href={database.phpmyadmin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir phpMyAdmin
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Uso de Armazenamento</h3>
          <div className="mb-2 flex justify-between text-sm">
            <span>Usado: {database.usage.used_mb} MB</span>
            <span>Limite: {database.usage.limit_mb} MB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full"
              style={{ width: `${Math.min(database.usage.percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const CredentialRow = ({ label, value, onCopy, isPassword }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center justify-between border-b pb-2">
      <span className="font-semibold text-gray-700">{label}:</span>
      <div className="flex items-center gap-2">
        <code className="bg-gray-100 px-3 py-1 rounded">
          {isPassword && !show ? '••••••••••••' : value}
        </code>
        {isPassword && (
          <button
            onClick={() => setShow(!show)}
            className="text-sm text-blue-600"
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
        <button
          onClick={onCopy}
          className="text-gray-600 hover:text-gray-900"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MySQLPage;
