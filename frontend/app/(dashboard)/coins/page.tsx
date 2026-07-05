"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Coins, 
  Smartphone, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  X,
  TrendingUp,
  Zap,
  Shield,
  History,
  RefreshCw
} from 'lucide-react';

interface Transaction {
  id: number;
  coins: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

interface Package {
  id: number;
  coins: number;
  price: number;
  name: string;
  popular: boolean;
}

const CoinsPurchase = () => {
  const [packages, setPackages] = useState([
    { id: 1, coins: 100, price: 50, name: '100 Coins', popular: false },
    { id: 2, coins: 250, price: 100, name: '250 Coins', popular: false },
    { id: 3, coins: 500, price: 200, name: '500 Coins', popular: true },
    { id: 4, coins: 1000, price: 350, name: '1000 Coins', popular: false },
    { id: 5, coins: 2500, price: 800, name: '2500 Coins', popular: false }
  ]);

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [phoneError, setPhoneError] = useState('');
  const [pollingPaymentId, setPollingPaymentId] = useState<number | null>(null);
  const [pollingStatus, setPollingStatus] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Simular carregamento de dados
    loadUserData();
    loadTransactions();
  }, []);

  const loadUserData = () => {
    // Simulação - em produção, buscar do backend
    const userData = localStorage.getItem('mozhost_user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentBalance(user.coins || 0);
    }
  };

  const loadTransactions = () => {
    // Simulação - em produção, buscar do backend /api/payment/history
    const mockTransactions = [
      {
        id: 1,
        coins: 500,
        amount: 200,
        payment_method: 'mpesa',
        status: 'completed',
        created_at: new Date().toISOString()
      }
    ];
    setTransactions(mockTransactions);
  };

  // Validar número em tempo real
  const handlePhoneChange = (value: string) => {
    // Remover espaços e caracteres não numéricos
    const cleanNumber = value.replace(/[^0-9]/g, '');
    setPhoneNumber(cleanNumber);

    // Validar formato
    if (cleanNumber.length === 0) {
      setPhoneError('');
      return;
    }

    if (cleanNumber.length < 9) {
      setPhoneError('Número deve ter 9 dígitos');
      return;
    }

    if (cleanNumber.length > 9) {
      setPhoneError('Número muito longo (máximo 9 dígitos)');
      return;
    }

    // Validar prefixo
    const prefix = cleanNumber.substring(0, 2);
    
    if (!['84', '85', '86', '87'].includes(prefix)) {
      setPhoneError('Número deve começar com 84, 85, 86 ou 87');
      return;
    }

    // Verificar compatibilidade com método escolhido
    if (paymentMethod === 'mpesa' && !['84', '85'].includes(prefix)) {
      setPhoneError('⚠️ MPesa aceita apenas 84/85. Escolha eMola ou mude o número.');
      return;
    }

    if (paymentMethod === 'emola' && !['86', '87'].includes(prefix)) {
      setPhoneError('⚠️ eMola aceita apenas 86/87. Escolha MPesa ou mude o número.');
      return;
    }

    setPhoneError('');
  };

  // Detectar método automático baseado no número
  const detectPaymentMethod = (phone: string) => {
    if (phone.length >= 2) {
      const prefix = phone.substring(0, 2);
      if (['84', '85'].includes(prefix)) {
        setPaymentMethod('mpesa');
      } else if (['86', '87'].includes(prefix)) {
        setPaymentMethod('emola');
      }
    }
  };

  // Limpa o polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startPolling = (paymentId: number) => {
    // Limpa qualquer polling anterior
    stopPolling();
    
    setPollingPaymentId(paymentId);
    setPollingStatus('Aguardando confirmação do pagamento...');

    // Poll a cada 5 segundos
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch('https://api.mozhost.shop/api/payment/poll-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId })
        });

        const data = await response.json();

        if (data.status === 'completed') {
          // Pagamento confirmado!
          stopPolling();
          setPollingPaymentId(null);
          setSuccess(`✅ Pagamento confirmado! ${data.coins || selectedPackage?.coins} coins adicionados.`);
          setCurrentBalance(prev => prev + (data.coins || selectedPackage?.coins || 0));
          
          // Atualizar localStorage
          const userData = JSON.parse(localStorage.getItem('mozhost_user') || '{}');
          userData.coins = (userData.coins || 0) + (data.coins || selectedPackage?.coins || 0);
          localStorage.setItem('mozhost_user', JSON.stringify(userData));
          
          loadTransactions();
        } else if (data.status === 'failed') {
          stopPolling();
          setPollingPaymentId(null);
          setError(data.message || 'Pagamento falhou. Tente novamente.');
        } else {
          setPollingStatus(data.message || 'Aguardando confirmação...');
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Continua tentando...
      }
    }, 5000);

    // Timeout após 3 minutos
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setPollingPaymentId(null);
      setError('Tempo limite excedido. Se o dinheiro foi debitado, contacte o suporte com o código de referência.');
    }, 180000);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      setError('Selecione um pacote de coins');
      return;
    }

    if (phoneNumber.length !== 9) {
      setError('Digite um número válido com 9 dígitos');
      return;
    }

    if (phoneError) {
      setError('Corrija o número de telefone antes de continuar');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setPollingPaymentId(null);

    try {
      const token = localStorage.getItem('mozhost_token');
      
      // Buscar userId do localStorage
      const userData = JSON.parse(localStorage.getItem('mozhost_user') || '{}');
      
      if (!userData.id) {
        setError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }
      
      const response = await fetch('https://api.mozhost.shop/api/payment/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userData.id,
          method: paymentMethod,
          coins: selectedPackage.coins,
          amount: selectedPackage.price,
          whatsappNumber: `258${phoneNumber}`,
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Pagamento criado — iniciar polling para verificar conclusão
        setShowModal(false);
        startPolling(data.id);
      } else {
        setError(data.error || data.message || 'Erro ao processar pagamento');
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const openPurchaseModal = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowModal(true);
    setError('');
    setSuccess('');
    setPhoneNumber('');
    setPhoneError('');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'completed': return 'Completo';
      case 'processing': return 'Processando';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">
                Comprar Coins
              </h1>
              <p className="text-gray-600">
                Adquira coins para criar e hospedar seus bots na MozHost
              </p>
            </div>
            <div className="mt-6 md:mt-0">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center space-x-3">
                  <Coins className="w-8 h-8" />
                  <div>
                    <p className="text-sm font-medium opacity-90">Saldo Atual</p>
                    <p className="text-3xl font-bold">{currentBalance}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {pollingPaymentId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start animate-pulse">
            <RefreshCw className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="text-blue-800 font-semibold">{pollingStatus}</p>
              <p className="text-blue-600 text-sm mt-1">
                Você receberá uma notificação no celular. Digite o PIN para confirmar.
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 flex-1">{success}</p>
            <button 
              onClick={() => setSuccess('')}
              className="text-green-400 hover:text-green-600 flex-shrink-0 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 flex-1">{error}</p>
            <button 
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 flex-shrink-0 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pacotes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Escolha seu Pacote</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 ${
                  pkg.popular ? 'border-blue-500' : 'border-gray-200 hover:border-blue-400'
                }`}
                onClick={() => openPurchaseModal(pkg)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                      POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    pkg.popular ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-blue-500 to-blue-700'
                  }`}>
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {pkg.coins}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">Coins</p>
                  
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {pkg.price} MT
                    </p>
                  </div>
                  
                  <button
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefícios */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Por que usar Coins?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Deploy Rápido</h3>
              <p className="text-sm text-gray-600">
                Use coins para criar containers e hospedar bots instantaneamente
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upgrade Flexível</h3>
              <p className="text-sm text-gray-600">
                Aumente RAM e storage dos seus containers quando precisar
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Pagamento Seguro</h3>
              <p className="text-sm text-gray-600">
                Transações protegidas via MPesa e eMola
              </p>
            </div>
          </div>
        </div>

        {/* Histórico */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex items-center mb-6">
              <History className="w-6 h-6 text-gray-700 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Histórico de Transações</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Coins</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Método</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(tx.created_at).toLocaleDateString('pt-MZ')}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {tx.coins} coins
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {tx.amount} MT
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="uppercase font-medium text-gray-700">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(tx.status)}`}>
                          {getStatusText(tx.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Pagamento */}
        {showModal && selectedPackage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Comprar {selectedPackage.coins} Coins
                </h2>
                <p className="text-3xl font-bold text-blue-600">
                  {selectedPackage.price} MT
                </p>
              </div>

              <div className="space-y-4">
                {/* Select de Método */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Método de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('mpesa')}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                        paymentMethod === 'mpesa'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Smartphone className="w-5 h-5" />
                      <span>MPesa</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('emola')}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                        paymentMethod === 'emola'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>eMola</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {paymentMethod === 'mpesa' ? '📱 MPesa aceita números 84 e 85' : '💳 eMola aceita números 86 e 87'}
                  </p>
                </div>

                {/* Input de Telefone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número de Telefone
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: 841234567"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    maxLength={9}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      phoneError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                  />
                  {phoneError && (
                    <p className="text-xs text-red-600 mt-1 flex items-start">
                      <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
                      {phoneError}
                    </p>
                  )}
                  {!phoneError && phoneNumber.length === 9 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Número válido
                    </p>
                  )}
                </div>

                {/* Info de Segurança */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-900 mb-1">
                        Pagamento Seguro
                      </p>
                      <p className="text-xs text-blue-700">
                        Você receberá uma notificação no celular para aprovar o pagamento
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botão de Compra */}
                <button
                  onClick={handlePurchase}
                  disabled={loading || phoneNumber.length !== 9 || Boolean(phoneError)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Confirmar Pagamento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinsPurchase;
