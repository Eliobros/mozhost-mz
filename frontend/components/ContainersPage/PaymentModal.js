import React, { useState, useMemo } from 'react';
import { X, Coins, Smartphone, Loader, CheckCircle, AlertCircle, CreditCard, ExternalLink } from 'lucide-react';

const PaymentModal = ({ onClose, onSuccess }) => {
  const [paymentId, setPaymentId] = useState(null);
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const [mercadoPagoUrl, setMercadoPagoUrl] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop';
  const ALAUDA_API_URL = 'https://alauda-api.mozhost.shop';

  // Configuração de moedas
  const currencies = {
    MZN: {
      symbol: 'MT',
      name: 'Metical Moçambicano',
      coinsPerUnit: 10,
      minDeposit: 5,
      flag: '🇲🇿'
    },
    BRL: {
      symbol: 'R$',
      name: 'Real Brasileiro',
      coinsPerUnit: 100,
      minDeposit: 5,
      flag: '🇧🇷'
    }
  };

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

  // Usar useMemo pra evitar re-renderizações desnecessárias
  const selectedMethodData = useMemo(() => {
    return paymentMethods.find(m => m.id === paymentMethod);
  }, [paymentMethod]);

  const currentCurrency = useMemo(() => {
    return selectedMethodData?.currency || 'MZN';
  }, [selectedMethodData]);

  const currencyConfig = useMemo(() => {
    return currencies[currentCurrency];
  }, [currentCurrency]);

  // Pacotes dependem da moeda
  const packages = useMemo(() => {
    if (currentCurrency === 'BRL') {
      return [
        { amount: 5, coins: 500, popular: false },
        { amount: 10, coins: 1100, popular: true, bonus: '+100 bonus' },
        { amount: 20, coins: 2300, popular: false, bonus: '+300 bonus' },
        { amount: 50, coins: 6000, popular: false, bonus: '+1000 bonus' }
      ];
    } else {
      return [
        { amount: 50, coins: 500, popular: false },
        { amount: 100, coins: 1100, popular: true, bonus: '+100 bonus' },
        { amount: 200, coins: 2300, popular: false, bonus: '+300 bonus' },
        { amount: 500, coins: 6000, popular: false, bonus: '+1000 bonus' }
      ];
    }
  }, [currentCurrency]);

  // Calcula coins
  const getCoinsFromAmount = (value) => {
    const numValue = parseFloat(value);
    if (!numValue || isNaN(numValue)) return 0;

    const baseCoins = numValue * currencyConfig.coinsPerUnit;

    let bonus = 0;
    if (currentCurrency === 'MZN') {
      if (numValue >= 500) bonus = 1000;
      else if (numValue >= 200) bonus = 300;
      else if (numValue >= 100) bonus = 100;
    } else if (currentCurrency === 'BRL') {
      if (numValue >= 50) bonus = 1000;
      else if (numValue >= 20) bonus = 300;
      else if (numValue >= 10) bonus = 100;
    }

    return baseCoins + bonus;
  };

  // Valida valor
  const validateAmount = () => {
    const numAmount = parseFloat(amount);
    const minDeposit = currencyConfig.minDeposit;

    if (!amount || numAmount < minDeposit) {
      setError(`Valor mínimo: ${currencyConfig.symbol} ${minDeposit}`);
      return false;
    }
    return true;
  };

  const handlePackageSelect = (pkg) => {
    setAmount(pkg.amount.toString());
    setError('');
    setStep('method');
  };

  const handleCustomAmount = () => {
    if (!validateAmount()) return;
    setError('');
    setStep('method');
  };

  // Quando muda método de pagamento, reseta amount
  const handleMethodChange = (methodId) => {
    setPaymentMethod(methodId);
    setAmount('');
    setError('');
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

    if (selectedMethodData?.requiresPhone && !phoneNumber) {
      setError('Número de telefone é obrigatório');
      return;
    }

    if (selectedMethodData?.requiresPhone && !validatePhone(phoneNumber, paymentMethod)) {
      setError(`Número inválido para ${selectedMethodData.name}. Use: ${selectedMethodData.prefix.join(' ou ')}`);
      return;
    }

    if (selectedMethodData?.requiresEmail && !validateEmail(email)) {
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
        await handleMobilePayment(token, userData);
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
        amount: parseFloat(amount),
        currency: 'BRL',
        coins: getCoinsFromAmount(amount),
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

  const handleMobilePayment = async (token, userData) => {
  console.log('👤 userData:', JSON.stringify(userData)) // 
  // Se for M-Pesa usa API direta
  const url = paymentMethod === 'mpesa'
  ? `${ALAUDA_API_URL}/api/payment/mpesa/direct`  // ← ALAUDA + sem 's'
  : `${ALAUDA_API_URL}/api/payment/${paymentMethod}`

const headers = paymentMethod === 'mpesa'
  ? {
      'Authorization': `Bearer ${token}`,
      'X-API-Key': process.env.NEXT_PUBLIC_ALAUDA_API_KEY,
      'Content-Type': 'application/json'
    }
  : {
      'Authorization': `ApiKey ${process.env.NEXT_PUBLIC_ALAUDA_API_KEY}`,
      'Content-Type': 'application/json'
    }

const response = await fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    valor: amount,
    numero_celular: phoneNumber,
    usuario_id: userData.email || userData.username || userData.phone || userData.celular || String(userData.id)
  })
  })

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || data.error || 'Erro ao processar pagamento');
    }

    setPaymentResult(data);

    // ADICIONA AQUI:
