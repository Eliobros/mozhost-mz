'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop';

function CliAuthContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const provider = searchParams.get('provider') || 'google';
  const jwt = searchParams.get('jwt');
  const error = searchParams.get('error');

  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function authorizeToken(jwtToken) {
    const res = await fetch(`${API_URL}/api/auth/cli-device/${token}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    if (!res.ok) throw new Error('Falha ao autorizar token');
  }

  useEffect(() => {
    if (error) {
      setStatus('error');
      setMessage('Erro na autenticação. Volta ao terminal e tenta novamente.');
      return;
    }

    if (jwt && token) {
      authorizeToken(jwt)
        .then(() => setStatus('success'))
        .catch(() => {
          setStatus('error');
          setMessage('Falha ao autorizar. Tenta novamente.');
        });
    }
  }, []);

  function handleOAuth() {
    if (!token) {
      setStatus('error');
      setMessage('Token inválido. Volta ao terminal e tenta novamente.');
      return;
    }

    setStatus('loading');
    sessionStorage.setItem('cli_device_token', token);
    sessionStorage.setItem('cli_provider', provider);

    window.location.href = `${API_URL}/api/auth/${provider}?redirect_uri=${encodeURIComponent(window.location.origin + '/cli-auth/callback')}`;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace'
    }}>
      <div style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center'
      }}>
        <img src="/mozhost.png" alt="MozHost" style={{ width: 60, marginBottom: 20 }} />
        <h1 style={{ color: '#fff', fontSize: 22, marginBottom: 8 }}>MozHost CLI</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
          Autenticar via {provider === 'google' ? 'Google' : 'GitHub'}
        </p>

        {status === 'idle' && (
          <>
            <p style={{ color: '#aaa', fontSize: 13, marginBottom: 24 }}>
              Clica no botão abaixo para autenticar o teu terminal com a tua conta MozHost.
            </p>
            <button onClick={handleOAuth} style={{
              background: provider === 'github' ? '#24292e' : '#4285f4',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: 15,
              cursor: 'pointer',
              width: '100%'
            }}>
              {provider === 'google' ? '🔵 Continuar com Google' : '⚫ Continuar com GitHub'}
            </button>
          </>
        )}

        {status === 'loading' && (
          <p style={{ color: '#aaa', fontSize: 14 }}>⏳ Redirecionando...</p>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#4ade80', fontSize: 18, marginBottom: 8 }}>
              Autenticado com sucesso!
            </h2>
            <p style={{ color: '#666', fontSize: 13 }}>
              Podes fechar esta janela e voltar ao terminal.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#f87171', fontSize: 18, marginBottom: 8 }}>
              Erro de autenticação
            </h2>
            <p style={{ color: '#666', fontSize: 13 }}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'monospace'
      }}>
        ⏳ Carregando...
      </div>
    }>
      <CliAuthContent />
    </Suspense>
  );
}
