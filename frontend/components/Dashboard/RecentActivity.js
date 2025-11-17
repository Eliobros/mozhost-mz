// components/Dashboard/RecentActivity.js
import React from 'react';
import { Activity } from 'lucide-react';

const RecentActivity = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma atividade recente</p>
            <p className="text-sm">Crie um container para começar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.action === 'criado' ? 'bg-green-500' :
                activity.action === 'iniciado' ? 'bg-blue-500' :
                activity.action === 'parado' ? 'bg-orange-500' :
                'bg-purple-500'
              }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  Container <span className="font-medium">{activity.container}</span> foi {activity.action}
                </p>
                <div className="flex items-center mt-1 space-x-2">
                  <p className="text-xs text-gray-500">{activity.time}</p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">
                    {activity.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