const transactionRef = data.data?.payment?.transaction_reference;
if (transactionRef) {
  setPaymentId(transactionRef);
  console.log('💾 Transaction Ref salvo:', transactionRef);
}

    await fetch(`${API_URL}/api/payment/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
	 'X-API-Key': process.env.NEXT_PUBLIC_MOZHOST_API_KEY || 'sua_api_key_aqui' ,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        currency: 'MZN',
        coins: getCoinsFromAmount(amount),
        paymentMethod,
        phoneNumber,
        external_payment_id: data.data?.transaction_id || data.transaction_id,
        provider: 'paymoz'
      })
    });

    const ref = data.data?.payment?.transaction_reference;
setTimeout(() => checkPaymentStatus(ref), 3000);
  };

  const checkPaymentStatus = async (transactionRef) => {
  if (!transactionRef) {
    setError('Referência não encontrada');
    setStep('error');
    setLoading(false);
    return;
  }

  let attempts = 0;
  const maxAttempts = 36; // 3 minutos

  const interval = setInterval(async () => {
  attempts++;
  try {
    const res = await fetch(
      `${ALAUDA_API_URL}/api/payment/mpesa/check/${transactionRef}`,
      { headers: { 'X-API-Key': process.env.NEXT_PUBLIC_ALAUDA_API_KEY } }
    );

    // Se der 500, ignora e continua tentando
    if (!res.ok) {
      console.log(`[Poll #${attempts}] Erro temporário, continuando...`);
      return;
    }

    const json = await res.json();
    const code = json?.data?.output_ResponseCode;

    console.log(`[Poll #${attempts}] ResponseCode:`, code);

    if (json.data?.status === 'completed') {
      clearInterval(interval);
      setStep('success');
      setLoading(false);
      setTimeout(() => onSuccess(getCoinsFromAmount(amount)), 2000);
    } else if (['INS-1', 'INS-9', 'INS-10'].includes(code)) {
      clearInterval(interval);
      setError('Pagamento cancelado ou recusado.');
      setStep('error');
      setLoading(false);
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      setError('Tempo esgotado. Tenta novamente.');
      setStep('error');
      setLoading(false);
    }
  } catch (err) {
    console.log(`[Poll #${attempts}] Catch error, continuando...`);
  }
}, 5000);
};

  const downloadReceipt = async () => {
  try {
    const token = localStorage.getItem('mozhost_token');
    
    const response = await fetch(`${API_URL}/api/payment/receipt/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao baixar recibo');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo_mozhost_${paymentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Erro ao baixar recibo:', error);
    alert('Erro ao baixar recibo. Tente novamente.');
  }
};

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Comprar Coins</h3>
            {paymentMethod && (
              <p className="text-xs text-gray-500 mt-1">
                {currencyConfig.flag} Pagando em {currencyConfig.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* STEP 1: AMOUNT - Escolher método e valor */}
          {step === 'amount' && (
            <div className="space-y-4">
              {!paymentMethod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Coins className="w-5 h-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-900">
                        Primeiro, escolha como pagar
                      </h4>
                      <p className="mt-1 text-xs text-blue-700">
                        Os valores serão exibidos na moeda do método escolhido
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!paymentMethod && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Método de pagamento
                  </label>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => handleMethodChange(method.id)}
                        className="w-full p-3 border-2 border-gray-200 hover:border-gray-300 rounded-lg text-left flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{method.icon}</span>
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-xs text-gray-500">{method.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {currencies[method.currency].flag}
                          </div>
                          <div className="text-xs font-medium text-gray-700">
                            {currencies[method.currency].symbol}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Escolha um pacote
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {packages.map((pkg) => (
                        <button
                          key={pkg.amount}
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
                          <div className="text-2xl font-bold text-gray-900">
                            {currencyConfig.symbol} {pkg.amount}
                          </div>
                          <div className="text-xs text-gray-500">{currencyConfig.name}</div>
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
                      Valor (mín. {currencyConfig.symbol} {currencyConfig.minDeposit})
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {currencyConfig.symbol}
                      </span>
                      <input
                        type="number"
                        min={currencyConfig.minDeposit}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Ex: ${currencyConfig.minDeposit * 3}`}
                      />
                    </div>
                    {amount && parseFloat(amount) >= currencyConfig.minDeposit && (
                      <div className="mt-2 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded">
                        <p className="text-sm font-medium text-gray-900">
                          <Coins className="inline w-4 h-4 text-yellow-600 mr-1" />
                          Você receberá: <span className="text-lg font-bold text-yellow-600">
                            {getCoinsFromAmount(amount)} coins
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPaymentMethod('');
                        setAmount('');
                        setError('');
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-md font-medium"
                    >
                      Trocar Método
                    </button>
                    <button
                      onClick={handleCustomAmount}
                      disabled={!amount}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-md font-medium disabled:opacity-50"
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: METHOD - Pedir telefone ou email */}
          {step === 'method' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <div className="font-medium text-blue-900">Resumo:</div>
                <div className="text-blue-700 mt-1">
                  {currencyConfig.symbol} {amount} = <span className="font-bold">{getCoinsFromAmount(amount)} coins</span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {currencyConfig.flag} {currencyConfig.name}
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
                  <p className="mt-1 text-xs text-gray-500">
                    Exemplo: {selectedMethodData.prefix[0]}1234567
                  </p>
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
                  onClick={() => {
                    setStep('amount');
                    setError('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-md font-medium"
                >
                  Voltar
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-md font-medium disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Pagar'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING - Aguardando confirmação */}
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

          {/* STEP 4: MERCADOPAGO - Link externo */}
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

          {/* STEP 5: SUCCESS - Pagamento confirmado */}
          {step === 'success' && (
  <div className="text-center py-8">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <CheckCircle className="w-10 h-10 text-green-600" />
    </div>
    <h4 className="text-lg font-medium text-gray-900 mb-2">Pagamento confirmado!</h4>
    <p className="text-sm text-gray-600 mb-4">
      {getCoinsFromAmount(amount)} coins foram adicionados à sua conta
    </p>
    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800 mb-4">
      <Coins className="inline w-4 h-4 mr-1" />
      Você já pode criar seus containers!
    </div>
    
    {/* BOTÃO DE DOWNLOAD DO RECIBO */}
    {paymentId && (
      <button
        onClick={downloadReceipt}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Baixar Recibo (PDF)
      </button>
    )}
  </div>
)}

          {/* STEP 6: ERROR - Erro no pagamento */}
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
