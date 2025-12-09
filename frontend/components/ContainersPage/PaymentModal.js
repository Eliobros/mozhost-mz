import React, { useState } from 'react';
import { X, Coins, Smartphone, Loader, CheckCircle, AlertCircle, CreditCard, ExternalLink } from 'lucide-react';

const PaymentModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const [mercadoPagoUrl, setMercadoPagoUrl] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.topaziocoin.online';
  const ALAUDA_API_URL = 'https://alauda-api.topazioverse.com.br';

  const packages = [
    { mzn: 50, coins: 500, popular: false },
    { mzn: 100, coins: 1100, popular: true, bonus: '+100 bonus' },
    { mzn: 200, coins: 2300, popular: false, bonus: '+300 bonus' },
    { mzn: 500, coins: 6000, popular: false, bonus: '+1000 bonus' }
  ];

  const paymentMethods = [
    { 
      id: 'mpesa', 
      name: 'M-Pesa', 
      icon: '📱', 
      color: 'red',
      prefix: ['84', '85'],
      description: 'Vodacom (Moçambique)',
      requiresPhone: true,
      currency: 'MZN'
    },
    { 
      id: 'emola', 
      name: 'e-Mola', 
      icon: '💳', 
      color: 'blue',
      prefix: ['86', '87'],
      description: 'Movitel (Moçambique)',
      requiresPhone: true,
      currency: 'MZN'
    },
    { 
      id: 'mercadopago', 
      name: 'MercadoPago', 
      icon: '💰', 
      color: 'cyan',
      prefix: [],
      description: 'PIX, Cartão, Boleto (Brasil)',
      requiresPhone: false,
      requiresEmail: true,
      currency: 'BRL'
    }
  ];

  const handlePackageSelect = (pkg) => {
    setAmount(pkg.mzn.toString());
    setError('');
    setStep('method');
  };

  const handleCustomAmount = () => {
    const numAmount = parseInt(amount);
    if (!amount || numAmount < 50) {
      setError('Valor mínimo: 50');
      return;
    }
    setError('');
    setStep('method');
  };

  const validatePhone = (phone, method) => {
    const phoneRegex = /^(84|85|86|87)\d{7}$/;
    if (!phoneRegex.test(phone)) {
      return false;
    }
    const selectedMethod = paymentMethods.find(m => m.id === method);
    if (!selectedMethod?.prefix?.length) return true;
    const prefix = phone.substring(0, 2);
    return selectedMethod.prefix.includes(prefix);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePayment = async () => {
    setError('');
    const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);

    if (selectedMethod?.requiresPhone && !phoneNumber) {
      setError('Número de telefone é obrigatório');
      return;
    }

    if (selectedMethod?.requiresPhone && !validatePhone(phoneNumber, paymentMethod)) {
      setError(`Número inválido para ${selectedMethod.name}. Use: ${selectedMethod.prefix.join(' ou ')}`);
      return;
    }

    if (selectedMethod?.requiresEmail && !validateEmail(email)) {
      setError('Email inválido');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      const token = localStorage.getItem('mozhost_token');
      const userData = JSON.parse(localStorage.getItem('mozhost_user') || '{}');
      const userId = userData.id;

      if (paymentMethod === 'mercadopago') {
        await handleMercadoPagoPayment(token, userId);
      } else {
        await handleMobilePayment(token, userId);
      }

    } catch (err) {
      console.error('Erro no pagamento:', err);
      setError(err.message);
      setStep('error');
      setLoading(false);
    }
  };

  const handleMercadoPagoPayment = async (token, userId) => {
    const response = await fetch(`${ALAUDA_API_URL}/api/payment/mercadopago`, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${process.env.NEXT_PUBLIC_ALAUDA_API_KEY || 'sua_api_key'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        amount: parseFloat(amount),
        description: `Compra de ${getCoinsFromAmount(amount)} coins - MozHost`,
        usuario_id: userId?.toString() || 'guest',
        back_urls: {
          success: `${window.location.origin}/#containers?payment=success`,
          failure: `${window.location.origin}/#containers?payment=failed`,
          pending: `${window.location.origin}/#containers?payment=pending`
        }
      })
    });

    const data = await response.json();

    if (!data.success && !data.data?.init_point) {
      throw new Error(data.message || data.error || 'Erro ao criar pagamento MercadoPago');
    }

    const paymentData = data.data || data;
    
    await fetch(`${API_URL}/api/payment/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseInt(amount),
        paymentMethod: 'mercadopago',
        phoneNumber: null,
        external_payment_id: paymentData.id || paymentData.external_reference,
        provider: 'mercadopago'
      })
    });

    setMercadoPagoUrl(paymentData.init_point || paymentData.sandbox_init_point);
    setStep('mercadopago');
    setLoading(false);
  };

  const handleMobilePayment = async (token, userId) => {
    const response = await fetch(`${ALAUDA_API_URL}/api/payment/${paymentMethod}`, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${process.env.NEXT_PUBLIC_ALAUDA_API_KEY || 'sua_api_key'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valor: amount,
        numero_celular: phoneNumber,
        usuario_id: userId?.toString() || 'guest'
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || data.error || 'Erro ao processar pagamento');
    }

    setPaymentResult(data);

    await fetch(`${API_URL}/api/payment/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseInt(amount),
        paymentMethod,
        phoneNumber,
        external_payment_id: data.data?.transaction_id || data.transaction_id,
        provider: 'paymoz'
      })
    });

    setTimeout(() => checkPaymentStatus(), 3000);
  };

  const checkPaymentStatus = async () => {
    const maxAttempts = 60;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const token = localStorage.getItem('mozhost_token');

        const response = await fetch(`${API_URL}/api/payment/check-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setStep('success');
          setLoading(false);
          setTimeout(() => {
            onSuccess(data.coinsAdded);
          }, 2000);
        } else if (data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(interval);
          setError('Pagamento expirou ou foi cancelado. Tente novamente.');
          setStep('error');
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    }, 5000);
  };

  const getCoinsFromAmount = (value) => {
    return parseInt(value) * 10;
  };

  const selectedMethodData = paymentMethods.find(m => m.id === paymentMethod);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">Comprar Coins</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'amount' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Escolha um pacote
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.mzn}
                      onClick={() => handlePackageSelect(pkg)}
                      className={`relative p-4 border-2 rounded-lg text-left hover:border-blue-500 transition-all ${
                        pkg.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          Popular
                        </span>
                      )}
                      <div className="text-2xl font-bold text-gray-900">{pkg.mzn}</div>
                      <div className="text-xs text-gray-500">MZN / R$</div>
                      <div className="text-sm text-gray-600 mt-1">
                        <Coins className="inline w-4 h-4 text-yellow-500 mr-1" />
                        {pkg.coins} coins
                      </div>
                      {pkg.bonus && (
                        <div className="text-xs text-green-600 font-medium mt-1">{pkg.bonus}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ou valor personalizado</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (mín. 50)
                </label>
                <input
                  type="number"
                  min="50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 150"
                />
                {amount && (
                  <p className="mt-1 text-xs text-gray-500">
                    = {getCoinsFromAmount(amount)} coins
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <button
                onClick={handleCustomAmount}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-md font-medium"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 'method' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <div className="font-medium text-blue-900">Resumo:</div>
                <div className="text-blue-700 mt-1">
                  {amount} = {getCoinsFromAmount(amount)} coins
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de pagamento
                </label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full p-3 border-2 rounded-lg text-left flex items-center justify-between transition-all ${
                        paymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{method.icon}</span>
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-xs text-gray-500">{method.description}</div>
                        </div>
                      </div>
                      {paymentMethod === method.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethodData?.requiresPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número {selectedMethodData.name}
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      +258
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      maxLength="9"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`${selectedMethodData.prefix.join(' ou ')}XXXXXXX`}
                    />
                  </div>
                </div>
              )}

              {selectedMethodData?.requiresEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email para receber comprovante
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu@email.com"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('amount'); setError(''); }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-md font-medium"
                >
                  Voltar
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading || !paymentMethod}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-md font-medium disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Pagar'}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Aguarde...</h4>
              <p className="text-sm text-gray-600 mb-4">
                Processando pagamento via {selectedMethodData?.name}
              </p>
              {selectedMethodData?.requiresPhone && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
                  <Smartphone className="inline w-5 h-5 mr-2" />
                  <div className="font-medium mb-2">Confirme no seu telefone</div>
                  <div className="text-xs">
                    1. Verifique a notificação no celular<br />
                    2. Insira seu PIN para confirmar<br />
                    3. Aguarde a confirmação
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'mercadopago' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-10 h-10 text-cyan-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Quase lá!</h4>
              <p className="text-sm text-gray-600 mb-4">
                Clique no botão abaixo para finalizar o pagamento no MercadoPago
              </p>
              <a
                href={mercadoPagoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-md font-medium mb-4"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Pagar com MercadoPago
              </a>
              <p className="text-xs text-gray-500">
                Após o pagamento, as coins serão creditadas automaticamente em até 5 minutos.
              </p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-gray-600 hover:text-gray-800"
              >
                Fechar e aguardar
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Pagamento confirmado!</h4>
              <p className="text-sm text-gray-600 mb-4">
                {getCoinsFromAmount(amount)} coins foram adicionados à sua conta
              </p>
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                <Coins className="inline w-4 h-4 mr-1" />
                Você já pode criar seus containers!
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Erro no pagamento</h4>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={() => { setStep('method'); setError(''); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-md font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
