import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { 
  Save, 
  Folder, 
  File, 
  Plus, 
  Menu,
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  Search,
  Settings,
  FolderOpen,
  FileText,
  X,
  Terminal,
  Play,
  Square,
  Server
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const CodeEditor = () => {
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
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Para mobile
  const [isMobile, setIsMobile] = useState(false);

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadContainers();
    
    // Detectar mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false); // Fechar sidebar em desktop
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

  const loadContainers = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch('http://50.116.46.130:3001/api/containers', {
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

  const loadFiles = async (path = '') => {
    if (!selectedContainer) return;

    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(
        `http://50.116.46.130:3001/api/files/${selectedContainer.id}?path=${encodeURIComponent(path)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
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
          // É um arquivo
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
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(
        `http://50.116.46.130:3001/api/files/${selectedContainer.id}?path=${encodeURIComponent(file.path)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentFile(data);
        setFileContent(data.content || '');
        setOriginalContent(data.content || '');
      }
    } catch (error) {
      console.error('Erro ao abrir arquivo:', error);
    }
  };

  const saveFile = async () => {
    if (!currentFile || !selectedContainer) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(
        `http://50.116.46.130:3001/api/files/${selectedContainer.id}/${currentFile.path}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
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
      const token = localStorage.getItem('mozhost_token');
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      
      const response = await fetch(`http://50.116.46.130:3001/api/files/${selectedContainer.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: filePath,
          type: 'file',
          content: getFileTemplate(fileName)
        })
      });

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
      const token = localStorage.getItem('mozhost_token');
      const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      const response = await fetch(`http://50.116.46.130:3001/api/files/${selectedContainer.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: folderPath,
          type: 'directory'
        })
      });

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
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(
        `http://50.116.46.130:3001/api/files/${selectedContainer.id}/${file.path}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
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

  const getFileLanguage = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript', 
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'env': 'shell',
      'sh': 'shell',
      'txt': 'plaintext'
    };
    return languageMap[ext] || 'plaintext';
  };

  const getFileTemplate = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const templates = {
      'js': `// ${filename}
console.log('Hello from MozHost! 🚀');

// Adicione seu código aqui`,
      
      'py': `# ${filename}
print("Hello from MozHost! 🚀")

# Adicione seu código aqui`,
      
      'json': `{
  "name": "${filename.replace('.json', '')}",
  "version": "1.0.0",
  "description": "Criado na MozHost",
  "main": "index.js"
}`,
      
      'html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MozHost</title>
</head>
<body>
    <h1>Hello from MozHost! 🚀</h1>
</body>
</html>`,
      
      'css': `/* ${filename} */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}`,
      
      'md': `# ${filename.replace('.md', '')}

Criado na **MozHost** 🚀

## Sobre

Adicione sua documentação aqui.

## Como usar

\`\`\`bash
npm install
npm start
\`\`\``
    };
    
    return templates[ext] || `// ${filename}\n// Criado na MozHost 🚀\n\n`;
  };

  const goBack = () => {
    const pathParts = currentPath.split('/').filter(p => p);
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="files">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando editor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="files">
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            {/* Mobile menu toggle */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 sm:hidden"
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
                  setSidebarOpen(false); // Fechar sidebar após seleção no mobile
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
          
          {/* Mobile actions row */}
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
          <div className="flex-1 flex relative">
            {/* Mobile Sidebar Overlay */}
            {isMobile && sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-10"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* File Explorer */}
            <div className={`
              ${isMobile ? 'fixed left-0 top-0 bottom-0 z-20 transform transition-transform duration-300' : 'relative'}
              ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
              w-80 sm:w-80 bg-gray-50 border-r flex flex-col
            `}>
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Explorador</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadFiles(currentPath)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                    {isMobile && (
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded sm:hidden"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Breadcrumb */}
                <div className="flex items-center text-sm text-gray-500 overflow-x-auto">
                  <button
                    onClick={() => setCurrentPath('')}
                    className="hover:text-gray-700 whitespace-nowrap"
                  >
                    {selectedContainer.name}
                  </button>
                  {currentPath && (
                    <>
                      <span className="mx-1 flex-shrink-0">/</span>
                      {currentPath.split('/').map((part, index, arr) => (
                        <span key={index} className="flex items-center">
                          {index < arr.length - 1 ? (
                            <button
                              onClick={() => {
                                const path = arr.slice(0, index + 1).join('/');
                                setCurrentPath(path);
                              }}
                              className="hover:text-gray-700 whitespace-nowrap"
                            >
                              {part}
                            </button>
                          ) : (
                            <span className="text-gray-900 whitespace-nowrap">{part}</span>
                          )}
                          {index < arr.length - 1 && <span className="mx-1 flex-shrink-0">/</span>}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {currentPath && (
                  <button
                    onClick={goBack}
                    className="w-full flex items-center p-2 text-sm text-gray-600 hover:bg-gray-100 rounded mb-2"
                  >
                    <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0" />
                    .. (voltar)
                  </button>
                )}

                {files.map((file) => (
                  <div key={file.name} className="group flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                    <button
                      onClick={() => {
                        openFile(file);
                        if (isMobile && file.type === 'file') {
                          setSidebarOpen(false); // Fechar sidebar ao abrir arquivo no mobile
                        }
                      }}
                      className="flex items-center flex-1 text-left min-w-0"
                    >
                      {file.type === 'directory' ? (
                        <Folder className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{file.name}</span>
                    </button>
                    
                    <button
                      onClick={() => deleteFile(file)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col min-w-0">
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
                      {getFileLanguage(currentFile.name)} • {currentFile.size} bytes
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
                          minimap: { enabled: !isMobile }, // Desabilitar minimap no mobile
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          folding: !isMobile, // Desabilitar folding no mobile para economizar espaço
                          lineNumbers: isMobile ? 'off' : 'on', // Desabilitar números de linha no mobile
                          glyphMargin: !isMobile,
                          lineDecorationsWidth: isMobile ? 0 : undefined,
                          lineNumbersMinChars: isMobile ? 0 : undefined
                        });
                      }}
                      options={{
                        selectOnLineNumbers: true,
                        roundedSelection: false,
                        readOnly: false,
                        cursorStyle: 'line',
                        automaticLayout: true,
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: 'on',
                        tabSize: 2,
                        insertSpaces: true,
                        scrollbar: {
                          horizontal: 'auto',
                          vertical: 'auto',
                          horizontalScrollbarSize: isMobile ? 8 : 12,
                          verticalScrollbarSize: isMobile ? 8 : 12
                        }
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
                        ? 'Toque em "Menu" para navegar pelos arquivos'
                        : 'Selecione um arquivo para começar a editar'
                      }
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>✨ Monaco Editor (VS Code)</p>
                      <p>🎨 Syntax highlighting</p>
                      <p>🔄 Auto-save</p>
                      <p>📁 Explorador de arquivos</p>
                    </div>
                  </div>
                </div>
              )}
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
    </DashboardLayout>
  );
};

export default CodeEditor;
