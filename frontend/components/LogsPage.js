// components/LogsPage.js
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function LogsPage({ containerId }) {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('all'); // all, error, warning, info
  const [searchTerm, setSearchTerm] = useState('');
  
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);

  // Conectar WebSocket
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Subscrever nos logs deste container
      socket.emit('subscribe-logs', containerId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Receber linhas de log
    socket.on('log-line', (logData) => {
      const newLog = parseLogLine(logData);
      setLogs(prev => [...prev, newLog]);
    });

    return () => {
      socket.emit('unsubscribe-logs', containerId);
      socket.disconnect();
    };
  }, [containerId]);

  // Auto-scroll quando novos logs chegarem
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Parsear linha de log
  const parseLogLine = (line) => {
    const timestamp = new Date().toISOString();
    
    // Detectar nível do log
    let level = 'info';
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('✗')) {
      level = 'error';
    } else if (line.toLowerCase().includes('warn') || line.toLowerCase().includes('⚠️')) {
      level = 'warning';
    } else if (line.includes('✓') || line.includes('✅')) {
      level = 'success';
    }

    return {
      timestamp,
      message: line,
      level
    };
  };

  // Filtrar logs
  const filteredLogs = logs.filter(log => {
    // Filtro por nível
    if (filter !== 'all' && log.level !== filter) {
      return false;
    }
    
    // Filtro por busca
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Limpar logs
  const handleClear = () => {
    setLogs([]);
  };

  // Download logs
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

  // Copiar logs
  const handleCopy = () => {
    const logText = logs.map(log => log.message).join('\n');
    navigator.clipboard.writeText(logText);
    alert('Logs copiados!');
  };

  return (
    <div className="logs-page">
      {/* Header com controles */}
      <div className="logs-header">
        <div className="logs-title">
          <h3>📜 Logs do Container</h3>
          <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </span>
        </div>

        <div className="logs-controls">
          {/* Busca */}
          <input
            type="text"
            placeholder="🔍 Buscar nos logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          {/* Filtro por nível */}
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>

          {/* Auto-scroll */}
          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>

          {/* Botões de ação */}
          <button onClick={handleClear} className="btn-clear">
            🗑️ Limpar
          </button>
          <button onClick={handleCopy} className="btn-copy">
            📋 Copiar
          </button>
          <button onClick={handleDownload} className="btn-download">
            💾 Download
          </button>
        </div>
      </div>

      {/* Área de logs */}
      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="logs-empty">
            <p>📭 Nenhum log encontrado</p>
            {searchTerm && <p className="hint">Tente ajustar o filtro ou busca</p>}
          </div>
        ) : (
          <div className="logs-content">
            {filteredLogs.map((log, index) => (
              <div key={index} className={`log-line ${log.level}`}>
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="log-level">
                  {getLevelIcon(log.level)}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer com estatísticas */}
      <div className="logs-footer">
        <span>Total: {logs.length} linhas</span>
        <span>Exibindo: {filteredLogs.length} linhas</span>
      </div>

      <style jsx>{`
        .logs-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1e1e1e;
          color: #d4d4d4;
        }

        .logs-header {
          padding: 1rem;
          border-bottom: 1px solid #333;
          background: #252526;
        }

        .logs-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .logs-title h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .status {
          font-size: 0.9rem;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
        }

        .status.connected {
          color: #4caf50;
        }

        .status.disconnected {
          color: #f44336;
        }

        .logs-controls {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 0.5rem;
          background: #3c3c3c;
          border: 1px solid #555;
          border-radius: 4px;
          color: #d4d4d4;
          font-size: 0.9rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #007acc;
        }

        .filter-select {
          padding: 0.5rem;
          background: #3c3c3c;
          border: 1px solid #555;
          border-radius: 4px;
          color: #d4d4d4;
          cursor: pointer;
        }

        .auto-scroll-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .auto-scroll-toggle input {
          cursor: pointer;
        }

        .btn-clear, .btn-copy, .btn-download {
          padding: 0.5rem 1rem;
          background: #3c3c3c;
          border: 1px solid #555;
          border-radius: 4px;
          color: #d4d4d4;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn-clear:hover {
          background: #d32f2f;
          border-color: #d32f2f;
        }

        .btn-copy:hover, .btn-download:hover {
          background: #007acc;
          border-color: #007acc;
        }

        .logs-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .logs-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #888;
        }

        .logs-empty p {
          margin: 0.5rem 0;
        }

        .hint {
          font-size: 0.9rem;
          color: #666;
        }

        .logs-content {
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .log-line {
          display: flex;
          gap: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-left: 3px solid transparent;
          transition: background 0.2s;
        }

        .log-line:hover {
          background: rgba(255,255,255,0.05);
        }

        .log-line.error {
          border-left-color: #f44336;
          background: rgba(244, 67, 54, 0.1);
        }

        .log-line.warning {
          border-left-color: #ff9800;
          background: rgba(255, 152, 0, 0.1);
        }

        .log-line.success {
          border-left-color: #4caf50;
          background: rgba(76, 175, 80, 0.1);
        }

        .log-timestamp {
          color: #858585;
          white-space: nowrap;
          font-size: 0.85rem;
        }

        .log-level {
          white-space: nowrap;
        }

        .log-message {
          flex: 1;
          word-break: break-word;
        }

        .logs-footer {
          padding: 0.75rem 1rem;
          border-top: 1px solid #333;
          background: #252526;
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #858585;
        }

        /* Scrollbar customizada */
        .logs-container::-webkit-scrollbar {
          width: 10px;
        }

        .logs-container::-webkit-scrollbar-track {
          background: #1e1e1e;
        }

        .logs-container::-webkit-scrollbar-thumb {
          background: #424242;
          border-radius: 5px;
        }

        .logs-container::-webkit-scrollbar-thumb:hover {
          background: #4e4e4e;
        }
      `}</style>
    </div>
  );
}

// Helper function para ícones de nível
function getLevelIcon(level) {
  switch(level) {
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'success': return '✅';
    case 'info':
    default: return 'ℹ️';
  }
}
