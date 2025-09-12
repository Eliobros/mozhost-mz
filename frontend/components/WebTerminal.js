import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Terminal, 
  Server, 
  Play, 
  Square, 
  Trash2, 
  Settings, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  Copy,
  Download,
  Upload
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const WebTerminal = () => {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState('dark');

  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    loadContainers();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedContainer && !socket) {
      connectToTerminal();
    }
  }, [selectedContainer]);

  useEffect(() => {
    // Auto-scroll para baixo quando novo output
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const loadContainers = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/containers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers);
        if (data.containers.length > 0 && !selectedContainer) {
          setSelectedContainer(data.containers[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectToTerminal = () => {
    const token = localStorage.getItem('mozhost_token');
    
    const newSocket = io('https://api.mozhost.topaziocoin.online', {
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to terminal server');
      setConnected(true);
      
      // Conectar ao terminal do container
      newSocket.emit('connect-terminal', {
        containerId: selectedContainer.id
      });
    });

    newSocket.on('terminal-connected', (data) => {
      setTerminalOutput(prev => prev + `\n🚀 Conectado ao container: ${data.containerId.substring(0, 8)}\n`);
      addWelcomeMessage();
    });

    newSocket.on('terminal-output', (data) => {
      // Limpar códigos ANSI para deixar terminal mais limpo
      const cleanData = cleanAnsiCodes(data.data);
      setTerminalOutput(prev => prev + cleanData);
    });

    newSocket.on('terminal-error', (data) => {
      setTerminalOutput(prev => prev + `\n❌ Erro: ${data.error}\n`);
    });

    newSocket.on('terminal-exit', (data) => {
      setTerminalOutput(prev => prev + `\n💀 Terminal encerrado (código: ${data.code})\n`);
      setConnected(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from terminal server');
      setConnected(false);
    });

    setSocket(newSocket);
  };

  // Função para limpar códigos ANSI
  const cleanAnsiCodes = (text) => {
    // Remove códigos ANSI mais comuns
    return text
      .replace(/\x1B\[[?]?[0-9;]*[a-zA-Z]/g, '') // Códigos de escape ANSI
      .replace(/\x1B\][0-9];[^\x07]*\x07/g, '') // Títulos de janela
      .replace(/\[\?2004[hl]/g, '') // Bracket paste mode
      .replace(/\x07/g, '') // Bell character
      .replace(/\r/g, '') // Carriage return
      .replace(/\x1B\([01]/g, ''); // Charset sequences
  };

  const addWelcomeMessage = () => {
    const welcomeMsg = `
╔══════════════════════════════════════╗
║            MozHost Terminal          ║
║         Web Terminal v1.0            ║
╚══════════════════════════════════════╝

💡 Dicas:
  • Use 'ls' para listar arquivos
  • Use 'cd' para navegar
  • Use 'npm install' para instalar dependências  
  • Use 'npm start' para iniciar aplicação
  • Use 'python main.py' para rodar Python
  • Use 'clear' para limpar terminal

Container: ${selectedContainer?.name}
Tipo: ${selectedContainer?.type}
Status: ${connected ? '🟢 Conectado' : '🔴 Desconectado'}

`;
    setTerminalOutput(prev => prev + welcomeMsg);
  };

  const sendCommand = (command) => {
    if (!socket || !connected) {
      setTerminalOutput(prev => prev + '\n❌ Terminal não conectado\n');
      return;
    }

    // Limpar terminal com comando customizado
    if (command.trim() === 'clear') {
      setTerminalOutput('');
      addWelcomeMessage();
      return;
    }

    // Mostrar comando no output
    setTerminalOutput(prev => prev + `$ ${command}\n`);
    
    // Enviar para backend
    socket.emit('terminal-input', { input: command + '\n' });
    
    // Adicionar ao histórico
    if (command.trim() && !commandHistory.includes(command.trim())) {
      setCommandHistory(prev => [...prev, command.trim()]);
    }
    setHistoryIndex(-1);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCommand(currentInput);
      setCurrentInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = Math.min(commandHistory.length - 1, historyIndex + 1);
        if (newIndex === commandHistory.length - 1) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // TODO: Implementar autocomplete
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      // Enviar SIGINT
      if (socket && connected) {
        socket.emit('terminal-input', { input: '\x03' });
      }
    }
  };

  const quickCommands = [
    { label: 'ls', command: 'ls', desc: 'Listar arquivos' },
    { label: 'clear', command: 'clear', desc: 'Limpar terminal' },
    { label: 'pwd', command: 'pwd', desc: 'Diretório atual' },
    { label: 'whoami', command: 'whoami', desc: 'Usuário atual' },
    { label: 'npm install', command: 'npm install', desc: 'Instalar dependências' },
    { label: 'npm start', command: 'npm start', desc: 'Iniciar aplicação' },
    { label: 'python main.py', command: 'python main.py', desc: 'Executar Python' },
    { label: 'cat index.js', command: 'cat index.js', desc: 'Ver código' }
  ];

  const clearTerminal = () => {
    setTerminalOutput('');
    addWelcomeMessage();
  };

  const sendQuickCommand = (command) => {
    setCurrentInput(command);
    sendCommand(command);
    setCurrentInput('');
    inputRef.current?.focus();
  };

  const changeContainer = (container) => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setSelectedContainer(container);
    setConnected(false);
    setTerminalOutput('');
    setCurrentInput('');
    setCommandHistory([]);
    setHistoryIndex(-1);
  };

  const reconnectTerminal = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setConnected(false);
    setTerminalOutput('');
    setTimeout(() => {
      connectToTerminal();
    }, 1000);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(terminalOutput);
    // TODO: Mostrar toast
    console.log('Output copiado!');
  };

  const downloadLog = () => {
    const element = document.createElement('a');
    const file = new Blob([terminalOutput], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `terminal-${selectedContainer?.name}-${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="terminal">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando terminal...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="terminal">
      <div className={`h-[calc(100vh-8rem)] flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="flex items-center flex-1 sm:flex-none">
              <Terminal className="w-5 h-5 text-gray-500 mr-2 flex-shrink-0" />
              <select
                value={selectedContainer?.id || ''}
                onChange={(e) => {
                  const container = containers.find(c => c.id === e.target.value);
                  if (container) changeContainer(container);
                }}
                className="border border-gray-300 rounded px-3 py-1 text-sm flex-1 sm:flex-none min-w-0"
              >
                <option value="">Selecione um container</option>
                {containers.map(container => (
                  <option key={container.id} value={container.id}>
                    {container.name} ({container.type})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedContainer && (
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {connected ? '🟢 Conectado' : '🔴 Desconectado'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={reconnectTerminal}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reconectar
            </button>
            
            <button
              onClick={copyOutput}
              className="flex items-center px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copiar
            </button>

            <button
              onClick={downloadLog}
              className="flex items-center px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
              <option value="matrix">Matrix</option>
            </select>
          </div>
        </div>

        {selectedContainer ? (
          <div className="flex-1 flex flex-col sm:flex-row">
            {/* Quick Commands Sidebar */}
            <div className="w-full sm:w-64 bg-gray-50 border-b sm:border-b-0 sm:border-r p-4">
              <h3 className="font-medium text-gray-900 mb-3">Comandos Rápidos</h3>
              <div className="space-y-2">
                <button
                  onClick={clearTerminal}
                  className="w-full text-left p-2 text-sm bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                >
                  <div className="font-mono text-red-600">🧹 clear</div>
                  <div className="text-xs text-red-500">Limpar terminal</div>
                </button>
                
                {quickCommands.map((cmd, index) => (
                  <button
                    key={index}
                    onClick={() => sendQuickCommand(cmd.command)}
                    className="w-full text-left p-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-mono text-blue-600">{cmd.label}</div>
                    <div className="text-xs text-gray-500">{cmd.desc}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Configurações</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tamanho da fonte</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value={12}>12px</option>
                      <option value={14}>14px</option>
                      <option value={16}>16px</option>
                      <option value={18}>18px</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tema</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="dark">🌙 Escuro</option>
                      <option value="light">☀️ Claro</option>
                      <option value="matrix">🔋 Matrix</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal */}
            <div className="flex-1 flex flex-col">
              {/* Terminal Output */}
              <div 
                ref={outputRef}
                className={`flex-1 p-4 font-mono text-sm overflow-y-auto ${
                  theme === 'dark' ? 'bg-black text-green-400' :
                  theme === 'matrix' ? 'bg-black text-green-300' :
                  'bg-white text-gray-900'
                }`}
                style={{ fontSize: `${fontSize}px` }}
              >
                <pre className="whitespace-pre-wrap break-words">
                  {terminalOutput}
                </pre>
              </div>

              {/* Command Input */}
              <div className={`border-t p-4 ${
                theme === 'dark' ? 'bg-gray-900 border-gray-700' :
                theme === 'matrix' ? 'bg-black border-green-900' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center">
                  <span className={`font-mono mr-2 ${
                    theme === 'dark' ? 'text-green-400' :
                    theme === 'matrix' ? 'text-green-300' :
                    'text-blue-600'
                  }`}>
                    $ 
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={connected ? "Digite um comando..." : "Terminal desconectado"}
                    disabled={!connected}
                    className={`flex-1 font-mono text-sm border-none outline-none ${
                      theme === 'dark' ? 'bg-transparent text-green-400 placeholder-green-600' :
                      theme === 'matrix' ? 'bg-transparent text-green-300 placeholder-green-600' :
                      'bg-transparent text-gray-900 placeholder-gray-500'
                    }`}
                    style={{ fontSize: `${fontSize}px` }}
                    autoComplete="off"
                    spellCheck="false"
                    autoFocus
                  />
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  💡 Use ↑↓ para histórico • Ctrl+C para interromper • Enter para executar
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Terminal className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Terminal Web MozHost
              </h3>
              <p className="text-gray-500 mb-4">
                Selecione um container para acessar o terminal
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>💻 Terminal completo no navegador</p>
                <p>🔄 Conexão WebSocket em tempo real</p>
                <p>📝 Histórico de comandos</p>
                <p>🎨 Temas personalizáveis</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WebTerminal;
