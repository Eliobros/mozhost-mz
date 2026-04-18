// WebTerminal/Terminal.js
import React, { useRef, useEffect } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import {
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Terminal as TerminalIcon
} from 'lucide-react';
import { getAuthToken } from './utils';

const Terminal = ({
  containerId,
  visible,
  onClose,
  maximized,
  onToggleMaximize
}) => {
  const terminalRef = useRef(null);
  const terminalContainerRef = useRef(null);
  const wsRef = useRef(null);
  const fitAddonRef = useRef(null);
  const xtermInstanceRef = useRef(null);

  useEffect(() => {
    if (visible && !xtermInstanceRef.current && containerId) {
      initTerminal();
    }

    return () => {
      cleanup();
    };
  }, [visible, containerId]);

  useEffect(() => {
    // Ajustar terminal ao maximizar/minimizar
    if (visible && xtermInstanceRef.current && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current.fit();
      }, 100);
    }
  }, [maximized]);

  const initTerminal = () => {
    if (!terminalContainerRef.current || xtermInstanceRef.current) return;

    console.log('[Terminal] Inicializando terminal para container:', containerId);

    // Criar instância do terminal
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      scrollback: 1000,
      tabStopWidth: 4
    });

    // Adicionar addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    fitAddonRef.current = fitAddon;
    xtermInstanceRef.current = terminal;

    // Abrir terminal no DOM
    terminal.open(terminalContainerRef.current);
    fitAddon.fit();

    // Mensagem de boas-vindas
    terminal.writeln('\x1b[1;32m╔═══════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[1;32m║     MozHost Terminal v1.0             ║\x1b[0m');
    terminal.writeln('\x1b[1;32m╚═══════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[33mConectando ao container...\x1b[0m');

    // Conectar WebSocket
    connectWebSocket(terminal);

    // Observer para redimensionar
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.error('[Terminal] Erro ao ajustar terminal:', e);
        }
      }
    });

    resizeObserver.observe(terminalContainerRef.current);
    terminalRef.current = resizeObserver;
  };

  const connectWebSocket = (terminal) => {
    const token = getAuthToken();

    // DEBUG: Logs detalhados
    console.log('[Terminal] ========== WEBSOCKET DEBUG ==========');
    console.log('[Terminal] Container ID:', containerId);
    console.log('[Terminal] Token:', token ? `${token.substring(0, 20)}...` : 'NENHUM TOKEN!');

    // Construir URL do WebSocket do terminal
    const wsUrl = `wss://api.mozhost.shop/api/terminal/${containerId}?token=${token}`;
    
    console.log('[Terminal] WebSocket URL completa:', wsUrl);
    console.log('[Terminal] Iniciando conexão WebSocket...');

    // Usar WebSocket nativo, NÃO Socket.IO
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Terminal] ✅ WebSocket CONECTADO com sucesso!');
      terminal.writeln('\r\n\x1b[32m✓ Conectado ao container!\x1b[0m');
      terminal.writeln('\x1b[90mShell: /bin/sh\x1b[0m');
      terminal.writeln('');
    };

    ws.onmessage = (event) => {
      console.log('[Terminal] Mensagem recebida:', event.data);
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'output') {
          terminal.write(message.data);
        } else if (message.type === 'error') {
          terminal.writeln(`\r\n\x1b[31m✗ ${message.message}\x1b[0m`);
        }
      } catch (e) {
        // Se não for JSON, escrever direto
        console.log('[Terminal] Mensagem não-JSON, escrevendo diretamente');
        terminal.write(event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('[Terminal] ❌ ERRO WebSocket:', error);
      console.error('[Terminal] Detalhes do erro:', {
        readyState: ws.readyState,
        url: ws.url,
        protocol: ws.protocol
      });
      terminal.writeln('\r\n\x1b[31m✗ Erro de conexão WebSocket\x1b[0m');
      terminal.writeln('\x1b[33mVerifique o console (F12) para mais detalhes\x1b[0m');
    };

    ws.onclose = (event) => {
      console.log('[Terminal] WebSocket fechado:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      terminal.writeln('\r\n\x1b[33m⚠ Conexão fechada\x1b[0m');
      
      // Mostrar motivo se houver
      if (event.reason) {
        terminal.writeln(`\x1b[90mMotivo: ${event.reason}\x1b[0m`);
      }
    };

    // Enviar input do terminal para o WebSocket
    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('[Terminal] Enviando input:', data.replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      } else {
        console.warn('[Terminal] WebSocket não está aberto. ReadyState:', ws.readyState);
      }
    });

    wsRef.current = ws;
  };

  const cleanup = () => {
    console.log('[Terminal] Limpando recursos...');
    
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        console.log('[Terminal] Fechando WebSocket...');
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    if (xtermInstanceRef.current) {
      console.log('[Terminal] Destruindo instância do terminal...');
      xtermInstanceRef.current.dispose();
      xtermInstanceRef.current = null;
    }

    if (terminalRef.current) {
      terminalRef.current.disconnect();
      terminalRef.current = null;
    }
  };

  const clearTerminal = () => {
    console.log('[Terminal] Limpando terminal...');
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.clear();
    }
  };

  const reconnect = () => {
    console.log('[Terminal] Reconectando...');
    cleanup();
    setTimeout(() => initTerminal(), 100);
  };

  if (!visible) return null;

  return (
    <div
      className={`bg-gray-900 border-t flex flex-col ${
        maximized ? 'absolute inset-0 z-30' : 'h-80'
      }`}
    >
      {/* Terminal Header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-green-400" />
          <span className="text-sm text-gray-300 font-medium">Terminal</span>
          <span className="text-xs text-gray-500">
            {containerId ? `Container: ${containerId.substring(0, 12)}` : 'Não conectado'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={clearTerminal}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Limpar terminal"
          >
            <RefreshCw className="w-4 h-4" />
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
            title="Fechar terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div
        ref={terminalContainerRef}
        className="flex-1 overflow-hidden p-2"
      />
    </div>
  );
};

export default Terminal;
