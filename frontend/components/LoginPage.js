// components/LoginPage.js
'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Server, Zap, Shield, Globe, Mail, MessageCircle, MessageSquare } from 'lucide-react';
import CountrySelector from './CountrySelector';

const API_URL = 'https://api.mozhost.shop';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    username: '',
    email: '',
    password: '',
    acceptTerms: false,
    verifyCode: '',
    phone: '',
    countryCode: '+55',
    preferredVerificationMethod: 'email'
  });
  const [showVerifyStep, setShowVerifyStep] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [oauthUsername, setOauthUsername] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle OAuth callback
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    const handleToken = (token, needsProfile, provider) => {
      if (token) {
        localStorage.setItem('mozhost_token', token);
        if (needsProfile) {
          setPendingToken(token);
          setShowCompleteProfile(true);
          setSuccess(`Conectado com ${provider === 'google' ? 'Google' : 'GitHub'}! Escolha seu nome de usuário.`);
          window.location.hash = '';
        } else {
          // Profile already complete, go to dashboard
          fetch(`${API_URL}/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json()).then(data => {
            if (data.user) localStorage.setItem('mozhost_user', JSON.stringify(data.user));
            window.location.href = '/dashboard';
          }).catch(() => {
            window.location.href = '/dashboard';
          });
        }
      }
    };

    // Support both fragment-style callbacks and querystring callbacks
    if (search.includes('token=')) {
      const params = new URLSearchParams(search);
      const token = params.get('token');
      const needsProfile = params.get('needsProfile') === 'true';
      const provider = params.get('provider');
      handleToken(token, needsProfile, provider);
      // remove query params from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (hash.startsWith('#oauth-callback')) {
      const params = new URLSearchParams(hash.replace('#oauth-callback?', ''));
      const token = params.get('token');
      const needsProfile = params.get('needsProfile') === 'true';
      const provider = params.get('provider');
      handleToken(token, needsProfile, provider);
    }

    if (hash.includes('error=google_failed') || hash.includes('error=github_failed')) {
      setError('Falha na autenticação. Tente novamente.');
      window.location.href = '/login';
    }
  }, []);

  const handleCompleteProfile = async () => {
    if (!oauthUsername.trim() || oauthUsername.length < 3) {
      setError('Nome de usuário deve ter pelo menos 3 caracteres');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('mozhost_token') || pendingToken;
      const resp = await fetch(`${API_URL}/api/auth/complete-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: oauthUsername.trim() })
      });
      const data = await resp.json();
      if (resp.ok) {
        localStorage.setItem('mozhost_token', data.token);
        localStorage.setItem('mozhost_user', JSON.stringify(data.user));
        setSuccess('Perfil completo! Redirecionando... 🎉');
        setTimeout(() => {
          window.location.href = '/dashboard';
          
        }, 800);
      } else {
        setError(data.message || data.error || 'Erro ao completar perfil');
      }
    } catch (e) {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

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

    if (!isLogin && (formData.preferredVerificationMethod === 'whatsapp' || formData.preferredVerificationMethod === 'sms') && !formData.phone.trim()) {
      const method = formData.preferredVerificationMethod === 'whatsapp' ? 'WhatsApp' : 'SMS';
      setError(`Número de telefone é obrigatório quando escolher verificação via ${method}`);
      setIsLoading(false);
      return;
    }

    try {
      const url = isLogin 
        ? `${API_URL}/api/auth/login` 
        : `${API_URL}/api/auth/register`;

 	const body = isLogin
  ? { login: formData.login, password: formData.password }
  : (() => {
      // Cria objeto base (sempre envia)
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        preferredVerificationMethod: formData.preferredVerificationMethod
      };
      
      // Só adiciona phone/countryCode se for WhatsApp ou SMS
      if (formData.preferredVerificationMethod === 'whatsapp' || formData.preferredVerificationMethod === 'sms') {
        registerData.phone = formData.phone;
        registerData.countryCode = formData.countryCode;
      }
      
      return registerData;
    })();

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('mozhost_token', data.token);
        localStorage.setItem('mozhost_user', JSON.stringify(data.user));

        if (!isLogin && data.user) {
          const needsEmailVerification = data.user.emailVerified === false;
          const needsWhatsAppVerification = data.user.whatsappVerified === false;
          const needsSMSVerification = data.user.smsVerified === false;

          if (needsEmailVerification || needsWhatsAppVerification || needsSMSVerification) {
            setShowVerifyStep(true);
            setPendingToken(data.token);
            const method = data.user.preferredVerificationMethod || 'email';
            const destination = method === 'whatsapp' ? 'WhatsApp' : method === 'sms' ? 'SMS' : 'e-mail';
            setSuccess(`Enviamos um código de verificação para o seu ${destination}.`);
            return;
          }
        }

        if (isLogin) {
          setSuccess(`Bem-vindo de volta, ${data.user.username}! 🎉`);
        } else {
          setSuccess(`Conta criada com sucesso! Bem-vindo à MozHost, ${data.user.username}! 🎉`);
        }

        // ISSO VAI RESOLVER
setTimeout(() => {
  window.location.href = '/dashboard'; 
}, 1000);


      } else {
        if (response.status === 409) {
          setError('Este usuário ou e-mail já está cadastrado. Tente fazer login.');
        } else if (response.status === 401) {
          setError('Usuário ou senha incorretos. Verifique suas credenciais.');
        } else if (response.status === 403) {
          if (data.error === 'Account not verified') {
            setError(data.message || 'Conta não verificada. Clique em "Reenviar código" ou insira o código enviado.');
            setShowVerifyStep(true);
          } else {
            setError(data.message || 'Acesso negado');
          }
        } else if (response.status === 400) {
          setError(data.details ? data.details.map(d => d.msg).join(', ') : data.message);
        } else {
          setError(data.message || data.error || 'Erro desconhecido');
        }
      }
    } catch (err) {
      setError('Erro de conexão. Por favor tente novamente mais tarde.');
      console.error('Erro de conexão:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const handlePasskeyLogin = async () => {
  setIsLoading(true);
  setError('');
  setSuccess('');
  try {
    // 1. Buscar opções do servidor
    const optionsRes = await fetch(`${API_URL}/api/passkeys/login/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await optionsRes.json();

    // 2. Autenticar no dispositivo
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const credential = await startAuthentication({ optionsJSON: data.options });

    // 3. Verificar no servidor
    const verifyRes = await fetch(`${API_URL}/api/passkeys/login/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });

    const result = await verifyRes.json();

    if (verifyRes.ok) {
      localStorage.setItem('mozhost_token', result.token);
      localStorage.setItem('mozhost_user', JSON.stringify(result.user));
      setSuccess(`Bem-vindo, ${result.user.username}! 🎉`);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } else {
      setError(result.message || 'Falha na autenticação com passkey');
    }
  } catch (err) {
  setError(`${err.name}: ${err.message}`);
} finally {
    setIsLoading(false);
  }
};

  const handleVerify = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('mozhost_token') || pendingToken;
      const user = JSON.parse(localStorage.getItem('mozhost_user') || '{}');
      const method = user.preferredVerificationMethod || 'email';

      const endpoint = method === 'whatsapp' ? 'verify-whatsapp' : 
                       method === 'sms' ? 'verify-sms' : 
                       'verify-email';

      const resp = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: formData.verifyCode.trim() })
      });
      const data = await resp.json();
      if (resp.ok) {
        const bonus = data.bonusGranted ? ` (+350 coins)` : '';
        const methodName = method === 'whatsapp' ? 'WhatsApp' : method === 'sms' ? 'SMS' : 'Email';
        setSuccess(`${methodName} verificado com sucesso${bonus}! Redirecionando...`);
        setTimeout(() => {
          window.location.href = '/dashboard';
         // window.location.reload();
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
      const user = JSON.parse(localStorage.getItem('mozhost_user') || '{}');
      const method = user.preferredVerificationMethod || 'email';

      const resp = await fetch(`${API_URL}/api/auth/resend-code`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ method })
      });
      if (resp.ok) {
        const destination = method === 'whatsapp' ? 'WhatsApp' : method === 'sms' ? 'SMS' : 'e-mail';
        setSuccess(`Novo código enviado para o seu ${destination}`);
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
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleCountryChange = (country) => {
    setFormData({
      ...formData,
      countryCode: country.code
    });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setShowVerifyStep(false);
    setFormData({ 
      login: '', 
      username: '', 
      email: '', 
      password: '', 
      acceptTerms: false,
      verifyCode: '',
      phone: '',
      countryCode: '+55',
      preferredVerificationMethod: 'email'
    });
  };

  const features = [
    { icon: Server, title: 'Containers Isolados', desc: 'Cada bot roda em ambiente próprio' },
    { icon: Zap, title: 'Deploy Instantâneo', desc: 'Seus bots online em segundos' },
    { icon: Shield, title: '100% Seguro', desc: 'Isolamento total entre usuários' },
    { icon: Globe, title: 'Sempre Online', desc: 'Uptime de 99.9% garantido' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-20"></div>

      <div className="relative z-10 flex min-h-screen">
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

        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                <Server className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">MozHost</h1>
                <p className="text-blue-200">Professional Bot Hosting</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isLogin ? 'Fazer Login' : 'Criar Conta'}
                </h2>
                <p className="text-blue-200">
                  {isLogin ? 'Acesse sua conta MozHost' : 'Comece a hospedar seus bots hoje'}
                </p>
              </div>

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

              {showCompleteProfile ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Escolha seu nome de usuário *</label>
                    <input
                      type="text"
                      value={oauthUsername}
                      onChange={(e) => { setOauthUsername(e.target.value); setError(''); }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                      placeholder="Escolha um nome de usuário"
                    />
                    <p className="text-blue-300 text-xs mt-1">Mínimo 3 caracteres, letras, números, _ ou -</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCompleteProfile}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {isLoading ? 'Salvando...' : 'Continuar'}
                  </button>
                </div>
              ) : !showVerifyStep ? (
              <div className="space-y-6">
                {/* OAuth Buttons */}
                <div className="space-y-3">
                  <a
                    href={`${API_URL}/api/auth/google`}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
                  </a>
                  <a
                    href={`${API_URL}/api/auth/github`}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    {isLogin ? 'Entrar com GitHub' : 'Cadastrar com GitHub'}
                  </a>

		{isLogin && (
  <button
    type="button"
    onClick={handlePasskeyLogin}
    disabled={isLoading}
    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
  >
    <Shield className="w-5 h-5 text-purple-300" />
    Entrar com Passkey
  </button>
)}

                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-blue-300">ou</span>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Nome de usuário *</label>
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

                {!isLogin && (
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-blue-100 mb-3">
                      🔐 Como você quer receber o código de verificação? *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, preferredVerificationMethod: 'email'})}
                        className={`p-3 rounded-lg border transition-all ${
                          formData.preferredVerificationMethod === 'email' 
                            ? 'border-blue-500 bg-blue-500/20' 
                            : 'border-white/20 bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          <Mail className="w-5 h-5 text-blue-300" />
                        </div>
                        <div className="text-white text-xs font-medium">E-mail</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({...formData, preferredVerificationMethod: 'whatsapp'})}
                        className={`p-3 rounded-lg border transition-all ${
                          formData.preferredVerificationMethod === 'whatsapp' 
                            ? 'border-green-500 bg-green-500/20' 
                            : 'border-white/20 bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          <MessageCircle className="w-5 h-5 text-green-300" />
                        </div>
                        <div className="text-white text-xs font-medium">WhatsApp</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({...formData, preferredVerificationMethod: 'sms'})}
                        className={`p-3 rounded-lg border transition-all ${
                          formData.preferredVerificationMethod === 'sms' 
                            ? 'border-purple-500 bg-purple-500/20' 
                            : 'border-white/20 bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          <MessageSquare className="w-5 h-5 text-purple-300" />
                        </div>
                        <div className="text-white text-xs font-medium">SMS</div>
                      </button>
                    </div>
                  </div>
                )}

                {!isLogin && (formData.preferredVerificationMethod === 'whatsapp' || formData.preferredVerificationMethod === 'sms') && (
                  <div className={`space-y-4 p-4 border rounded-lg ${
                    formData.preferredVerificationMethod === 'whatsapp' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-purple-500/10 border-purple-500/30'
                  }`}>
                    <div>
                      <label className="block text-sm font-medium text-blue-100 mb-2">Código do País *</label>
                      <CountrySelector
                        selectedCountry={formData.countryCode}
                        onCountryChange={handleCountryChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-100 mb-2">Número de Telefone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-sm ${
                          formData.preferredVerificationMethod === 'whatsapp' ? 'focus:ring-green-500' : 'focus:ring-purple-500'
                        }`}
                        placeholder="Número do telefone (sem o código do país)"
                        required
                      />
                      <p className="text-blue-300 text-xs mt-1">
                        Exemplo: Para {formData.countryCode} 11 99999-9999, digite apenas: 11999999999
                      </p>
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">E-mail *</label>
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

                {isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Usuário ou E-mail *</label>
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

                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-2">Senha *</label>
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
                  {!isLogin && <p className="text-blue-300 text-xs mt-1">Mínimo 6 caracteres</p>}
                </div>

                {!isLogin && (
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="acceptTerms"
                        name="acceptTerms"
                        type="checkbox"
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData({...formData, acceptTerms: e.target.checked})}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="acceptTerms" className="text-blue-200">
                        Eu concordo com os{' '}
                        <button type="button" onClick={() => window.location.hash = 'terms'} className="text-blue-300 hover:text-white underline">
                          Termos e Condições
                        </button>
                        {' '}e a{' '}
                        <button type="button" onClick={() => window.location.hash = 'privacy'} className="text-blue-300 hover:text-white underline">
                          Política de Privacidade
                        </button>
                      </label>
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="text-right -mt-2">
                    <button type="button" onClick={() => window.location.hash = 'reset'} className="text-blue-300 hover:text-white text-sm underline">
                      Esqueci minha senha
                    </button>
                  </div>
                )}

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
                      placeholder={`Insira o código enviado ao seu ${
                        formData.preferredVerificationMethod === 'whatsapp' ? 'WhatsApp' : 
                        formData.preferredVerificationMethod === 'sms' ? 'SMS' : 'e-mail'
                      }`}
                    />
                    <p className="text-blue-300 text-xs mt-1">Válido por 15 minutos.</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-blue-300 hover:text-white underline text-sm"
                    >
                      Reenviar {formData.preferredVerificationMethod === 'whatsapp' ? 'WhatsApp' : formData.preferredVerificationMethod === 'sms' ? 'SMS' : 'E-mail'}
                    </button>
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={isLoading || !formData.verifyCode.trim()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                      Verificar
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                {!showVerifyStep && (
                  <button onClick={toggleMode} className="text-blue-300 hover:text-white transition-colors">
                    {isLogin ? 'Não tem conta? Criar uma nova conta' : 'Já tem conta? Fazer login'}
                  </button>
                )}
              </div>

              <div className="mt-6 text-center text-xs text-blue-300 space-x-4">
                <button onClick={() => window.location.hash = 'terms'} className="hover:text-white transition-colors underline">
                  Termos e Condições
                </button>
                <span>•</span>
                <button onClick={() => window.location.hash = 'privacy'} className="hover:text-white transition-colors underline">
                  Política de Privacidade
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 bg-black/20 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-blue-200">
            <div className="flex items-center space-x-6">
              <span>© 2025 Eliobros Tech</span>
              <a href="mailto:contact@mozhost.com" className="hover:text-white transition-colors">Contato</a>
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
