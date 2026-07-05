'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, ArrowRight, RefreshCw, AlertTriangle, HelpCircle, Loader } from 'lucide-react';

function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorReason, setErrorReason] = useState('');

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const statusDetail = searchParams.get('status_detail');
    
    if (statusDetail) {
      setErrorReason(getErrorMessage(statusDetail));
    }
  }, [searchParams]);

  const getErrorMessage = (detail) => {
    const messages = {
      'cc_rejected_insufficient_amount': 'Saldo insuficiente no cartão',
      'cc_rejected_bad_filled_security_code': 'Código de segurança inválido',
      'cc_rejected_call_for_authorize': 'Pagamento rejeitado, entre em contato com seu banco',
      'cc_rejected_card_disabled': 'Cartão desabilitado',
      'cc_rejected_high_risk': 'Pagamento rejeitado por segurança',
      'cc_rejected_other_reason': 'Pagamento rejeitado pelo processador',
      'pending_waiting_payment': 'Aguardando pagamento'
    };
    return messages[detail] || 'Não foi possível processar o pagamento';
  };

  const commonReasons = [
    { icon: '💳', title: 'Saldo Insuficiente', desc: 'Verifique se há saldo disponível' },
    { icon: '🔒', title: 'Dados Incorretos', desc: 'Confira os dados do pagamento' },
    { icon: '🏦', title: 'Bloqueio Bancário', desc: 'Entre em contato com seu banco' },
    { icon: '⚠️', title: 'Limite Excedido', desc: 'Pode ter excedido o limite diário' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <XCircle className="w-14 h-14 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Pagamento Falhou
        </h1>
        
        <p className="text-gray-600 mb-2 text-lg">
          Não foi possível processar seu pagamento
        </p>

        {errorReason && (
          <p className="text-red-600 text-sm font-medium mb-6">
            {errorReason}
          </p>
        )}

        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <p className="text-sm text-red-800 mb-4 font-medium">
            Possíveis motivos:
          </p>
          <div className="grid grid-cols-2 gap-3 text-left">
            {commonReasons.map((reason, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl mb-1">{reason.icon}</div>
                <p className="text-xs font-semibold text-gray-800 mb-1">{reason.title}</p>
                <p className="text-xs text-gray-600">{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <HelpCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-blue-800 font-medium mb-2">
            O que fazer agora?
          </p>
          <ul className="text-xs text-blue-700 text-left space-y-1">
            <li>✓ Verifique seus dados bancários</li>
            <li>✓ Confira se há saldo suficiente</li>
            <li>✓ Tente outro método de pagamento</li>
            <li>✓ Entre em contato com seu banco se necessário</li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/#containers')}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-semibold flex items-center justify-center transition-all transform hover:scale-105 shadow-lg mb-3"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Tentar Novamente
        </button>

        <button
          onClick={() => router.push('/#dashboard')}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center transition-all"
        >
          Voltar ao Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Precisa de ajuda?</p>
          <button
            onClick={() => window.location.hash = 'whatsapp'}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Contatar Suporte via WhatsApp
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Nenhum valor foi cobrado da sua conta
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailure() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-16 h-16 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700 font-medium">Carregando...</p>
        </div>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}
