// admin/components/AuthGuard.tsx
'use client';

import React, { useState } from 'react';

interface AuthGuardProps {
  onAuthenticate: (password: string) => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ onAuthenticate }) => {
  const [pwd, setPwd] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd) onAuthenticate(pwd);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">🔐 Admin MozHost</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Senha do administrador"
            className="w-full p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition font-semibold"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};
