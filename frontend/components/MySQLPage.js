// components/MySQLPage.js

import React, { useState, useEffect } from 'react';
import { Database, Copy, ExternalLink, Trash2, Check, AlertCircle } from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const MySQLPage = () => {
  const [database, setDatabase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('mozhost_token');
      
      if (!token) {
        setError('Token não encontrado. Faça login novamente.');
        setLoading(false);
        return;
      }

      const response = await fetch('https://api.mozhost.topaziocoin.online/api/mysql/credentials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        // Redirecionar para login se necessário
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setDatabase(data);
      } else {
        setError('Erro ao carregar database.');
      }
    } catch (error) {
      console.error('Erro ao carregar database:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const createDatabase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/mysql/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadDatabase();
      } else {
        setError('Falha ao criar database. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao criar database:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="bg-gray-200 h-64 rounded-lg"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!database) {
    return (
      <DashboardLayout currentPage="mysql">
        <div className="max-w-2xl mx-auto text-center py-12">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          
          <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">MySQL Database</h2>
          <p className="text-gray-600 mb-8">
            Crie um banco de dados MySQL para usar nos seus bots
          </p>
          <button
            onClick={createDatabase}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando...' : 'Criar Meu Database'}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const connectionString = `mysql://${database.credentials.user}:${database.credentials.password}@${database.credentials.host}:${database.credentials.port}/${database.credentials.database}`;

console.log('Database completo:', database);
console.log('phpMyAdmin URL:', database.phpmyadmin);


  return (
    <DashboardLayout currentPage="mysql">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Credenciais do Database</h2>

          <div className="space-y-4">
            <CredentialRow
              label="Host"
              value={database.credentials.host}
              onCopy={() => copyToClipboard(database.credentials.host, 'Host')}
              copied={copied === 'Host'}
            />
            <CredentialRow
              label="Porta"
              value={database.credentials.port}
              onCopy={() => copyToClipboard(database.credentials.port.toString(), 'Porta')}
              copied={copied === 'Porta'}
            />
            <CredentialRow
              label="Database"
              value={database.credentials.database}
              onCopy={() => copyToClipboard(database.credentials.database, 'Database')}
              copied={copied === 'Database'}
            />
            <CredentialRow
              label="Usuário"
              value={database.credentials.user}
              onCopy={() => copyToClipboard(database.credentials.user, 'Usuário')}
              copied={copied === 'Usuário'}
            />
            <CredentialRow
              label="Senha"
              value={database.credentials.password}
              onCopy={() => copyToClipboard(database.credentials.password, 'Senha')}
              copied={copied === 'Senha'}
              isPassword
            />
            <CredentialRow
              label="Connection String"
              value={connectionString}
              onCopy={() => copyToClipboard(connectionString, 'Connection String')}
              copied={copied === 'Connection String'}
            />
          </div>

          <div className="mt-6">
            <a
              href={database.phpmyadmin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
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
              className={`h-4 rounded-full transition-all ${
                database.usage.percentage > 90 ? 'bg-red-600' :
                database.usage.percentage > 75 ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${Math.min(database.usage.percentage, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {database.usage.percentage > 90 && '⚠️ Armazenamento quase cheio!'}
            {database.usage.percentage > 75 && database.usage.percentage <= 90 && '⚡ Considere limpar dados antigos'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Exemplo de Conexão (Node.js)</h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`const mysql = require('mysql2/promise');

const db = await mysql.createConnection({
  host: '${database.credentials.host}',
  port: ${database.credentials.port},
  user: '${database.credentials.user}',
  password: '${database.credentials.password}',
  database: '${database.credentials.database}'
});

// Exemplo de query
const [rows] = await db.execute('SELECT * FROM tabela');
console.log(rows);`}
          </pre>
          <button
            onClick={() => copyToClipboard(`const mysql = require('mysql2/promise');

const db = await mysql.createConnection({
  host: '${database.credentials.host}',
  port: ${database.credentials.port},
  user: '${database.credentials.user}',
  password: '${database.credentials.password}',
  database: '${database.credentials.database}'
});`, 'Código')}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {copied === 'Código' ? (
              <>
                <Check className="w-4 h-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar código
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

const CredentialRow = ({ label, value, onCopy, isPassword, copied }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center justify-between border-b pb-2">
      <span className="font-semibold text-gray-700">{label}:</span>
      <div className="flex items-center gap-2">
        <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">
          {isPassword && !show ? '••••••••••••' : value}
        </code>
        {isPassword && (
          <button
            onClick={() => setShow(!show)}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
        <button
          onClick={onCopy}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title={`Copiar ${label}`}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MySQLPage;
