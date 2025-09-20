// components/LoginPage.js
'use client';

import { useState } from 'react';
import { Eye, EyeOff, Server, Zap, Shield, Globe } from 'lucide-react';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    username: '',
    email: '',
    password: '',
    acceptTerms: false,
    verifyCode: ''
  });
  const [showVerifyStep, setShowVerifyStep] = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    // Validações básicas
    if (!isLogin && formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !formData.email.includes('@')) {
      setError('Por favor, insira um e-mail válido');
      setIsLoading(false);
      return;
    }

    if (!isLogin && formData.username.length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !formData.acceptTerms) {
      setError('Você deve aceitar os Termos e Condições e a Política de Privacidade');
      setIsLoading(false);
      return;
    }
    
    try {
      const url = isLogin 
        ? 'https://api.mozhost.topaziocoin.online/api/auth/login' 
        : 'https://api.mozhost.topaziocoin.online/api/auth/register';
      
      const body = isLogin 
        ? { login: formData.login, password: formData.password }
        : { 
            username: formData.username, 
            email: formData.email, 
            password: formData.password 
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (response.ok) {
        // Salvar dados do usuário
        localStorage.setItem('mozhost_token', data.token);
        localStorage.setItem('mozhost_user', JSON.stringify(data.user));
        
        if (!isLogin && data.user && data.user.emailVerified === false) {
          setShowVerifyStep(true);
          setPendingToken(data.token);
          setSuccess('Enviamos um código de verificação para o seu e-mail.');
          return;
        }

        if (isLogin) {
          setSuccess(`Bem-vindo de volta, ${data.user.username}! 🎉`);
        } else {
          setSuccess(`Conta criada com sucesso! Bem-vindo à MozHost, ${data.user.username}! 🎉`);
        }

        // Redirecionar automaticamente após 1 segundo
        setTimeout(() => {
          window.location.hash = 'dashboard';
          window.location.reload(); // Força o reload para aplicar a autenticação
        }, 1000);
        
      } else {
        // Tratar diferentes tipos de erro
        if (response.status === 409) {
          setError('Este usuário ou e-mail já está cadastrado. Tente fazer login.');
        } else if (response.status === 401) {
          setError('Usuário ou senha incorretos. Verifique suas credenciais.');
        } else if (response.status === 403 && data.error === 'Email not verified') {
          setError('Email não verificado. Clique em “Reenviar código” ou insira o código enviado.');
          setShowVerifyStep(true);
        } else if (response.status === 400) {
          setError(data.details ? data.details.map(d => d.msg).join(', ') : data.message);
        } else {
          setError(data.message || data.error || 'Erro desconhecido');
        }
      }
    } catch (err) {
      setError('Erro de conexão. Verifique se o backend está rodando na porta 3001.');
      console.error('Erro de conexão:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('mozhost_token') || pendingToken;
      const resp = await fetch('https://api.mozhost.topaziocoin.online/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: formData.verifyCode.trim() })
      });
      const data = await resp.json();
      if (resp.ok) {
        const bonus = data.bonusGranted ? ` (+${350} coins)` : '';
        setSuccess(`Email verificado com sucesso${bonus}! Redirecionando...`);
        setTimeout(() => {
          window.location.hash = 'dashboard';
          window.location.reload();
        }, 800);
      } else {
        setError(data.error || 'Código inválido ou expirado');
      }
    } catch (e) {
      setError('Erro ao verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('mozhost_token') || pendingToken;
      const resp = await fetch('https://api.mozhost.topaziocoin.online/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        setSuccess('Novo código enviado para o seu e-mail');
      } else {
        const data = await resp.json();
        setError(data.error || 'Falha ao reenviar código');
      }
    } catch (e) {
      setError('Erro de conexão');
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setFormData({ login: '', username: '', email: '', password: '', acceptTerms: false });
  };

  const features = [
    { icon: Server, title: 'Containers Isolados', desc: 'Cada bot roda em ambiente próprio' },
    { icon: Zap, title: 'Deploy Instantâneo', desc: 'Seus bots online em segundos' },
    { icon: Shield, title: '100% Seguro', desc: 'Isolamento total entre usuários' },
    { icon: Globe, title: 'Sempre Online', desc: 'Uptime de 99.9% garantido' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-20"></div>
      
      <div className="relative z-10 flex min-h-screen">
        {/* Left Side - Features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-12">
          <div className="max-w-lg">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <Server className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">MozHost</h1>
                <p className="text-blue-200">Professional Bot Hosting</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Hospede seus bots<br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                com facilidade
              </span>
            </h2>
            
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              Plataforma profissional para hospedar bots de WhatsApp, APIs e aplicações Node.js/Python 
              com containers Docker isolados e interface intuitiva.
            </p>
            
            <div className="grid grid-cols-1 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{feature.title}</h3>
                    <p className="text-blue-200 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Estatísticas fake para impressionar */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-blue-200 text-sm">Bots Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-blue-200 text-sm">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-blue-200 text-sm">Suporte</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
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
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isLogin ? 'Fazer Login' : 'Criar Conta'}
                </h2>
                <p className="text-blue-200">
                  {isLogin 
                    ? 'Acesse sua conta MozHost' 
                    : 'Comece a hospedar seus bots hoje'
                  }
                </p>
              </div>

              {/* Mensagens de erro e sucesso */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <p className="text-green-200 text-sm">{success}</p>
                </div>
              )}

              {!showVerifyStep ? (
              <div className="space-y-6">
                {/* Campo Username (só no cadastro) */}
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      Nome de usuário *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                      placeholder="Escolha um nome de usuário"
                      required={!isLogin}
                    />
                    <p className="text-blue-300 text-xs mt-1">Mínimo 3 caracteres, sem espaços</p>
                  </div>
                )}

                {/* Campo Email (só no cadastro) */}
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                      placeholder="seu@email.com"
                      required={!isLogin}
                    />
                  </div>
                )}

                {/* Campo Login (só no login) */}
                {isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      Usuário ou E-mail *
                    </label>
                    <input
                      type="text"
                      name="login"
                      value={formData.login}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                      placeholder="Nome de usuário ou e-mail"
                      required={isLogin}
                    />
                  </div>
                )}

                {/* Campo Senha */}
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-2">
                    Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm pr-12"
                      placeholder={isLogin ? "Sua senha" : "Crie uma senha segura"}
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
                  {!isLogin && (
                    <p className="text-blue-300 text-xs mt-1">Mínimo 6 caracteres</p>
                  )}
                </div>

                {/* Aceite de Termos (só no cadastro) */}
                {!isLogin && (
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="acceptTerms"
                        name="acceptTerms"
                        type="checkbox"
                        checked={formData.acceptTerms}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="acceptTerms" className="text-blue-200">
                        Eu concordo com os{' '}
                        <button
                          type="button"
                          onClick={() => window.location.hash = 'terms'}
                          className="text-blue-300 hover:text-white underline"
                        >
                          Termos e Condições
                        </button>
                        {' '}e a{' '}
                        <button
                          type="button"
                          onClick={() => window.location.hash = 'privacy'}
                          className="text-blue-300 hover:text-white underline"
                        >
                          Política de Privacidade
                        </button>
                      </label>
                    </div>
                  </div>
                )}

                {/* Forgot password link (login only) */}
                {isLogin && (
                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      onClick={() => window.location.hash = 'reset'}
                      className="text-blue-300 hover:text-white text-sm underline"
                    >Esqueci minha senha</button>
                  </div>
                )}

                {/* Botão Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {isLogin ? 'Entrando...' : 'Criando conta...'}
                    </div>
                  ) : (
                    isLogin ? 'Entrar na MozHost' : 'Criar Conta Grátis'
                  )}
                </button>
              </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Código de Verificação</label>
                    <input
                      type="text"
                      name="verifyCode"
                      value={formData.verifyCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                      placeholder="Insira o código enviado ao seu e-mail"
                    />
                    <p className="text-blue-300 text-xs mt-1">Válido por 15 minutos.</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-blue-300 hover:text-white underline"
                    >Reenviar código</button>
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={isLoading || !formData.verifyCode.trim()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                    >Verificar</button>
                  </div>
                </div>
              )}

              {/* Toggle Login/Register */}
              <div className="mt-6 text-center">
                {!showVerifyStep && (
                <button
                  onClick={toggleMode}
                  className="text-blue-300 hover:text-white transition-colors"
                >
                  {isLogin 
                    ? 'Não tem conta? Criar uma nova conta'
                    : 'Já tem conta? Fazer login'
                  }
                </button>
                )}
              </div>

              

              {/* Legal Links */}
              <div className="mt-6 text-center text-xs text-blue-300 space-x-4">
                <button 
                  onClick={() => window.location.hash = 'terms'}
                  className="hover:text-white transition-colors underline"
                >
                  Termos e Condições
                </button>
                <span>•</span>
                <button 
                  onClick={() => window.location.hash = 'privacy'}
                  className="hover:text-white transition-colors underline"
                >
                  Política de Privacidade
                </button>
              </div>
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

export default LoginPage;
