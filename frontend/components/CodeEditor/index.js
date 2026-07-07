"use client"

// WebTerminal/index.js (ATUALIZADO - Com fix SSR)
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import dynamic from 'next/dynamic'; // IMPORTANTE: Importar dynamic
import {
  Save,
  Plus,
  Menu,
  Upload,
  Server,
  FileText,
  Folder,
  FolderPlus,
  Terminal as TerminalIcon,
  X,
  FileUp
} from 'lucide-react';
import LogsPage from './LogsPage';
import FileExplorer from './FileExplorer';
import { 
  getFileLanguage, 
  getFileTemplate, 
  API_BASE_URL, 
  getAuthHeaders,
  getAuthToken 
} from './utils';

// ============================================
// IMPORTAÇÃO DINÂMICA DO TERMINAL (Fix SSR)
// ============================================
const Terminal = dynamic(() => import('./Terminal'), {
  ssr: false, // NÃO renderizar no servidor
  loading: () => (
    <div className="bg-gray-900 h-80 flex items-center justify-center border-t">
      <div className="text-gray-400 text-sm">Carregando terminal...</div>
    </div>
  )
});

const CodeEditor = () => {
  // ==================== ESTADOS ====================
  
  // Estados principais
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  // Estados de UI
  const [editorTheme, setEditorTheme] = useState('mozhost-dark');
  const [fontSize, setFontSize] = useState(14);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados do Terminal
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
const [logsVisible, setLogsVisible] = useState(false);
const [logsMaximized, setLogsMaximized] = useState(false);  const [uploading, setUploading] = useState(false);
const fileInputRef = useRef(null);
const filesInputRef = useRef(null);
const folderInputRef = useRef(null);

// Modal genérico de input (substitui window.prompt)
const [inputModal, setInputModal] = useState({
  open: false,
  title: '',
  placeholder: '',
  defaultValue: '',
  submitLabel: 'Confirmar',
  loading: false,
  onSubmit: (_value) => {}
});
const [inputModalValue, setInputModalValue] = useState('');

const editorRef = useRef(null);

  // ==================== EFFECTS ====================

  useEffect(() => {
    loadContainers();

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (selectedContainer) {
      loadFiles(currentPath);
    }
  }, [selectedContainer, currentPath]);

  useEffect(() => {
    setHasUnsavedChanges(fileContent !== originalContent);
  }, [fileContent, originalContent]);

  // ==================== API CALLS ====================

  const loadContainers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/containers`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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

  const loadFiles = async (path = '') => {
    if (!selectedContainer) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}?path=${encodeURIComponent(path)}`,
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.type === 'directory') {
          setFiles(data.items || []);
          setCurrentFile(null);
          setFileContent('');
          setOriginalContent('');
        } else {
          setCurrentFile(data);
          setFileContent(data.content || '');
          setOriginalContent(data.content || '');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
    }
  };

  const openFile = async (file) => {
    if (hasUnsavedChanges) {
      if (!confirm('Você tem alterações não salvas. Deseja continuar?')) {
        return;
      }
    }

    if (file.type === 'directory') {
      setCurrentPath(file.path);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}?path=${encodeURIComponent(file.path)}`,
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentFile(data);
        setFileContent(data.content || '');
        setOriginalContent(data.content || '');
        
        if (isMobile) {
          setSidebarOpen(false);
        }
      }
    } catch (error) {
      console.error('Erro ao abrir arquivo:', error);
    }
  };

  const saveFile = async () => {
    if (!currentFile || !selectedContainer) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/${currentFile.path}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content: fileContent })
        }
      );

      if (response.ok) {
        setOriginalContent(fileContent);
        setHasUnsavedChanges(false);
        alert('Arquivo salvo com sucesso! ✅');
      } else {
        alert('Erro ao salvar arquivo');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar arquivo');
    } finally {
      setSaving(false);
    }
  };

  // Helper de modal genérico de input (estilo APK)
  const openInputModal = ({ title, placeholder = '', defaultValue = '', submitLabel = 'Confirmar', onSubmit }) => {
    setInputModalValue(defaultValue || '');
    setInputModal({
      open: true,
      title,
      placeholder,
      defaultValue,
      submitLabel,
      loading: false,
      onSubmit
    });
  };

  const closeInputModal = () => {
    setInputModal((prev) => ({ ...prev, open: false, loading: false }));
  };

  const handleInputModalSubmit = async () => {
    const value = inputModalValue.trim();
    if (!value || !inputModal.onSubmit) {
      closeInputModal();
      return;
    }
    setInputModal((prev) => ({ ...prev, loading: true }));
    try {
      await inputModal.onSubmit(value);
    } finally {
      closeInputModal();
    }
  };

  const createNewFile = () => {
    if (!selectedContainer) return;
    openInputModal({
      title: 'Novo Arquivo',
      placeholder: 'ex: bot.js, index.html',
      defaultValue: '',
      submitLabel: 'Criar',
      onSubmit: async (fileName) => {
        try {
          const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;

          const response = await fetch(
            `${API_BASE_URL}/files/${selectedContainer.id}`,
            {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                path: filePath,
                type: 'file',
                content: getFileTemplate(fileName)
              })
            }
          );

          if (response.ok) {
            loadFiles(currentPath);
          } else {
            const err = await response.json().catch(() => ({}));
            alert(err.error || 'Erro ao criar arquivo');
          }
        } catch (error) {
          console.error('Erro ao criar arquivo:', error);
          alert('Erro ao criar arquivo');
        }
      }
    });
  };

  const createNewFolder = () => {
    if (!selectedContainer) return;
    openInputModal({
      title: 'Nova Pasta',
      placeholder: 'nome-da-pasta',
      defaultValue: '',
      submitLabel: 'Criar',
      onSubmit: async (folderName) => {
        try {
          const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;

          const response = await fetch(
            `${API_BASE_URL}/files/${selectedContainer.id}`,
            {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                path: folderPath,
                type: 'directory'
              })
            }
          );

          if (response.ok) {
            loadFiles(currentPath);
          } else {
            const err = await response.json().catch(() => ({}));
            alert(err.error || 'Erro ao criar pasta');
          }
        } catch (error) {
          console.error('Erro ao criar pasta:', error);
          alert('Erro ao criar pasta');
        }
      }
    });
  };

  const uploadZip = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedContainer) return;

    if (!file.name.endsWith('.zip')) {
      alert('Por favor, selecione um arquivo .zip');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('zipfile', file);
      formData.append('path', currentPath);
      formData.append('overwrite', 'true');

      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/upload-zip`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`ZIP extraído com sucesso! ${data.extracted} arquivos extraídos.`);
        loadFiles(currentPath);
      } else {
        const err = await response.json();
        alert(err.message || 'Erro ao enviar ZIP');
      }
    } catch (error) {
      console.error('Erro ao enviar ZIP:', error);
      alert('Erro ao enviar arquivo ZIP');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload de arquivos individuais (qualquer tipo)
  const uploadFiles = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !selectedContainer) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append('files', file);
      }
      formData.append('path', currentPath);

      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/upload`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        const renamed = data.files?.filter(f => f.saved !== f.original).length || 0;
        let msg = `${data.count} arquivo(s) enviado(s) ✅`;
        if (renamed > 0) {
          msg += `\n${renamed} foram renomeados (nome já existia).`;
        }
        alert(msg);
        loadFiles(currentPath);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || err.message || 'Erro ao enviar arquivos');
      }
    } catch (error) {
      console.error('Erro ao enviar arquivos:', error);
      alert('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
      if (filesInputRef.current) filesInputRef.current.value = '';
    }
  };

  // Upload de pasta preservando estrutura via webkitRelativePath
  const uploadFolder = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !selectedContainer) return;

    // Sanity check: confirma que o navegador expõe webkitRelativePath
    const sample = fileList[0];
    if (!sample.webkitRelativePath) {
      alert('Seu navegador não suporta upload de pastas. Use Chrome, Edge ou Firefox.');
      if (folderInputRef.current) folderInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      // Renomeia cada arquivo usando seu caminho relativo antes do upload,
      // para o backend receber o caminho em req.file.originalname.
      const filesForUpload = Array.from(fileList).map((file) => {
        const renamed = new File([file], file.webkitRelativePath.replace(/\\/g, '/'), {
          type: file.type,
          lastModified: file.lastModified
        });
        return renamed;
      });

      const formData = new FormData();
      for (const file of filesForUpload) {
        formData.append('files', file);
      }
      formData.append('path', currentPath);

      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/upload-folder`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Pasta '${sample.webkitRelativePath.split('/')[0]}' enviada! ${data.uploaded} arquivo(s). ✅`);
        loadFiles(currentPath);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || err.message || 'Erro ao enviar pasta');
      }
    } catch (error) {
      console.error('Erro ao enviar pasta:', error);
      alert('Erro ao enviar pasta');
    } finally {
      setUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const deleteFile = async (file) => {
    if (!confirm(`Tem certeza que deseja deletar "${file.name}"?`)) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/${file.path}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        }
      );

      if (response.ok) {
        if (currentFile && currentFile.path === file.path) {
          setCurrentFile(null);
          setFileContent('');
          setOriginalContent('');
        }
        loadFiles(currentPath);
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const renameFile = async (file, newPath) => {
    if (!selectedContainer) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/${file.path}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ newPath })
        }
      );
      if (response.ok) {
        loadFiles(currentPath);
      } else {
        const err = await response.json();
        alert(err.error || 'Erro ao renomear');
      }
    } catch (error) {
      console.error('Erro ao renomear:', error);
      alert('Erro ao renomear arquivo');
    }
  };

  const moveFile = async (file, newPath) => {
    if (!selectedContainer) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/${file.path}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ newPath })
        }
      );
      if (response.ok) {
        loadFiles(currentPath);
      } else {
        const err = await response.json();
        alert(err.error || 'Erro ao mover');
      }
    } catch (error) {
      console.error('Erro ao mover:', error);
      alert('Erro ao mover arquivo');
    }
  };

  const duplicateFile = async (file) => {
    if (!selectedContainer || file.type === 'directory') return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}?path=${encodeURIComponent(file.path)}`,
        { headers: { 'Authorization': `Bearer ${getAuthToken()}` } }
      );
      if (response.ok) {
        const data = await response.json();
        const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
        const baseName = file.name.replace(ext, '');
        const newName = `${baseName}_copia${ext}`;
        const newPath = currentPath ? `${currentPath}/${newName}` : newName;
        
        await fetch(
          `${API_BASE_URL}/files/${selectedContainer.id}`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              path: newPath,
              type: 'file',
              content: data.content || ''
            })
          }
        );
        loadFiles(currentPath);
      }
    } catch (error) {
      console.error('Erro ao duplicar:', error);
      alert('Erro ao duplicar arquivo');
    }
  };

  const extractZip = async (file) => {
    if (!selectedContainer) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/${selectedContainer.id}/download/${file.path}`,
        { headers: { 'Authorization': `Bearer ${getAuthToken()}` } }
      );
      if (response.ok) {
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('zipfile', new File([blob], file.name, { type: 'application/zip' }));
        formData.append('path', currentPath);
        formData.append('overwrite', 'true');

        const extractResponse = await fetch(
          `${API_BASE_URL}/files/${selectedContainer.id}/upload-zip`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            body: formData
          }
        );

        if (extractResponse.ok) {
          const data = await extractResponse.json();
          alert(`ZIP extraído! ${data.extracted} arquivo(s) extraído(s).`);
          loadFiles(currentPath);
        } else {
          const err = await extractResponse.json();
          alert(err.message || 'Erro ao extrair ZIP');
        }
      }
    } catch (error) {
      console.error('Erro ao extrair ZIP:', error);
      alert('Erro ao extrair arquivo ZIP');
    }
  };

  const downloadFile = async (file) => {
    if (!selectedContainer || file.type === 'directory') return;

    // Encode each path segment individually (preserves slashes for Express wildcard)
    const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
    const url = `${API_BASE_URL}/files/${selectedContainer.id}/download/${encodedPath}`;

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      if (!response.ok) {
        // API may return JSON error (e.g. 404) instead of a blob
        const contentType = response.headers.get('content-type') || '';
        const errorMsg = contentType.includes('application/json')
          ? (await response.json()).error || 'Erro ao baixar arquivo'
          : `Erro ${response.status} ao baixar arquivo`;
        alert(errorMsg);
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Free the object URL after the browser has had a chance to use it
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro de conexão ao tentar baixar o arquivo');
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando editor...</p>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-2 sm:p-4 flex flex-col gap-2 sm:gap-4">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center flex-1 sm:flex-none">
              <Server className="w-5 h-5 text-gray-500 mr-2 flex-shrink-0" />
              <select
                value={selectedContainer?.id || ''}
                onChange={(e) => {
                  const container = containers.find(c => c.id === e.target.value);
                  setSelectedContainer(container);
                  setCurrentPath('');
                  setSidebarOpen(false);
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
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {selectedContainer && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={createNewFile}
                  className="flex items-center justify-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Arquivo
                </button>
                <button
                  onClick={createNewFolder}
                  className="flex items-center justify-center px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex-1 sm:flex-none"
                >
                  <Folder className="w-4 h-4 mr-1" />
                  Pasta
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex-1 sm:flex-none disabled:opacity-50"
                  title="Enviar arquivo ZIP e extrair"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {uploading ? 'Enviando...' : 'ZIP'}
                </button>
                <button
                  onClick={() => filesInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 flex-1 sm:flex-none disabled:opacity-50"
                  title="Enviar um ou mais arquivos individuais"
                >
                  <FileUp className="w-4 h-4 mr-1" />
                  Arquivos
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 flex-1 sm:flex-none disabled:opacity-50"
                  title="Enviar uma pasta inteira (preserva estrutura)"
                >
                  <FolderPlus className="w-4 h-4 mr-1" />
                  Pasta
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={uploadZip}
                  className="hidden"
                />
                <input
                  ref={filesInputRef}
                  type="file"
                  multiple
                  onChange={uploadFiles}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-ignore — atributo não-padrão suportado por Chromium/Firefox
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={uploadFolder}
                  className="hidden"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTerminalVisible(!terminalVisible)}
                className={`flex items-center justify-center px-3 py-1 rounded text-sm ${
                  terminalVisible
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <TerminalIcon className="w-4 h-4 mr-1" />
                Terminal
              </button>

		<button
  onClick={() => setLogsVisible(!logsVisible)}
  className={`flex items-center justify-center px-3 py-1 rounded text-sm ${
    logsVisible
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-gray-600 hover:bg-gray-700 text-white'
  }`}
>
  <FileText className="w-4 h-4 mr-1" />
  Logs
</button>


              {currentFile && (
                <button
                  onClick={saveFile}
                  disabled={!hasUnsavedChanges || saving}
                  className={`flex items-center justify-center px-3 py-1 rounded text-sm flex-1 sm:flex-none ${
                    hasUnsavedChanges 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              )}

              <select
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="mozhost-dark">Escuro Azul</option>
                <option value="mozhost-light">Claro Azul</option>
                <option value="vs-dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="hc-black">Alto Contraste</option>
              </select>
            </div>
          </div>
        </div>

        {selectedContainer ? (
          <div className="flex-1 flex relative overflow-hidden">
            {isMobile && sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-10"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {(!isMobile || sidebarOpen) && (
              <FileExplorer
                container={selectedContainer}
                files={files}
                currentPath={currentPath}
                onFileClick={openFile}
                onDelete={deleteFile}
                onRefresh={() => loadFiles(currentPath)}
                onNavigate={setCurrentPath}
                onClose={() => setSidebarOpen(false)}
                isMobile={isMobile}
                onRename={renameFile}
                onMove={moveFile}
                onDuplicate={duplicateFile}
                onExtractZip={extractZip}
                onDownload={downloadFile}
              />
            )}

            <div className="flex-1 flex flex-col min-w-0">
              <div className={`flex flex-col min-w-0 ${
                terminalVisible && !terminalMaximized ? 'flex-1' : 'h-full'
              }`}>
                {currentFile ? (
                  <>
                    <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{currentFile.name}</span>
                        {hasUnsavedChanges && (
                          <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-2 flex-shrink-0 hidden sm:block">
                        {getFileLanguage(currentFile.name)}
                      </div>
                    </div>

                    <div className="flex-1 min-h-0">
                      <Editor
                        height="100%"
                        language={getFileLanguage(currentFile.name)}
                        value={fileContent}
                        onChange={(value) => setFileContent(value || '')}
                        theme={editorTheme}
                        beforeMount={(monaco) => {
                          // Define custom MozHost Blue themes
                          monaco.editor.defineTheme('mozhost-dark', {
                            base: 'vs-dark',
                            inherit: true,
                            rules: [
                              { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                              { token: 'keyword', foreground: '60A5FA' },
                              { token: 'string', foreground: 'CE9178' },
                              { token: 'number', foreground: 'B5CEA8' },
                              { token: 'type', foreground: '60A5FA' },
                              { token: 'function', foreground: '93C5FD' },
                              { token: 'variable', foreground: 'E2E8F0' },
                              { token: 'constant', foreground: '60A5FA' },
                            ],
                            colors: {
                              'editor.background': '#0f172a',
                              'editor.foreground': '#e2e8f0',
                              'editor.lineHighlightBackground': '#1e3a5f55',
                              'editor.selectionBackground': '#3B82F640',
                              'editorCursor.foreground': '#3B82F6',
                              'editorLineNumber.foreground': '#3B82F660',
                              'editorLineNumber.activeForeground': '#3B82F6',
                              'editorBracketMatch.background': '#3B82F630',
                              'editorBracketMatch.border': '#3B82F6',
                              'editorGutter.background': '#0f172a',
                              'focusBorder': '#3B82F6',
                            },
                          });
                          monaco.editor.defineTheme('mozhost-light', {
                            base: 'vs',
                            inherit: true,
                            rules: [
                              { token: 'comment', foreground: '4B8B3B', fontStyle: 'italic' },
                              { token: 'keyword', foreground: '2563EB' },
                              { token: 'string', foreground: 'A31515' },
                              { token: 'number', foreground: '098658' },
                              { token: 'type', foreground: '2563EB' },
                              { token: 'function', foreground: '1D4ED8' },
                            ],
                            colors: {
                              'editor.background': '#f8fafc',
                              'editor.foreground': '#1e293b',
                              'editor.lineHighlightBackground': '#EFF6FF',
                              'editor.selectionBackground': '#BFDBFE',
                              'editorCursor.foreground': '#3B82F6',
                              'editorLineNumber.foreground': '#3B82F680',
                              'editorLineNumber.activeForeground': '#2563EB',
                              'editorBracketMatch.background': '#DBEAFE',
                              'editorBracketMatch.border': '#3B82F6',
                              'editorGutter.background': '#f8fafc',
                              'focusBorder': '#3B82F6',
                            },
                          });
                        }}
                        onMount={(editor) => {
                          editorRef.current = editor;
                          editor.updateOptions({
                            fontSize: isMobile ? 12 : fontSize,
                            wordWrap: 'on',
                            minimap: { enabled: !isMobile },
                            scrollBeyondLastLine: false,
                            automaticLayout: true
                          });
                        }}
                        options={{
                          selectOnLineNumbers: true,
                          automaticLayout: true,
                          tabSize: 2
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
                    <div className="text-center max-w-md">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Editor de Código MozHost
                      </h3>
                      <p className="text-gray-500 mb-4 text-sm">
                        {isMobile 
                          ? 'Toque em "Menu" para navegar'
                          : 'Selecione um arquivo para editar'
                        }
                      </p>
                      <div className="space-y-2 text-sm text-gray-400">
                        <p>✨ Monaco Editor (VS Code)</p>
                        <p>🖥️ Terminal integrado</p>
                        <p>🎨 Syntax highlighting</p>
                        <p>📁 Explorador de arquivos</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal com importação dinâmica */}
              <Terminal
                containerId={selectedContainer?.id}
                visible={terminalVisible}
                onClose={() => setTerminalVisible(false)}
                maximized={terminalMaximized}
                onToggleMaximize={() => setTerminalMaximized(!terminalMaximized)}
              />
	      <LogsPage
  containerId={selectedContainer?.id}
  visible={logsVisible}
  onClose={() => setLogsVisible(false)}
  maximized={logsMaximized}
  onToggleMaximize={() => setLogsMaximized(!logsMaximized)}
/>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Server className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum container selecionado
              </h3>
              <p className="text-gray-500">
                Selecione um container para editar seus arquivos
              </p>
            </div>
          </div>
        )}

        {/* Modal genérico de input (substitui window.prompt) */}
        {inputModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900">{inputModal.title}</h3>
                <button
                  onClick={closeInputModal}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <input
                  autoFocus
                  value={inputModalValue}
                  onChange={(e) => setInputModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInputModalSubmit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      closeInputModal();
                    }
                  }}
                  placeholder={inputModal.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50">
                <button
                  onClick={closeInputModal}
                  disabled={inputModal.loading}
                  className="px-3 py-1.5 text-sm rounded-md text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInputModalSubmit}
                  disabled={inputModal.loading || !inputModalValue.trim()}
                  className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {inputModal.loading ? 'Salvando...' : inputModal.submitLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

  );
};

export default CodeEditor;
