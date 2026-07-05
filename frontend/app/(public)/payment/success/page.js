'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Coins, ArrowRight, Loader } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coinsAdded, setCoinsAdded] = useState(0);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    const externalReference = searchParams.get('external_reference');
    
    if (paymentId || externalReference) {
      confirmPayment(paymentId || externalReference);
    } else {
      setTimeout(() => setLoading(false), 2000);
    }
  }, [searchParams]);

  const confirmPayment = async (paymentId) => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop'}/api/payment/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId })
      });

      if (response.ok) {
        const data = await response.json();
        setCoinsAdded(data.coinsAdded || 0);
      }
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-16 h-16 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700 font-medium">Processando pagamento...</p>
          <p className="text-sm text-gray-500 mt-2">Aguarde enquanto confirmamos sua transação</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce">
          <CheckCircle className="w-14 h-14 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Pagamento Confirmado!
        </h1>
        
        <p className="text-gray-600 mb-6 text-lg">
          Suas coins foram creditadas com sucesso! 🎉
        </p>

        {coinsAdded > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 mb-6 shadow-inner">
            <Coins className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-pulse" />
            <p className="text-2xl font-bold text-yellow-700 mb-1">
              +{coinsAdded} Coins
            </p>
            <p className="text-sm text-yellow-600">
              Adicionados à sua conta
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800 font-medium">
            ✅ Você já pode criar seus containers e hospedar seus bots!
          </p>
        </div>

        <button
          onClick={() => router.push('/#containers')}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-semibold flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
        >
          Ir para Containers
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        <button
          onClick={() => router.push('/#dashboard')}
          className="w-full mt-3 text-gray-600 hover:text-gray-800 py-2 text-sm transition-colors"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-16 h-16 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700 font-medium">Carregando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
