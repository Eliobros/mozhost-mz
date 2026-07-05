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
      color: 'blue'
    }
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const colors = colorClasses[stat.color];
        return (
          <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${colors.bg}`}>
                <Icon className={`h-6 w-6 ${colors.text}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;
