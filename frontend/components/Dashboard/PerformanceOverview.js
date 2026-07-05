import React from 'react';
import { Cpu, MemoryStick, HardDrive } from 'lucide-react';

const PerformanceOverview = ({ stats }) => {
  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Visão Geral de Performance</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ResourceCard
          title="CPU"
          percentage={stats.cpuUsage}
          icon={Cpu}
          color="blue"
        />
        <ResourceCard
          title="Memória"
          percentage={stats.memoryUsage}
          icon={MemoryStick}
          color="green"
        />
        <ResourceCard
          title="Armazenamento"
          percentage={stats.storageUsage}
          icon={HardDrive}
          color="blue"
        />
      </div>
    </div>
  );
};

const ResourceCard = ({ title, percentage, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-700 bg-blue-600',
    green: 'text-green-700 bg-green-600',
    purple: 'text-blue-700 bg-blue-600'
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-3">
        <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[0]} mr-2`} />
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>

      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-300"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${percentage * 2.01} 201`}
            className={colorClasses[color].split(' ')[1]}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-300 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color].split(' ')[1]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default PerformanceOverview;
