import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  FolderOpen, 
  RefreshCw, 
  Trash2,
  X,
  Edit3,
  Copy,
  FolderInput,
  Archive,
  CheckSquare,
  Square as SquareIcon
} from 'lucide-react';

const FileExplorer = ({
  container,
  files,
  currentPath,
  onFileClick,
  onDelete,
  onRefresh,
  onNavigate,
  onClose,
  isMobile,
  onRename,
  onMove,
  onDuplicate,
  onExtractZip
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const goBack = () => {
    const pathParts = currentPath.split('/').filter(p => p);
    pathParts.pop();
    onNavigate(pathParts.join('/'));
  };

  const toggleSelection = (file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.path === file.path);
      if (isSelected) {
        const next = prev.filter(f => f.path !== file.path);
        if (next.length === 0) setSelectionMode(false);
        return next;
      }
      return [...prev, file];
    });
  };

  const selectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
      setSelectionMode(false);
    } else {
      setSelectedFiles([...files]);
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectionMode(false);
  };

  const handleFileInteraction = (file, e) => {
    if (selectionMode) {
      e.preventDefault();
      toggleSelection(file);
    } else {
      onFileClick(file);
    }
  };

  const handleLongPress = (file) => {
    setSelectionMode(true);
    toggleSelection(file);
  };

  const hasZipSelected = selectedFiles.some(f => f.name?.endsWith('.zip'));

  const handleBulkDelete = () => {
    if (!confirm(`Deletar ${selectedFiles.length} item(ns) selecionado(s)?`)) return;
    selectedFiles.forEach(file => onDelete(file));
    clearSelection();
  };

  const handleRename = () => {
    if (selectedFiles.length !== 1) {
      alert('Selecione apenas 1 arquivo para renomear');
      return;
    }
    const file = selectedFiles[0];
    const newName = prompt('Novo nome:', file.name);
    if (!newName || newName === file.name) return;
    
    const newPath = currentPath ? `${currentPath}/${newName}` : newName;
    if (onRename) {
      onRename(file, newPath);
    }
    clearSelection();
  };

  const handleMove = () => {
    if (selectedFiles.length !== 1) {
      alert('Selecione apenas 1 arquivo para mover');
      return;
    }
    const file = selectedFiles[0];
    const newPath = prompt('Novo caminho (ex: pasta/arquivo.js):', file.path);
    if (!newPath || newPath === file.path) return;
    
    if (onMove) {
      onMove(file, newPath);
    }
    clearSelection();
  };

  const handleDuplicate = () => {
    if (selectedFiles.length !== 1) {
      alert('Selecione apenas 1 arquivo para duplicar');
      return;
    }
    if (onDuplicate) {
      onDuplicate(selectedFiles[0]);
    }
    clearSelection();
  };

  const handleExtractZip = () => {
    const zipFile = selectedFiles.find(f => f.name?.endsWith('.zip'));
    if (!zipFile) return;
    if (onExtractZip) {
      onExtractZip(zipFile);
    }
    clearSelection();
  };

  const isSelected = (file) => selectedFiles.some(f => f.path === file.path);

  return (
    <div className={`
      ${isMobile ? 'fixed left-0 top-0 bottom-0 z-20 transform transition-transform duration-300' : 'relative'}
      w-64 sm:w-72 md:w-80 bg-gray-50 border-r flex flex-col
    `}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">Explorador</h3>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => {
                if (selectionMode) clearSelection();
                else setSelectionMode(true);
              }}
              className={`p-1 rounded ${selectionMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title={selectionMode ? 'Sair da seleção' : 'Modo seleção'}
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={onRefresh}
              className="p-1 hover:bg-gray-100 rounded"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            {isMobile && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center text-xs sm:text-sm text-gray-500 overflow-x-auto">
          <button
            onClick={() => onNavigate('')}
            className="hover:text-gray-700 whitespace-nowrap"
          >
            {container?.name || 'Container'}
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
                        onNavigate(path);
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

      {/* Selection Action Bar */}
      {selectionMode && selectedFiles.length > 0 && (
        <div className="p-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-700">
              {selectedFiles.length} selecionado(s)
            </span>
            <div className="flex items-center gap-1">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">
                {selectedFiles.length === files.length ? 'Limpar' : 'Todos'}
              </button>
              <button onClick={clearSelection} className="p-1 hover:bg-blue-100 rounded">
                <X className="w-3 h-3 text-blue-600" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Deletar
            </button>
            {selectedFiles.length === 1 && (
              <>
                <button
                  onClick={handleRename}
                  className="inline-flex items-center px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Renomear
                </button>
                <button
                  onClick={handleMove}
                  className="inline-flex items-center px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                >
                  <FolderInput className="w-3 h-3 mr-1" />
                  Mover
                </button>
                <button
                  onClick={handleDuplicate}
                  className="inline-flex items-center px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Duplicar
                </button>
              </>
            )}
            {hasZipSelected && (
              <button
                onClick={handleExtractZip}
                className="inline-flex items-center px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              >
                <Archive className="w-3 h-3 mr-1" />
                Extrair ZIP
              </button>
            )}
          </div>
        </div>
      )}

      {/* File List */}
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
          <div 
            key={file.name} 
            className={`group flex items-center justify-between p-2 rounded cursor-pointer ${
              isSelected(file) ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'
            }`}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!selectionMode) {
                setSelectionMode(true);
              }
              toggleSelection(file);
            }}
          >
            {selectionMode && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelection(file); }}
                className="mr-2 flex-shrink-0"
              >
                {isSelected(file) ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <SquareIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}

            <button
              onClick={(e) => handleFileInteraction(file, e)}
              className="flex items-center flex-1 text-left min-w-0"
            >
              {file.type === 'directory' ? (
                <Folder className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
              )}
              <span className="text-sm truncate">{file.name}</span>
              {file.name?.endsWith('.zip') && (
                <Archive className="w-3 h-3 ml-1 text-indigo-400 flex-shrink-0" />
              )}
            </button>

            {!selectionMode && (
              <button
                onClick={() => onDelete(file)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded flex-shrink-0"
                title="Deletar"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            )}
          </div>
        ))}

        {files.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Pasta vazia</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
