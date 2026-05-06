'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const cliDeviceToken = sessionStorage.getItem('cli_device_token');

    if (token && cliDeviceToken) {
      router.replace(`/cli-auth?jwt=${token}&token=${cliDeviceToken}`);
    } else {
      router.replace('/cli-auth?error=missing_token');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'monospace'
    }}>
      ⏳ Processando autenticação...
    </div>
  );
}

export default function CliAuthCallback() {
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
      <CallbackContent />
    </Suspense>
  );
}
