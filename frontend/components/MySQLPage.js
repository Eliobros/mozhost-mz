"use client"

// components/MySQLPage.js

import React, { useState, useEffect } from 'react';
import { Database, Copy, ExternalLink, Trash2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

const MySQLPage = () => {
  const [database, setDatabase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState('');
  const [codeTab, setCodeTab] = useState('nodejs');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

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

      const response = await fetch('https://api.mozhost.shop/api/mysql/credentials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
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
      const response = await fetch('https://api.mozhost.shop/api/mysql/create', {
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

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.shop/api/mysql/test', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setTestResult(data.success ? 'success' : 'error');
      setTimeout(() => setTestResult(null), 5000);
    } catch (error) {
      setTestResult('error');
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-gray-200 h-64 rounded-lg"></div>
        <div className="bg-gray-200 h-32 rounded-lg"></div>
      </div>
    );
  }

  if (!database) {
    return (
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
          Crie um banco de dados MySQL para usar nos seus bots e aplicações
        </p>
        <button
          onClick={createDatabase}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Criando...' : 'Criar Meu Database'}
        </button>
      </div>
    );
  }

  const connectionString = `mysql://${database.credentials.user}:${database.credentials.password}@${database.credentials.host}:${database.credentials.port}/${database.credentials.database}`;

  const codeExamples = {
    nodejs: `const mysql = require('mysql2/promise');

const db = await mysql.createConnection({
  host: '${database.credentials.host}',
  port: ${database.credentials.port},
  user: '${database.credentials.user}',
  password: '${database.credentials.password}',
  database: '${database.credentials.database}'
});

// Exemplo de query
const [rows] = await db.execute('SELECT * FROM tabela');
console.log(rows);`,

    python: `import mysql.connector

db = mysql.connector.connect(
    host='${database.credentials.host}',
    port=${database.credentials.port},
    user='${database.credentials.user}',
    password='${database.credentials.password}',
    database='${database.credentials.database}'
)

cursor = db.cursor()
cursor.execute('SELECT * FROM tabela')
rows = cursor.fetchall()
for row in rows:
    print(row)`,

    php: `<?php
$host = '${database.credentials.host}';
$port = ${database.credentials.port};
$db = '${database.credentials.database}';
$user = '${database.credentials.user}';
$pass = '${database.credentials.password}';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query('SELECT * FROM tabela');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
} catch(PDOException $e) {
    echo "Erro: " . $e->getMessage();
}
?>`
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Credenciais do Database */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Credenciais do Database
        </h2>

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

        {/* Conexão Externa MySQL */}
        {database.external_mysql && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              🌐 Conexão Externa MySQL
            </h3>
            
            <div className="space-y-3">
              <CredentialRow
                label="Host Externo"
                value={database.external_mysql.host}
                onCopy={() => copyToClipboard(database.external_mysql.host, 'Host Externo')}
                copied={copied === 'Host Externo'}
              />
              <CredentialRow
                label="Porta Externa"
                value={database.external_mysql.port}
                onCopy={() => copyToClipboard(database.external_mysql.port.toString(), 'Porta Externa')}
                copied={copied === 'Porta Externa'}
              />
            </div>
            
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded text-sm">
              <p className="text-purple-900 font-medium mb-2">💡 Conexão de fora da MozHost:</p>
              <code className="block bg-white p-2 rounded text-xs overflow-x-auto">
                mysql -h {database.external_mysql.host} -P {database.external_mysql.port} -u {database.credentials.user} -p
              </code>
              <button
                onClick={() => copyToClipboard(
                  `mysql -h ${database.external_mysql.host} -P ${database.external_mysql.port} -u ${database.credentials.user} -p`,
                  'Comando MySQL'
                )}
                className="mt-2 text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                {copied === 'Comando MySQL' ? (
                  <><Check className="w-3 h-3" /> Copiado!</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copiar comando</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="mt-6 flex gap-3">
          <a
            href={database.phpmyadmin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir phpMyAdmin
          </a>

          <button
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          >
            {testing ? 'Testando...' : '🔍 Testar Conexão'}
          </button>
        </div>

        {testResult === 'success' && (
          <div className="mt-3 text-green-600 text-sm flex items-center gap-1">
            <Check className="w-4 h-4" /> Conexão OK! Database funcionando perfeitamente.
          </div>
        )}
        {testResult === 'error' && (
          <div className="mt-3 text-red-600 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Falha na conexão. Verifique as credenciais.
          </div>
        )}
      </div>

      {/* Uso de Armazenamento */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📊 Uso de Armazenamento
        </h3>
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
          {database.usage.percentage > 90 && '⚠️ Armazenamento quase cheio! Considere limpar dados antigos.'}
          {database.usage.percentage > 75 && database.usage.percentage <= 90 && '⚡ Considere limpar dados antigos em breve.'}
          {database.usage.percentage <= 75 && '✅ Armazenamento em bom nível.'}
        </p>
      </div>

      {/* Avisos de Segurança */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5" />
          ⚠️ Importante - Segurança
        </h4>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>Nunca compartilhe suas credenciais publicamente</li>
          <li>Use variáveis de ambiente (.env) para armazenar credenciais</li>
          <li>Não commite credenciais no Git (.gitignore no .env)</li>
          <li>Faça backups regulares do seu database</li>
          <li>Use conexões SSL quando possível</li>
        </ul>
      </div>

      {/* Exemplos de Código */}
      <div className="bg-gray-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📚 Exemplos de Conexão</h3>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button 
            className={`px-4 py-2 font-medium transition-colors ${
              codeTab === 'nodejs' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setCodeTab('nodejs')}
          >
            Node.js
          </button>
          <button 
            className={`px-4 py-2 font-medium transition-colors ${
              codeTab === 'python' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setCodeTab('python')}
          >
            Python
          </button>
          <button 
            className={`px-4 py-2 font-medium transition-colors ${
              codeTab === 'php' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setCodeTab('php')}
          >
            PHP
          </button>
        </div>

        {/* Código */}
        <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
          {codeExamples[codeTab]}
        </pre>

        <button
          onClick={() => copyToClipboard(codeExamples[codeTab], 'Código')}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
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
  );
};

const CredentialRow = ({ label, value, onCopy, isPassword, copied }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-b-0">
      <span className="font-semibold text-gray-700">{label}:</span>
      <div className="flex items-center gap-2">
        <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm max-w-xs overflow-x-auto">
          {isPassword && !show ? '••••••••••••' : value}
        </code>
        {isPassword && (
          <button
            onClick={() => setShow(!show)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
