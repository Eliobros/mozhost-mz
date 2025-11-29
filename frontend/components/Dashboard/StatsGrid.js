// components/Dashboard/StatsGrid.js
import React from 'react';
import { Server, Activity, HardDrive, Clock } from 'lucide-react';

const StatsGrid = ({ stats }) => {
  const statCards = [
    {
      title: 'Total de Containers',
      value: stats.total,
      icon: Server,
      color: 'blue'
    },
    {
      title: 'Em Execução',
      value: stats.running,
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Parados',
      value: stats.stopped,
      icon: Server,
      color: 'gray'
    },
    {
      title: 'Uptime',
      value: stats.uptime,
      icon: Clock,
      color: 'purple'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                <Icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;
