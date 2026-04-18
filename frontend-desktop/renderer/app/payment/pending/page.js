'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock, Coins, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    const externalReference = searchParams.get('external_reference');
    
    if (paymentId || externalReference) {
      // Opcional: verificar status automaticamente a cada 5 segundos
      const interval = setInterval(() => {
        checkPaymentStatus(paymentId || externalReference);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [searchParams]);

  const checkPaymentStatus = async (paymentId) => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop'}/api/payment/status/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          router.push('/payment/success');
        } else if (data.status === 'failed') {
          router.push('/payment/failure');
        }
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    const paymentId = searchParams.get('payment_id') || searchParams.get('external_reference');
    await checkPaymentStatus(paymentId);
    setTimeout(() => setChecking(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Clock className="w-14 h-14 text-white animate-pulse" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Pagamento Pendente
        </h1>
        
        <p className="text-gray-600 mb-6 text-lg">
          Estamos aguardando a confirmação do seu pagamento
        </p>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
          <AlertCircle className="w-10 h-10 text-yellow-600 mx-auto mb-3" />
          <p className="text-sm text-yellow-800 mb-3 font-medium">
            O que isso significa?
          </p>
          <ul className="text-xs text-yellow-700 text-left space-y-2">
            <li>• Seu pagamento foi iniciado com sucesso</li>
            <li>• Aguardando confirmação do processador</li>
            <li>• Pode levar de 5 minutos até 24 horas</li>
            <li>• Você será notificado quando confirmar</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <Coins className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-blue-800">
            Suas coins serão creditadas automaticamente após a confirmação
          </p>
        </div>

        <button
          onClick={handleManualCheck}
          disabled={checking}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 mb-3"
        >
          {checking ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Verificar Status Agora
            </>
          )}
        </button>

        <button
          onClick={() => router.push('/#containers')}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center transition-all"
        >
          Voltar para Containers
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        <p className="text-xs text-gray-500 mt-6">
          Em caso de dúvidas, entre em contato com o suporte
        </p>
      </div>
    </div>
  );
}

export default function PaymentPending() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Clock className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700 font-medium">Carregando...</p>
        </div>
      </div>
    }>
      <PaymentPendingContent />
    </Suspense>
  );
}
