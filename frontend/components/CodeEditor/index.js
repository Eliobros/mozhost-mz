// WebTerminal/index.js (ATUALIZADO - Com fix SSR)
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import dynamic from 'next/dynamic'; // IMPORTANTE: Importar dynamic
import { 
  Save, 
  Plus, 
  Menu,
  Server,
  FileText,
  Folder,
  Terminal as TerminalIcon
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
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados do Terminal
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
const [logsVisible, setLogsVisible] = useState(false);
const [logsMaximized, setLogsMaximized] = useState(false);

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

  const createNewFile = async () => {
    if (!selectedContainer) return;

    const fileName = prompt('Nome do arquivo (ex: bot.js, main.py):');
    if (!fileName) return;

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
      }
    } catch (error) {
      console.error('Erro ao criar arquivo:', error);
    }
  };

  const createNewFolder = async () => {
    if (!selectedContainer) return;

    const folderName = prompt('Nome da pasta:');
    if (!folderName) return;

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
      }
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
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
        <div className="bg-white shadow-sm border-b p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
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
      </div>
    
  );
};

export default CodeEditor;
