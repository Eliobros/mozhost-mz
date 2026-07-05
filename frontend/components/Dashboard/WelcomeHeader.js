// components/Dashboard/WelcomeHeader.js
import React from 'react';
import { Activity } from 'lucide-react';

const WelcomeHeader = ({ user, coins, uptime }) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-lg shadow-lg p-6 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Bem-vindo de volta, {user?.username || 'Usuário'}! 👋
          </h1>
          <p className="mt-2 text-blue-100">
            Aqui está um resumo da sua conta MozHost
          </p>
          <div className="mt-3 inline-flex items-center bg-yellow-100 text-yellow-900 px-3 py-1 rounded-md">
            <span className="text-sm font-semibold">Coins: {coins}</span>
            <a
              href="https://api.whatsapp.com/send?phone=258862840075&text=Ola+quero+comprar+coins"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 text-sm underline"
            >
              Comprar coins
            </a>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="flex items-center bg-white/10 backdrop-blur rounded-lg px-4 py-2">
            <Activity className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Uptime: {uptime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
