import React from 'react';
import { Server, Plus } from 'lucide-react';

const ContainersPreview = ({ containers }) => {
  if (!containers || containers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Seus Containers</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Server className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">Nenhum container</h3>
            <p className="mt-2 text-sm text-gray-500">
              Comece criando seu primeiro container para hospedar seus bots.
            </p>
            <div className="mt-6">
              <a
                href="#containers"
                className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Container
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Seus Containers</h3>
          <a
            href="#containers"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todos →
          </a>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {containers.slice(0, 4).map((container) => (
            <ContainerMiniCard key={container.id} container={container} />
          ))}
          {containers.length > 4 && (
            <div className="md:col-span-2 text-center py-4">
              <a
                href="#containers"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver mais {containers.length - 4} containers →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ContainerMiniCard = ({ container }) => {
  const statusColors = {
    running: 'bg-green-100 text-green-800 border-green-200',
    stopped: 'bg-gray-100 text-gray-800 border-gray-200',
    error: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Server className="w-8 h-8 text-gray-600" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-semibold text-gray-900">{container.name}</p>
          <div className="flex items-center mt-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${statusColors[container.status]}`}>
              {container.status}
            </span>
            <span className="ml-2 text-xs text-gray-600 uppercase font-medium">{container.type}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        {container.port && (
          <p className="text-xs text-gray-600 font-medium">Porta {container.port}</p>
        )}
        <p className="text-xs text-gray-600">
          {new Date(container.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default ContainersPreview;
