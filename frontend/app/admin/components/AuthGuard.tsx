'use client';

import React, { useState } from 'react';
import { API_ROOT } from '../utils/api';

interface AuthGuardProps {
  onAuthenticate: (password: string) => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ onAuthenticate }) => {
  const [pwd, setPwd] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;

    setLoading(true);
    setErro('');

    try {
      const res = await fetch(
        `${API_ROOT}/api/admin/stats?password=${encodeURIComponent(pwd)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Senha inválida');
      }

      onAuthenticate(pwd);
    } catch (err: any) {
      setErro(err.message || 'Senha inválida');
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
          />
          {erro && (
            <p className="text-red-600 text-sm mb-4">{erro}</p>
          )}
          <button
            type="submit"
            disabled={loading || !pwd}
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition font-semibold disabled:opacity-50"
          >
            {loading ? 'A verificar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
