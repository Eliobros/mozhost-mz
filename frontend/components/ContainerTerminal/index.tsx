"use client";

import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Terminal, RefreshCw, Copy, Download, Maximize2, Minimize2 } from "lucide-react";

function cleanAnsi(text: string) {
  return text
    .replace(/\x1B\[[?]?[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1B\][0-9];[^\x07]*\x07/g, "")
    .replace(/\[\?2004[hl]/g, "")
    .replace(/\x07/g, "")
    .replace(/\r/g, "")
    .replace(/\x1B\([01]/g, "");
}

export default function ContainerTerminal({
  containerId,
}: {
  containerId: string;
}) {
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState("dark");
  const [fullscreen, setFullscreen] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("mozhost_token");
    const s = io("https://api.mozhost.shop", { auth: { token } });

    s.on("connect", () => {
      setConnected(true);
      s.emit("connect-terminal", { containerId });
    });

    s.on("terminal-connected", () => {
      setOutput(
        (p) =>
          p +
          `\n🚀 Terminal conectado ao container ${containerId.substring(0, 8)}\n`
      );
    });

    s.on("terminal-output", (data: any) => {
      setOutput((p) => p + cleanAnsi(data.data));
    });

    s.on("terminal-error", (data: any) => {
      setOutput((p) => p + `\n❌ ${data.error}\n`);
    });

    s.on("terminal-exit", () => {
      setConnected(false);
      setOutput((p) => p + "\n💀 Terminal encerrado\n");
    });

    s.on("disconnect", () => {
      setConnected(false);
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [containerId]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const sendCmd = (cmd: string) => {
    if (!socket || !connected) return;
    if (cmd.trim() === "clear") {
      setOutput("");
      return;
    }
    setOutput((p) => p + `$ ${cmd}\n`);
    socket.emit("terminal-input", { input: cmd + "\n" });
    if (cmd.trim() && !history.includes(cmd.trim())) {
      setHistory((p) => [...p, cmd.trim()]);
    }
    setHistoryIdx(-1);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendCmd(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const ni =
          historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(ni);
        setInput(history[ni]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx !== -1) {
        const ni = Math.min(history.length - 1, historyIdx + 1);
        if (ni === history.length - 1) {
          setHistoryIdx(-1);
          setInput("");
        } else {
          setHistoryIdx(ni);
          setInput(history[ni]);
        }
      }
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      if (socket && connected) {
        socket.emit("terminal-input", { input: "\x03" });
      }
    }
  };

  const reconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setConnected(false);
    setOutput("");
    const token = localStorage.getItem("mozhost_token");
    const s = io("https://api.mozhost.shop", { auth: { token } });
    s.on("connect", () => {
      setConnected(true);
      s.emit("connect-terminal", { containerId });
    });
    s.on("terminal-output", (data: any) => {
      setOutput((p) => p + cleanAnsi(data.data));
    });
    s.on("disconnect", () => setConnected(false));
    setSocket(s);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  const downloadLog = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminal-${containerId.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex flex-col ${fullscreen ? "fixed inset-0 z-50 bg-black" : "h-[500px]"}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          ></span>
          <span className="text-xs text-gray-300">
            {connected ? "Conectado" : "Desconectado"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={reconnect}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
            title="Reconectar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={copyOutput}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
            title="Copiar"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={downloadLog}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
            title="Download log"
          >
            <Download className="w-4 h-4" />
          </button>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-gray-700 text-gray-300 text-xs rounded px-1 py-0.5 border-gray-600"
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="matrix">Matrix</option>
          </select>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
          >
            {fullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className={`flex-1 p-3 font-mono text-sm overflow-y-auto ${
          theme === "dark"
            ? "bg-black text-green-400"
            : theme === "matrix"
              ? "bg-black text-green-300"
              : "bg-gray-100 text-gray-900"
        }`}
        style={{ fontSize: `${fontSize}px` }}
        onClick={() => inputRef.current?.focus()}
      >
        <pre className="whitespace-pre-wrap break-words">{output}</pre>
      </div>

      {/* Input */}
      <div
        className={`flex items-center px-3 py-2 border-t flex-shrink-0 ${
          theme === "dark" || theme === "matrix"
            ? "bg-gray-900 border-gray-700"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <span
          className={`font-mono mr-2 ${theme === "dark" || theme === "matrix" ? "text-green-400" : "text-blue-600"}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          $
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={connected ? "Comando..." : "Desconectado"}
          disabled={!connected}
          className={`flex-1 font-mono text-sm border-none outline-none bg-transparent ${
            theme === "dark"
              ? "text-green-400 placeholder-green-600"
              : theme === "matrix"
                ? "text-green-300 placeholder-green-600"
                : "text-gray-900 placeholder-gray-500"
          }`}
          style={{ fontSize: `${fontSize}px` }}
          autoComplete="off"
          spellCheck="false"
          autoFocus
        />
      </div>
    </div>
  );
}
