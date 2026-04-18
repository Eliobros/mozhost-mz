// CodeEditor/LogsPage.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Download,
  Copy,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { getAuthToken } from './utils';

const LogsPage = ({
  containerId,
  visible,
  onClose,
  maximized,
  onToggleMaximize
}) => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const logsEndRef = useRef(null);
  const wsRef = useRef(null);

  // Conectar WebSocket
  useEffect(() => {
    if (visible && containerId) {
      connectWebSocket();
    }

    return () => {
      cleanup();
    };
  }, [visible, containerId]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const connectWebSocket = () => {
    const token = getAuthToken();
    const wsUrl = `wss://api.mozhost.shop/api/logs/${containerId}?token=${token}`;

    console.log('[Logs] Conectando ao WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Logs] ✅ WebSocket CONECTADO');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'log') {
          const newLog = parseLogLine(message.data);
          setLogs(prev => [...prev, newLog]);
        } else if (message.type === 'history') {
          // Logs históricos iniciais
          const historicalLogs = message.data.map(parseLogLine);
          setLogs(historicalLogs);
        }
      } catch (e) {
        // Mensagem não-JSON, tratar como log direto
        const newLog = parseLogLine(event.data);
        setLogs(prev => [...prev, newLog]);
      }
    };

    ws.onerror = (error) => {
      console.error('[Logs] ❌ ERRO WebSocket:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[Logs] WebSocket fechado');
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const cleanup = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  };

  const parseLogLine = (line) => {
    const timestamp = new Date().toISOString();
    
    let level = 'info';
    const lineLower = String(line).toLowerCase();
    
    if (lineLower.includes('error') || lineLower.includes('✗') || lineLower.includes('❌')) {
      level = 'error';
    } else if (lineLower.includes('warn') || lineLower.includes('⚠️') || lineLower.includes('warning')) {
      level = 'warning';
    } else if (lineLower.includes('✓') || lineLower.includes('✅') || lineLower.includes('success')) {
      level = 'success';
    }

    return {
      timestamp,
      message: String(line),
      level
    };
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.level !== filter) {
      return false;
    }
    
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleClear = () => {
    setLogs([]);
  };

  const handleDownload = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${containerId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const logText = logs.map(log => log.message).join('\n');
    navigator.clipboard.writeText(logText);
    alert('✅ Logs copiados!');
  };

  const getLevelIcon = (level) => {
    switch(level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  if (!visible) return null;

  return (
    <div className={`bg-gray-900 border-t flex flex-col ${
      maximized ? 'absolute inset-0 z-30' : 'h-80'
    }`}>
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300 font-medium">Logs</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}>
              {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Limpar logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopy}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Copiar logs"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownload}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleMaximize}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title={maximized ? "Minimizar" : "Maximizar"}
            >
              {maximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => {
                cleanup();
                onClose();
              }}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>

          <label className="flex items-center space-x-1 text-gray-400 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3 h-3"
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-12 h-12 mb-2 opacity-50" />
            <p>📭 Nenhum log encontrado</p>
            {searchTerm && <p className="text-xs mt-1">Tente ajustar o filtro</p>}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((log, index) => (
              <div 
                key={index}
                className={`flex gap-2 p-1.5 rounded hover:bg-gray-800 ${
                  log.level === 'error' ? 'bg-red-900 bg-opacity-20 border-l-2 border-red-500' :
                  log.level === 'warning' ? 'bg-yellow-900 bg-opacity-20 border-l-2 border-yellow-500' :
                  log.level === 'success' ? 'bg-green-900 bg-opacity-20 border-l-2 border-green-500' :
                  'border-l-2 border-transparent'
                }`}
              >
                <span className="text-gray-500 whitespace-nowrap text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="whitespace-nowrap">
                  {getLevelIcon(log.level)}
                </span>
                <span className={`flex-1 break-words ${
                  log.level === 'error' ? 'text-red-300' :
                  log.level === 'warning' ? 'text-yellow-300' :
                  log.level === 'success' ? 'text-green-300' :
                  'text-gray-300'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-1.5 border-t border-gray-700 flex justify-between text-xs text-gray-500">
        <span>Total: {logs.length}</span>
        <span>Exibindo: {filteredLogs.length}</span>
      </div>
    </div>
  );
};

export default LogsPage;
