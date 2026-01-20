// WebTerminal/FileExplorer.js
import React from 'react';
import { 
  Folder, 
  FileText, 
  FolderOpen, 
  RefreshCw, 
  Trash2,
  X 
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
  isMobile
}) => {
  const goBack = () => {
    const pathParts = currentPath.split('/').filter(p => p);
    pathParts.pop();
    onNavigate(pathParts.join('/'));
  };

  return (
    <div className={`
      ${isMobile ? 'fixed left-0 top-0 bottom-0 z-20 transform transition-transform duration-300' : 'relative'}
      w-80 bg-gray-50 border-r flex flex-col
    `}>
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Explorador</h3>
          <div className="flex items-center space-x-2">
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
        <div className="flex items-center text-sm text-gray-500 overflow-x-auto">
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
            className="group flex items-center justify-between p-2 hover:bg-gray-100 rounded"
          >
            <button
              onClick={() => onFileClick(file)}
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
              onClick={() => onDelete(file)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded flex-shrink-0"
              title="Deletar"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
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
