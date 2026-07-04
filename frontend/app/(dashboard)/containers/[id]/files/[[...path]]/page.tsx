"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Folder,
  FileText,
  FolderOpen,
  RefreshCw,
  Trash2,
  Plus,
  Upload,
  FileUp,
  FolderPlus,
  ChevronRight,
  Home,
  Loader,
  Edit3,
  Copy,
  FolderInput,
  CheckSquare,
  Square as SquareIcon,
  X,
  Code,
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

export default function ContainerFilesPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id as string;

  // Reconstruct path from catch-all segments
  const rawPath = params.path as string[] | undefined;
  const currentPath = rawPath ? rawPath.join("/") : "";

  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Create modal
  const [showCreateInput, setShowCreateInput] = useState<"file" | "folder" | null>(null);
  const [createName, setCreateName] = useState("");

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  // Input modal (rename, move)
  const [inputModal, setInputModal] = useState({
    open: false,
    title: "",
    placeholder: "",
    defaultValue: "",
    submitLabel: "Confirmar",
    onSubmit: (_v: string) => {},
  });
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    loadFiles();
  }, [containerId, currentPath]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/files/${containerId}?path=${encodeURIComponent(currentPath)}`,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.type === "directory") {
          setFiles(
            (data.items || []).sort((a: any) => {
              if (a.type === "directory" && a.name === "node_modules") return 1;
              if (a.type === "directory" && a.name.startsWith(".")) return 1;
              if (a.type === "directory") return -1;
              return 0;
            })
          );
        } else {
          // É um ficheiro — redireciona para o editor
          router.replace(`/containers/${containerId}/editor/${currentPath.split("/").map(encodeURIComponent).join("/")}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (path: string) => {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    router.push(`/containers/${containerId}/files/${encoded}`);
  };

  const navigateToEditor = (filePath: string) => {
    const encoded = filePath.split("/").map(encodeURIComponent).join("/");
    router.push(`/containers/${containerId}/editor/${encoded}`);
  };

  const handleFileClick = (file: any) => {
    if (selectionMode) {
      toggleSelection(file);
      return;
    }
    if (file.type === "directory") {
      navigateToFolder(file.path);
    } else {
      navigateToEditor(file.path);
    }
  };

  // Selection helpers
  const toggleSelection = (file: any) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.path === file.path);
      if (exists) {
        const next = prev.filter((f) => f.path !== file.path);
        if (next.length === 0) setSelectionMode(false);
        return next;
      }
      return [...prev, file];
    });
  };

  const isSelected = (file: any) => selectedFiles.some((f) => f.path === file.path);

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectionMode(false);
  };

  const selectAll = () => {
    if (selectedFiles.length === files.length) {
      clearSelection();
    } else {
      setSelectedFiles([...files]);
    }
  };

  // File actions
  const deleteSelected = async () => {
    if (!confirm(`Deletar ${selectedFiles.length} item(ns)?`)) return;
    for (const file of selectedFiles) {
      try {
        await fetch(`${API}/api/files/${containerId}/${file.path}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
      } catch (err) {
        console.error(err);
      }
    }
    clearSelection();
    loadFiles();
  };

  const handleRename = () => {
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    setInputValue(file.name);
    setInputModal({
      open: true,
      title: "Renomear",
      placeholder: "novo-nome",
      defaultValue: file.name,
      submitLabel: "Renomear",
      onSubmit: async (newName: string) => {
        if (newName === file.name) return;
        const parts = file.path.split("/");
        parts[parts.length - 1] = newName;
        const newPath = parts.join("/");
        try {
          await fetch(`${API}/api/files/${containerId}/${file.path}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ newPath }),
          });
          clearSelection();
          loadFiles();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleMove = () => {
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    setInputValue(file.path);
    setInputModal({
      open: true,
      title: "Mover para",
      placeholder: "pasta/arquivo.js",
      defaultValue: file.path,
      submitLabel: "Mover",
      onSubmit: async (newPath: string) => {
        if (newPath === file.path) return;
        try {
          await fetch(`${API}/api/files/${containerId}/${file.path}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ newPath }),
          });
          clearSelection();
          loadFiles();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleDuplicate = async () => {
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    if (file.type === "directory") return;
    try {
      const res = await fetch(
        `${API}/api/files/${containerId}?path=${encodeURIComponent(file.path)}`,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
        const baseName = file.name.slice(0, -ext.length);
        const newName = `${baseName}_copia${ext}`;
        const newPath = currentPath ? `${currentPath}/${newName}` : newName;
        await fetch(`${API}/api/files/${containerId}`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ path: newPath, type: "file", content: data.content || "" }),
        });
        clearSelection();
        loadFiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create file/folder
  const createItem = async () => {
    if (!createName.trim()) return;
    const type = showCreateInput!;
    const filePath = currentPath ? `${currentPath}/${createName}` : createName;
    try {
      const body: any = { path: filePath, type };
      if (type === "file") body.content = "// Novo ficheiro\n\n";
      const res = await fetch(`${API}/api/files/${containerId}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreateInput(null);
        setCreateName("");
        loadFiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const f of Array.from(fileList)) formData.append("files", f);
      formData.append("path", currentPath);
      const res = await fetch(`${API}/api/files/${containerId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.count || "Ficheiros"} enviado(s)! ✅`);
        loadFiles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("zipfile", file);
      formData.append("path", currentPath);
      formData.append("overwrite", "true");
      const res = await fetch(`${API}/api/files/${containerId}/upload-zip`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        alert(`ZIP extraído! ${data.extracted} ficheiros.`);
        loadFiles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  // Breadcrumb parts
  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b bg-gray-50 flex items-center gap-1.5 flex-wrap">
          <button onClick={loadFiles} className="p-1.5 hover:bg-white rounded-lg" title="Atualizar">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>

          <button
            onClick={() => setShowCreateInput("file")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3 h-3" /> Ficheiro
          </button>
          <button
            onClick={() => setShowCreateInput("folder")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FolderPlus className="w-3 h-3" /> Pasta
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            disabled={uploading}
          >
            <FileUp className="w-3 h-3" /> Upload
          </button>
          <button
            onClick={() => zipInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            disabled={uploading}
          >
            <Upload className="w-3 h-3" /> ZIP
          </button>

          <div className="flex-1" />

          <button
            onClick={() => {
              if (selectionMode) clearSelection();
              else setSelectionMode(true);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              selectionMode ? "bg-blue-100 text-blue-600" : "hover:bg-white text-gray-500"
            }`}
            title="Modo seleção"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
          <input ref={zipInputRef} type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
        </div>

        {/* Create input */}
        {showCreateInput && (
          <div className="p-2 border-b bg-blue-50 flex gap-2">
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createItem();
                if (e.key === "Escape") setShowCreateInput(null);
              }}
              placeholder={showCreateInput === "file" ? "ex: index.js" : "ex: src"}
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
            <button onClick={createItem} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
              Criar
            </button>
            <button onClick={() => setShowCreateInput(null)} className="px-2 py-1 text-gray-500 text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Selection action bar */}
        {selectionMode && selectedFiles.length > 0 && (
          <div className="p-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-blue-700">{selectedFiles.length} selecionado(s)</span>
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">
              {selectedFiles.length === files.length ? "Limpar" : "Todos"}
            </button>
            <div className="flex-1" />
            <button
              onClick={deleteSelected}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
            >
              <Trash2 className="w-3 h-3" /> Deletar
            </button>
            {selectedFiles.length === 1 && (
              <>
                <button
                  onClick={handleRename}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                >
                  <Edit3 className="w-3 h-3" /> Renomear
                </button>
                <button
                  onClick={handleMove}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                >
                  <FolderInput className="w-3 h-3" /> Mover
                </button>
                <button
                  onClick={handleDuplicate}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                >
                  <Copy className="w-3 h-3" /> Duplicar
                </button>
              </>
            )}
            <button onClick={clearSelection} className="p-1 hover:bg-blue-100 rounded ml-1">
              <X className="w-3 h-3 text-blue-600" />
            </button>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="px-3 py-2 border-b text-xs text-gray-500 flex items-center gap-1 overflow-x-auto">
          <button onClick={() => router.push(`/containers/${containerId}/files`)} className="hover:text-blue-600 hover:bg-gray-100 rounded p-0.5 transition-colors flex-shrink-0">
            <Home className="w-3.5 h-3.5" />
          </button>
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              {i < pathParts.length - 1 ? (
                <button
                  onClick={() => navigateToFolder(pathParts.slice(0, i + 1).join("/"))}
                  className="hover:text-blue-600 whitespace-nowrap transition-colors"
                >
                  {part}
                </button>
              ) : (
                <span className="text-gray-900 font-medium whitespace-nowrap">{part}</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* File list */}
        <div className="divide-y">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Pasta vazia</p>
              <p className="text-xs mt-1">Crie um ficheiro ou faça upload</p>
            </div>
          ) : (
            files.map((file: any) => (
              <div
                key={file.name}
                className={`group flex items-center px-3 py-2.5 cursor-pointer transition-colors ${
                  isSelected(file)
                    ? "bg-blue-50 border-l-2 border-blue-500"
                    : "hover:bg-gray-50 border-l-2 border-transparent"
                }`}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!selectionMode) setSelectionMode(true);
                  if (!isSelected(file)) toggleSelection(file);
                }}
              >
                {selectionMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(file);
                    }}
                    className="mr-2 flex-shrink-0"
                  >
                    {isSelected(file) ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <SquareIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}

                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {file.type === "directory" ? (
                    <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate font-medium text-gray-800">{file.name}</span>
                </div>

                {!selectionMode && file.type === "file" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToEditor(file.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-100 rounded-lg flex-shrink-0 transition-all"
                    title="Editar"
                  >
                    <Code className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Modal */}
      {inputModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInputModal((p) => ({ ...p, open: false }));
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">{inputModal.title}</h3>
              <button
                onClick={() => setInputModal((p) => ({ ...p, open: false }))}
                className="p-1 hover:bg-gray-200 rounded text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const cb = inputModal.onSubmit;
                    setInputModal((p) => ({ ...p, open: false }));
                    if (inputValue.trim() && cb) cb(inputValue.trim());
                  } else if (e.key === "Escape") {
                    setInputModal((p) => ({ ...p, open: false }));
                  }
                }}
                placeholder={inputModal.placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <button
                onClick={() => setInputModal((p) => ({ ...p, open: false }))}
                className="px-3 py-1.5 text-sm rounded-md text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const cb = inputModal.onSubmit;
                  setInputModal((p) => ({ ...p, open: false }));
                  if (inputValue.trim() && cb) cb(inputValue.trim());
                }}
                disabled={!inputValue.trim()}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {inputModal.submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
