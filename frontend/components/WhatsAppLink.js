import React, { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, AlertCircle, X, Smartphone, Unlink } from 'lucide-react';

const WhatsAppLink = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkStatus, setLinkStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    checkLinkStatus();
  }, []);

  const checkLinkStatus = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      if (!token) return;

      const response = await fetch('https://api.mozhost.topaziocoin.online/api/whatsapp-link/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLinkStatus(data);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 11) {
      setError('Digite o código completo (ex: MOZH-AB12CD)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('mozhost_token');
      
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/whatsapp-link/verify-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code.toUpperCase() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('WhatsApp vinculado com sucesso! 🎉');
        setCode('');
        setTimeout(() => {
          checkLinkStatus();
        }, 1500);
      } else {
        setError(data.message || data.error || 'Código inválido ou expirado');
      }

    } catch (err) {
      console.error('Erro ao verificar código:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Tem certeza que deseja desvincular seu WhatsApp?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('mozhost_token');
      
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/whatsapp-link/unlink', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('WhatsApp desvinculado com sucesso!');
        setTimeout(() => {
          checkLinkStatus();
          setSuccess('');
        }, 1500);
      } else {
        setError(data.message || data.error || 'Erro ao desvincular');
      }

    } catch (err) {
      console.error('Erro ao desvincular:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vincular WhatsApp</h1>
              <p className="text-gray-600">Gerencie sua conta MozHost pelo WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Status da Vinculação */}
        {linkStatus && linkStatus.linked ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Vinculado!</h2>
              <p className="text-gray-600">Sua conta está conectada ao WhatsApp</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Smartphone className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">
                    Número: {linkStatus.whatsappNumber}
                  </p>
                  <p className="text-xs text-green-700">
                    Vinculado em: {new Date(linkStatus.linkedSince).toLocaleDateString('pt-MZ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">📱 Comandos Disponíveis:</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div><code className="bg-white px-2 py-1 rounded">!vincular</code> - Verificar vinculação</div>
                <div><code className="bg-white px-2 py-1 rounded">!saldo</code> - Ver seus coins</div>
                <div><code className="bg-white px-2 py-1 rounded">!pagamento</code> - Comprar coins</div>
                <div><code className="bg-white px-2 py-1 rounded">!containers</code> - Listar containers</div>
                <div><code className="bg-white px-2 py-1 rounded">!menu</code> - Ver todos os comandos</div>
              </div>
            </div>

            <button
              onClick={handleUnlink}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Unlink className="w-5 h-5 mr-2" />
              {loading ? 'Desvinculando...' : 'Desvincular WhatsApp'}
            </button>
          </div>
        ) : (
          <>
            {/* Instruções de Vinculação */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Como Vincular:</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Envie mensagem no WhatsApp</h3>
                    <p className="text-sm text-gray-600">
                      Envie <code className="bg-gray-100 px-2 py-1 rounded">!vincular</code> para o bot da MozHost
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Receba o código</h3>
                    <p className="text-sm text-gray-600">
                      O bot enviará um código único (ex: MOZH-AB12CD)
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Digite o código aqui</h3>
                    <p className="text-sm text-gray-600">
                      Cole o código que recebeu no campo abaixo
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Vinculação */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Digite seu Código</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código de Vinculação
                </label>
                <input
                  type="text"
                  placeholder="MOZH-AB12CD"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={11}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-center text-lg font-mono tracking-wider"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Digite o código exatamente como recebeu (11 caracteres)
                </p>
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={loading || !code || code.length !== 11}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Vincular Conta
                  </>
                )}
              </button>
            </div>

            {/* Benefícios */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mt-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Benefícios da Vinculação</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Compras Rápidas</h3>
                    <p className="text-sm text-gray-600">
                      Compre coins sem sair do WhatsApp
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Gerenciamento Fácil</h3>
                    <p className="text-sm text-gray-600">
                      Controle containers direto do celular
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Notificações</h3>
                    <p className="text-sm text-gray-600">
                      Receba alertas sobre seus bots
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <CheckCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Suporte Rápido</h3>
                    <p className="text-sm text-gray-600">
                      Tire dúvidas instantaneamente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppLink;
