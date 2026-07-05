// components/Dashboard/QuickActions.js
import React from 'react';
import { Code, Database, FileText, Terminal, ExternalLink } from 'lucide-react';

const QuickActions = () => {
  const quickActions = [
    {
      title: 'Novo Container Node.js',
      description: 'Criar container para bots JavaScript',
      icon: Code,
      color: 'bg-green-500',
      href: '#containers'
    },
    {
      title: 'Novo Container Python',
      description: 'Criar container para bots Python',
      icon: Database,
      color: 'bg-blue-500',
      href: '#containers'
    },
    {
      title: 'Abrir Editor',
      description: 'Editar códigos dos seus bots',
      icon: FileText,
      color: 'bg-blue-500',
      href: '#files'
    },
    {
      title: 'Acessar Terminal',
      description: 'Terminal web para comandos',
      icon: Terminal,
      color: 'bg-gray-700',
      href: '#terminal'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="group relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-4 py-3 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <div className={`flex-shrink-0 w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                  {action.title}
                </p>
                <p className="text-xs text-gray-500">
                  {action.description}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
