'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Server, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    // Verificar se há token na URL
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setStep('reset');
    }
  }, []);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!formData.email.includes('@')) {
      setError('Por favor, insira um e-mail válido');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em alguns minutos.');
        setFormData({ ...formData, email: '' });
      } else {
        setError(data.error || 'Erro ao processar solicitação');
      }
    } catch (err) {
      setError('Erro de conexão. Verifique se o backend está rodando.');
      console.error('Erro de conexão:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validações
    if (formData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('https://api.mozhost.topaziocoin.online/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: resetToken, 
          newPassword: formData.newPassword 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Senha redefinida com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          window.location.hash = '';
          window.location.reload();
        }, 2000);
      } else {
        setError(data.error || 'Token inválido ou expirado');
      }
    } catch (err) {
      setError('Erro de conexão. Verifique se o backend está rodando.');
      console.error('Erro de conexão:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Limpar erros quando usuário digita
    if (error) setError('');
    if (success) setSuccess('');
  };

  const goBack = () => {
    window.location.hash = '';
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-20"></div>
      
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
              <Server className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">MozHost</h1>
              <p className="text-blue-200">Professional Bot Hosting</p>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center mb-6">
              <button
                onClick={goBack}
                className="mr-4 p-2 text-blue-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {step === 'request' ? 'Esqueci minha senha' : 'Redefinir senha'}
                </h2>
                <p className="text-blue-200">
                  {step === 'request' 
                    ? 'Digite seu e-mail para receber o link de redefinição' 
                    : 'Digite sua nova senha'
                  }
                </p>
              </div>
            </div>

            {/* Mensagens de erro e sucesso */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center">
                <XCircle className="w-5 h-5 text-red-300 mr-3 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 text-green-300 mr-3 flex-shrink-0" />
                <p className="text-green-200 text-sm">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={step === 'request' ? handleRequestReset : handleResetPassword}>
              <div className="space-y-6">
                {step === 'request' ? (
                  /* Solicitar reset */
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      E-mail cadastrado *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                      placeholder="seu@email.com"
                      required
                    />
                    <p className="text-blue-300 text-xs mt-1">
                      Enviaremos um link seguro para redefinir sua senha
                    </p>
                  </div>
                ) : (
                  /* Redefinir senha */
                  <>
                    <div>
                      <label className="block text-sm font-medium text-blue-100 mb-2">
                        Nova senha *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm pr-12"
                          placeholder="Digite sua nova senha"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-blue-300 text-xs mt-1">Mínimo 6 caracteres</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-100 mb-2">
                        Confirmar nova senha *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm pr-12"
                          placeholder="Digite novamente sua nova senha"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Botão Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {step === 'request' ? 'Enviando...' : 'Redefinindo...'}
                    </div>
                  ) : (
                    step === 'request' ? 'Enviar link de redefinição' : 'Redefinir senha'
                  )}
                </button>
              </div>
            </form>

            {/* Links de navegação */}
            <div className="mt-6 text-center">
              <button
                onClick={goBack}
                className="text-blue-300 hover:text-white transition-colors text-sm"
              >
                Voltar para o login
              </button>
            </div>

            {/* Informações de segurança */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200 text-xs text-center">
                🔒 {step === 'request' 
                  ? 'O link de redefinição expira em 15 minutos por segurança'
                  : 'Sua nova senha será criptografada com segurança'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 bg-black/20 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-blue-200">
            <div className="flex items-center space-x-6">
              <span>© 2025 Eliobros Tech</span>
              <a href="mailto:contact@mozhost.com" className="hover:text-white transition-colors">
                Contato
              </a>
              <span>Maputo, Moçambique</span>
            </div>
            <div className="mt-4 sm:mt-0">
              <span>Versão 1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResetPasswordPage;