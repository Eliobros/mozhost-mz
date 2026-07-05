"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Editor } from "@monaco-editor/react";
import {
  Save,
  Loader,
  Code,
  FileText,
  ArrowLeft,
  FolderOpen,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.mozhost.shop";

function getAuthHeaders() {
  const token = localStorage.getItem("mozhost_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getAuthToken() {
  return localStorage.getItem("mozhost_token") || "";
}

function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    env: "plaintext",
    dockerfile: "dockerfile",
    gitignore: "plaintext",
    txt: "plaintext",
    svg: "xml",
  };
  return map[ext || ""] || "plaintext";
}

export default function ContainerEditorPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id as string;

  // Reconstruct file path from catch-all segments
  const rawPath = params.filepath as string[] | undefined;
  const filePath = rawPath ? rawPath.join("/") : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editorTheme, setEditorTheme] = useState<"mozhost-dark" | "mozhost-light">("mozhost-dark");
  const [isMobile, setIsMobile] = useState(false);

  const editorRef = useRef<any>(null);
  const saveFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    } else {
      setLoading(false);
    }
  }, [containerId, filePath]);

  const loadFile = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/files/${containerId}?path=${encodeURIComponent(path)}`,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
        setOriginalContent(data.content || "");
        setFileName(data.name || path.split("/").pop() || "");
      } else {
        setError("Ficheiro não encontrado");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar ficheiro");
    } finally {
      setLoading(false);
    }
  };

  const saveFile = useCallback(async () => {
    if (!filePath || !containerId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/files/${containerId}/${filePath}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: fileContent }),
      });
      if (res.ok) {
        setOriginalContent(fileContent);
        alert("Guardado! ✅");
      } else {
        alert("Erro ao guardar");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }, [fileContent, filePath, containerId]);

  saveFnRef.current = saveFile;

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveFnRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasUnsavedChanges = fileContent !== originalContent;

  // Define custom MozHost Blue themes for Monaco
  // IMPORTANT: this hook must run on every render, so it lives here,
  // before any conditional early "return" below (Rules of Hooks).
  const defineCustomThemes = useCallback((monaco: any) => {
    // Dark theme with MozHost blue accents
    monaco.editor.defineTheme("mozhost-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "60A5FA" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "type", foreground: "60A5FA" },
        { token: "function", foreground: "93C5FD" },
        { token: "variable", foreground: "E2E8F0" },
        { token: "constant", foreground: "60A5FA" },
        { token: "regexp", foreground: "D16969" },
        { token: "delimiter", foreground: "94A3B8" },
        { token: "tag", foreground: "60A5FA" },
        { token: "attribute.name", foreground: "93C5FD" },
        { token: "attribute.value", foreground: "CE9178" },
      ],
      colors: {
        "editor.background": "#0f172a",
        "editor.foreground": "#e2e8f0",
        "editor.lineHighlightBackground": "#1e3a5f55",
        "editor.selectionBackground": "#3B82F640",
        "editor.inactiveSelectionBackground": "#3B82F625",
        "editorCursor.foreground": "#3B82F6",
        "editorLineNumber.foreground": "#3B82F660",
        "editorLineNumber.activeForeground": "#3B82F6",
        "editor.selectionHighlightBackground": "#3B82F620",
        "editorBracketMatch.background": "#3B82F630",
        "editorBracketMatch.border": "#3B82F6",
        "editor.findMatchBackground": "#3B82F640",
        "editor.findMatchHighlightBackground": "#3B82F620",
        "editorGutter.background": "#0f172a",
        "editorWidget.background": "#1e293b",
        "editorWidget.border": "#334155",
        "input.background": "#1e293b",
        "input.border": "#334155",
        "focusBorder": "#3B82F6",
        "list.activeSelectionBackground": "#3B82F630",
        "list.hoverBackground": "#3B82F615",
        "list.inactiveSelectionBackground": "#3B82F620",
        "scrollbarSlider.background": "#3B82F630",
        "scrollbarSlider.hoverBackground": "#3B82F650",
        "scrollbarSlider.activeBackground": "#3B82F670",
      },
    });

    // Light theme with MozHost blue accents
    monaco.editor.defineTheme("mozhost-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "4B8B3B", fontStyle: "italic" },
        { token: "keyword", foreground: "2563EB" },
        { token: "string", foreground: "A31515" },
        { token: "number", foreground: "098658" },
        { token: "type", foreground: "2563EB" },
        { token: "function", foreground: "1D4ED8" },
        { token: "variable", foreground: "1E293B" },
        { token: "constant", foreground: "2563EB" },
        { token: "regexp", foreground: "811F1F" },
        { token: "delimiter", foreground: "64748B" },
        { token: "tag", foreground: "2563EB" },
        { token: "attribute.name", foreground: "1D4ED8" },
        { token: "attribute.value", foreground: "A31515" },
      ],
      colors: {
        "editor.background": "#f8fafc",
        "editor.foreground": "#1e293b",
        "editor.lineHighlightBackground": "#EFF6FF",
        "editor.selectionBackground": "#BFDBFE",
        "editor.inactiveSelectionBackground": "#DBEAFE",
        "editorCursor.foreground": "#3B82F6",
        "editorLineNumber.foreground": "#3B82F680",
        "editorLineNumber.activeForeground": "#2563EB",
        "editor.selectionHighlightBackground": "#BFDBFE80",
        "editorBracketMatch.background": "#DBEAFE",
        "editorBracketMatch.border": "#3B82F6",
        "editor.findMatchBackground": "#BFDBFE",
        "editor.findMatchHighlightBackground": "#DBEAFE",
        "editorGutter.background": "#f8fafc",
        "editorWidget.background": "#ffffff",
        "editorWidget.border": "#CBD5E1",
        "input.background": "#ffffff",
        "input.border": "#CBD5E1",
        "focusBorder": "#3B82F6",
        "list.activeSelectionBackground": "#DBEAFE",
        "list.hoverBackground": "#EFF6FF",
        "list.inactiveSelectionBackground": "#EFF6FF",
        "scrollbarSlider.background": "#3B82F640",
        "scrollbarSlider.hoverBackground": "#3B82F660",
        "scrollbarSlider.activeBackground": "#3B82F680",
      },
    });
  }, []);

  // Empty state - no file selected
  if (!filePath) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <Code className="w-20 h-20 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Editor de Código
          </h3>
          <p className="text-gray-500 mb-6 text-sm">
            Selecione um ficheiro na aba{" "}
            <Link
              href={`/containers/${containerId}/files`}
              className="text-blue-600 hover:underline font-medium"
            >
              Ficheiros
            </Link>{" "}
            para editar
          </p>
          <Link
            href={`/containers/${containerId}/files`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium"
          >
            <FolderOpen className="w-4 h-4" />
            Abrir Ficheiros
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <FileText className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500">{error}</p>
        <Link
          href={`/containers/${containerId}/files`}
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar aos ficheiros
        </Link>
      </div>
    );
  }

  const lang = getFileLanguage(fileName);
  const dirPath = filePath.split("/").slice(0, -1).join("/");
  const dirPathEncoded = dirPath ? dirPath.split("/").map(encodeURIComponent).join("/") : "";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 14rem)" }}>
      {/* Editor Header */}
      <div className="bg-white rounded-t-xl shadow-sm border border-b-0 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/containers/${containerId}/files/${dirPathEncoded}`}
            className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0"
            title="Voltar aos ficheiros"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{fileName}</span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" title="Alterações não guardadas" />
            )}
          </div>
          <span className="text-xs text-gray-400 uppercase hidden sm:inline">{lang}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => setEditorTheme((t) => (t === "mozhost-dark" ? "mozhost-light" : "mozhost-dark"))}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
            title="Alternar tema"
          >
            {editorTheme === "mozhost-dark" ? "☀️ Claro" : "🌙 Escuro"}
          </button>

          {/* Save */}
          <button
            onClick={saveFile}
            disabled={!hasUnsavedChanges || saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
              hasUnsavedChanges
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            } disabled:opacity-50`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "A guardar..." : "Guardar"}
          </button>

          {/* Open in files */}
          <Link
            href={`/containers/${containerId}/files`}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Explorador de ficheiros"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ficheiros</span>
          </Link>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 border border-t-0 rounded-b-xl overflow-hidden shadow-sm min-h-[500px]">
        <Editor
          height="100%"
          language={lang}
          value={fileContent}
          onChange={(value) => setFileContent(value || "")}
          theme={editorTheme}
          beforeMount={(monaco) => {
            defineCustomThemes(monaco);
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            editor.updateOptions({
              fontSize: isMobile ? 12 : 14,
              wordWrap: "on",
              minimap: { enabled: !isMobile },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            });
          }}
          options={{
            selectOnLineNumbers: true,
            automaticLayout: true,
            tabSize: 2,
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-[#0f172a]">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-blue-400 text-sm">A carregar editor...</p>
              </div>
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0f172a] text-xs text-blue-300/70 rounded-b-xl -mt-px border border-t-0 border-slate-700">
        <span>
          {fileName} • {lang.toUpperCase()} • Linhas: {fileContent.split("\n").length}
        </span>
        <span>Ctrl+S para guardar</span>
      </div>
    </div>
  );
}
