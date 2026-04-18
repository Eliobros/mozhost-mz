import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import * as Notifications from 'expo-notifications';
import { api, setToken } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
const EXPO_PROJECT_ID = 'dd7504bb-7506-42d9-b140-85313fe17a07';

// Função para registar o token push
const registerPushToken = async (api: any) => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permissão de notificação negada');
      return;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    await api.post('/notifications/expo-token', { token: tokenData.data });
    console.log('✅ Push token registado com sucesso:', tokenData.data);
  } catch (e) {
    console.log('Erro ao registar push token:', e);
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, verifyCode, resendCode } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerifyStep, setShowVerifyStep] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState('email');

  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [oauthUsername, setOauthUsername] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [formData, setFormData] = useState({
    login: '',
    username: '',
    email: '',
    password: '',
    acceptTerms: false,
    verifyCode: '',
    phone: '',
    countryCode: '+258',
    preferredVerificationMethod: 'email',
  });

  const updateForm = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        if (!formData.login.trim() || !formData.password.trim()) {
          setError('Preencha todos os campos');
          return;
        }
        await login(formData.login, formData.password);

        // ✅ Registar push token após login bem sucedido
        await registerPushToken(api);

        setSuccess('Bem-vindo de volta! 🎉');
        setTimeout(() => router.replace('/(tabs)'), 500);
      } else {
        if (formData.password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          return;
        }
        if (!formData.email.includes('@')) {
          setError('Por favor, insira um e-mail válido');
          return;
        }
        if (formData.username.length < 3) {
          setError('O nome de usuário deve ter pelo menos 3 caracteres');
          return;
        }
        if (!formData.acceptTerms) {
          setError('Você deve aceitar os Termos e Condições');
          return;
        }
        if (
          (formData.preferredVerificationMethod === 'whatsapp' ||
            formData.preferredVerificationMethod === 'sms') &&
          !formData.phone.trim()
        ) {
          setError('Número de telefone é obrigatório');
          return;
        }

        const registerData: any = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          preferredVerificationMethod: formData.preferredVerificationMethod,
        };

        if (
          formData.preferredVerificationMethod === 'whatsapp' ||
          formData.preferredVerificationMethod === 'sms'
        ) {
          registerData.phone = formData.phone;
          registerData.countryCode = formData.countryCode;
        }

        const result = await register(registerData);
        if (result.needsVerification) {
          setShowVerifyStep(true);
          setVerificationMethod(result.method || 'email');
          const dest =
            result.method === 'whatsapp'
              ? 'WhatsApp'
              : result.method === 'sms'
              ? 'SMS'
              : 'e-mail';
          setSuccess(`Código de verificação enviado para o seu ${dest}`);
        } else {
          // ✅ Registar push token após registo bem sucedido
          await registerPushToken(api);

          setSuccess('Conta criada com sucesso! 🎉');
          setTimeout(() => router.replace('/(tabs)'), 500);
        }
      }
    } catch (err: any) {
      if (err.status === 409) {
        setError('Este usuário ou e-mail já está cadastrado');
      } else if (err.status === 401) {
        setError('Usuário ou senha incorretos');
      } else if (err.status === 403) {
        if (err.error === 'Account not verified') {
          setError(err.message || 'Conta não verificada');
          setShowVerifyStep(true);
          setVerificationMethod(err.preferredMethod || 'email');
        } else {
          setError(err.message || 'Acesso negado');
        }
      } else {
        setError(err.message || 'Erro de conexão. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!formData.verifyCode.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await verifyCode(formData.verifyCode.trim(), verificationMethod);
      const bonus = data.bonusGranted ? ' (+350 coins)' : '';

      // ✅ Registar push token após verificação bem sucedida
      await registerPushToken(api);

      setSuccess(`Verificado com sucesso${bonus}!  🎉`);
      setTimeout(() => router.replace('/(tabs)'), 800);
    } catch (err: any) {
      setError(err.error || 'Código inválido ou expirado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await resendCode(verificationMethod);
      const dest =
        verificationMethod === 'whatsapp'
          ? 'WhatsApp'
          : verificationMethod === 'sms'
          ? 'SMS'
          : 'e-mail';
      setSuccess(`Novo código enviado para o seu ${dest}`);
    } catch {
      setError('Erro ao reenviar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotMessage('Digite seu email'); setForgotSuccess(false); return; }
    setForgotLoading(true);
    setForgotMessage('');
    try {
      await fetch('https://api.mozhost.shop/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotSuccess(true);
      setForgotMessage('Se este email existir, um link de redefinição foi enviado.');
    } catch {
      setForgotSuccess(false);
      setForgotMessage('Erro ao enviar. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setError('');
    try {
      const redirectUri = Linking.createURL('oauth-callback');
      const oauthUrl = `https://api.mozhost.shop/api/auth/${provider}?mobile=true&redirect_uri=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token as string | undefined;

        if (token) {
          await handleOAuthToken(token, provider);
        } else {
          setError('Token não recebido. Tente novamente.');
        }
      } else if (result.type === 'cancel') {
        setError('Login cancelado.');
      }
    } catch (err) {
      setError('Erro ao abrir autenticação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthToken = async (token: string, provider: string) => {
    setIsLoading(true);
    setError('');
    try {
      await setToken(token);
      const data = await api.verifyToken();
      await AsyncStorage.setItem('mozhost_user', JSON.stringify(data.user));

      if (!data.user.profileCompleted) {
        setShowCompleteProfile(true);
        setSuccess(`Conectado com ${provider === 'google' ? 'Google' : 'GitHub'}! Escolha seu nome de usuário.`);
      } else {
        await registerPushToken(api);
        setSuccess('Login realizado com sucesso! 🎉');
        setTimeout(() => router.replace('/(tabs)'), 500);
      }
    } catch (err: any) {
      setError('Token inválido ou expirado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!oauthUsername.trim() || oauthUsername.length < 3) {
      setError('Nome de usuário deve ter pelo menos 3 caracteres');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/complete-profile', { username: oauthUsername.trim() });
      await setToken(data.token);
      await AsyncStorage.setItem('mozhost_user', JSON.stringify(data.user));
      await registerPushToken(api);
      setSuccess('Perfil completo! 🎉');
      setTimeout(() => router.replace('/(tabs)'), 500);
    } catch (err: any) {
      setError(err.message || err.error || 'Erro ao completar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setShowVerifyStep(false);
    setShowCompleteProfile(false);
    setFormData({
      login: '',
      username: '',
      email: '',
      password: '',
      acceptTerms: false,
      verifyCode: '',
      phone: '',
      countryCode: '+258',
      preferredVerificationMethod: 'email',
    });
  };

  const VerificationMethodButton = ({
    method,
    icon,
    label,
    color,
  }: {
    method: string;
    icon: string;
    label: string;
    color: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.methodBtn,
        formData.preferredVerificationMethod === method && {
          borderColor: color,
          backgroundColor: color + '20',
        },
      ]}
      onPress={() => updateForm('preferredVerificationMethod', method)}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.methodLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="server" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>MozHost</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta grátis'}
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {showCompleteProfile ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Escolha seu nome de usuário *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome de usuário"
                  placeholderTextColor={Colors.textMuted}
                  value={oauthUsername}
                  onChangeText={(v) => { setOauthUsername(v); setError(''); }}
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Mínimo 3 caracteres, letras, números, _ ou -</Text>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.disabledBtn]}
                onPress={handleCompleteProfile}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Continuar</Text>
                )}
              </TouchableOpacity>
            </>
          ) : !showVerifyStep ? (
            <>
              {/* OAuth Buttons */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#fff', marginBottom: 10 }]}
                onPress={() => handleOAuthLogin('google')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={{ color: '#333', fontSize: 15, fontWeight: '600' }}>
                    {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#24292e', marginBottom: 16 }]}
                onPress={() => handleOAuthLogin('github')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="logo-github" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {isLogin ? 'Entrar com GitHub' : 'Cadastrar com GitHub'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <Text style={{ color: '#93c5fd', paddingHorizontal: 12, fontSize: 13 }}>ou</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              </View>

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nome de Usuário *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome de usuário"
                    placeholderTextColor={Colors.textMuted}
                    value={formData.username}
                    onChangeText={(v) => updateForm('username', v)}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {!isLogin && (
                <>
                  <Text style={styles.label}>Método de Verificação</Text>
                  <View style={styles.methodRow}>
                    <VerificationMethodButton
                      method="email"
                      icon="mail"
                      label="E-mail"
                      color={Colors.primary}
                    />
                    <VerificationMethodButton
                      method="whatsapp"
                      icon="logo-whatsapp"
                      label="WhatsApp"
                      color="#22c55e"
                    />
                    <VerificationMethodButton
                      method="sms"
                      icon="chatbubble"
                      label="SMS"
                      color={Colors.secondary}
                    />
                  </View>
                </>
              )}

              {!isLogin &&
                (formData.preferredVerificationMethod === 'whatsapp' ||
                  formData.preferredVerificationMethod === 'sms') && (
                  <View style={styles.phoneSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Código do País</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.countryCode}
                        onChangeText={(v) => updateForm('countryCode', v)}
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Número de Telefone *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="84 999 9999"
                        placeholderTextColor={Colors.textMuted}
                        value={formData.phone}
                        onChangeText={(v) => updateForm('phone', v)}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                )}

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>E-mail *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    placeholderTextColor={Colors.textMuted}
                    value={formData.email}
                    onChangeText={(v) => updateForm('email', v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Usuário ou E-mail *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome de usuário ou e-mail"
                    placeholderTextColor={Colors.textMuted}
                    value={formData.login}
                    onChangeText={(v) => updateForm('login', v)}
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha *</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder={isLogin ? 'Sua senha' : 'Crie uma senha segura'}
                    placeholderTextColor={Colors.textMuted}
                    value={formData.password}
                    onChangeText={(v) => updateForm('password', v)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {!isLogin && (
                  <Text style={styles.hint}>Mínimo 6 caracteres</Text>
                )}
              </View>

              {!isLogin && (
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() =>
                    updateForm('acceptTerms', !formData.acceptTerms)
                  }>
                  <View
                    style={[
                      styles.checkbox,
                      formData.acceptTerms && styles.checkboxChecked,
                    ]}>
                    {formData.acceptTerms && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.termsText}>
                    Eu concordo com os Termos e Condições e a Política de
                    Privacidade
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {isLogin ? 'Entrar na MozHost' : 'Criar Conta Grátis'}
                  </Text>
                )}
              </TouchableOpacity>

              {isLogin && (
                <TouchableOpacity onPress={() => setShowForgotModal(true)} style={{ marginTop: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#93c5fd', fontSize: 14 }}>Esqueci minha senha</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código de Verificação</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Insira o código"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.verifyCode}
                  onChangeText={(v) => updateForm('verifyCode', v)}
                  keyboardType="number-pad"
                />
                <Text style={styles.hint}>Válido por 15 minutos</Text>
              </View>

              <View style={styles.verifyActions}>
                <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                  <Text style={styles.resendText}>Reenviar Código</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.verifyBtn,
                    (!formData.verifyCode.trim() || isLoading) &&
                      styles.disabledBtn,
                  ]}
                  onPress={handleVerify}
                  disabled={!formData.verifyCode.trim() || isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitText}>Verificar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {!showVerifyStep && (
            <TouchableOpacity style={styles.toggleBtn} onPress={toggleMode}>
              <Text style={styles.toggleText}>
                {isLogin
                  ? 'Não tem conta? Criar uma nova conta'
                  : 'Já tem conta? Fazer login'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.footer}>© 2025 Eliobros Tech • Maputo, Moçambique</Text>
      </ScrollView>

      <Modal visible={showForgotModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 24, width: '85%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>Recuperar Senha</Text>
            <TextInput
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, fontSize: 15, color: '#fff', marginBottom: 12 }}
              placeholder="Seu email"
              placeholderTextColor="#94a3b8"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {forgotMessage ? <Text style={{ color: forgotSuccess ? '#22c55e' : '#ef4444', marginBottom: 12, fontSize: 13 }}>{forgotMessage}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => { setShowForgotModal(false); setForgotMessage(''); }} style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword} disabled={forgotLoading} style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center' }}>
                {forgotLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gradient.start,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#93c5fd',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: Colors.success,
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bfdbfe',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  hint: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 4,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    marginTop: 6,
  },
  methodBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  phoneSection: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsText: {
    color: '#bfdbfe',
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  verifyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    color: '#93c5fd',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#93c5fd',
    fontSize: 14,
  },
  footer: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});

