import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
  color: string;
  prefix: string[];
  description: string;
  requiresPhone: boolean;
  requiresEmail: boolean;
  currency: 'MZN' | 'BRL';
};

type Package = {
  amount: number;
  coins: number;
  popular?: boolean;
  bonus?: string;
};

type HistoryItem = {
  id: number;
  coins: number;
  amount: number;
  method: string;
  status: string;
  created_at: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: 'phone-portrait',
    color: '#22c55e',
    prefix: ['84', '85'],
    description: 'Vodacom (Moçambique)',
    requiresPhone: true,
    requiresEmail: false,
    currency: 'MZN',
  },
  {
    id: 'emola',
    name: 'e-Mola',
    icon: 'wallet',
    color: '#3b82f6',
    prefix: ['86', '87'],
    description: 'Movitel (Moçambique)',
    requiresPhone: true,
    requiresEmail: false,
    currency: 'MZN',
  },
  {
    id: 'visa_mastercard',
    name: 'Visa/Mastercard',
    icon: 'card',
    color: '#6366f1',
    prefix: [],
    description: 'Cartão internacional (3D Secure)',
    requiresPhone: false,
    requiresEmail: true,
    currency: 'MZN',
  },
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    icon: 'cash',
    color: '#06b6d4',
    prefix: [],
    description: 'PIX, Cartão, Boleto (Brasil)',
    requiresPhone: false,
    requiresEmail: true,
    currency: 'BRL',
  },
];

const MZN_PACKAGES: Package[] = [
  { amount: 100, coins: 500 },
  { amount: 150, coins: 1100, popular: true, bonus: '+100 bónus' },
  { amount: 200, coins: 2300, bonus: '+300 bónus' },
  { amount: 500, coins: 6000, bonus: '+1000 bónus' },
];

const BRL_PACKAGES: Package[] = [
  { amount: 10, coins: 500 },
  { amount: 20, coins: 1100, popular: true, bonus: '+100 bónus' },
  { amount: 30, coins: 2300, bonus: '+300 bónus' },
  { amount: 60, coins: 6000, bonus: '+1000 bónus' },
];

const getCoinsFromAmount = (amount: number, currency: 'MZN' | 'BRL') => {
  const coinsPerUnit = currency === 'MZN' ? 10 : 100;
  const baseCoins = amount * coinsPerUnit;
  let bonus = 0;
  if (currency === 'MZN') {
    if (amount >= 500) bonus = 1000;
    else if (amount >= 200) bonus = 300;
    else if (amount >= 100) bonus = 100;
  } else {
    if (amount >= 50) bonus = 1000;
    else if (amount >= 20) bonus = 300;
    else if (amount >= 10) bonus = 100;
  }
  return baseCoins + bonus;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completo', color: Colors.success },
  processing: { label: 'Processando', color: Colors.warning },
  pending: { label: 'Pendente', color: Colors.info },
  failed: { label: 'Falhou', color: Colors.error },
};

export default function CoinsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [balance, setBalance] = useState(user?.coins || 0);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'method' | 'amount' | 'details' | 'processing' | 'checkout' | 'success' | 'error'>('method');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currency = method?.currency || 'MZN';
  const currencySymbol = currency === 'MZN' ? 'MT' : 'R$';
  const packages = currency === 'MZN' ? MZN_PACKAGES : BRL_PACKAGES;
  const minDeposit = 10;
  const finalAmount = pkg ? pkg.amount : parseFloat(customAmount) || 0;
  const finalCoins = pkg ? pkg.coins : getCoinsFromAmount(finalAmount, currency);

  const loadBalance = useCallback(async () => {
    try {
      const data = await api.get('/auth/verify');
      setBalance(data.user?.coins || 0);
    } catch {
      // ignore
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.get('/payment/history');
      setHistory(data.payments || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadHistory();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startPolling = (id: number) => {
    stopPolling();
    setStep('processing');

    intervalRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/payment/${id}/status`);
        if (data.status === 'completed') {
          stopPolling();
          setStep('success');
          setSuccessMsg(`✅ Pagamento confirmado! ${data.coins || finalCoins} coins adicionados à sua conta.`);
          setBalance((prev) => prev + (data.coins || finalCoins));
          refreshUser();
          loadHistory();
        } else if (['failed', 'expired', 'cancelled', 'rejected'].includes(data.status)) {
          stopPolling();
          setError('Pagamento não foi concluído. Tenta novamente.');
          setStep('error');
        }
      } catch {
        // continua tentando
      }
    }, 5000);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setError('Tempo limite excedido. Se o dinheiro foi debitado, contacte o suporte com o código de referência.');
      setStep('error');
    }, 180000);
  };

  const validatePhone = (value: string) => {
    const regex = /^(84|85|86|87)\d{7}$/;
    if (!regex.test(value)) return false;
    if (!method?.prefix?.length) return true;
    return method.prefix.includes(value.substring(0, 2));
  };

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const handleSelectMethod = (m: PaymentMethod) => {
    setMethod(m);
    setPkg(null);
    setCustomAmount('');
    setPhone('');
    setEmail('');
    setError('');
    setStep('amount');
  };

  const handleSelectPackage = (p: Package) => {
    setPkg(p);
    setCustomAmount('');
    setError('');
    setStep('details');
  };

  const handleCustomAmount = () => {
    if (!finalAmount || finalAmount < minDeposit) {
      setError(`Valor mínimo: ${currencySymbol} ${minDeposit}`);
      return;
    }
    setPkg(null);
    setError('');
    setStep('details');
  };

  const handlePayment = async () => {
    if (!method) return;

    if (method.requiresPhone && !validatePhone(phone)) {
      setError(
        method.prefix?.length
          ? `Número inválido. ${method.name} usa prefixo ${method.prefix.join(' ou ')}.`
          : 'Número inválido. Use 84, 85, 86 ou 87.'
      );
      return;
    }

    if (method.requiresEmail && !validateEmail(email)) {
      setError('Email inválido');
      return;
    }

    if (!finalAmount || !finalCoins) {
      setError('Escolha um pacote ou informe um valor');
      return;
    }

    if (!user?.id) {
      setError('Sessão expirada. Faça login novamente.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const data = await api.post('/payment/create', {
        userId: user.id,
        method: method.id,
        coins: finalCoins,
        amount: finalAmount,
        whatsappNumber: method.requiresPhone ? `258${phone}` : undefined,
        email: method.requiresEmail ? email : undefined,
      });

      if (data.success) {
        setPaymentId(data.id);

        if (data.paymentUrl) {
          // Cartão / MercadoPago: abrir checkout externo
          setCheckoutUrl(data.paymentUrl);
          setStep('checkout');
          setLoading(false);
        } else {
          // M-Pesa / eMola: aguardar confirmação no celular
          setInstructions(
            data.paymentDetails?.instructions || [
              'Aguarde a notificação no seu celular',
              'Digite seu PIN para confirmar',
              `Valor: ${currencySymbol} ${finalAmount}`,
            ]
          );
          startPolling(data.id);
          setLoading(false);
        }
      } else {
        setError(data.error || data.message || 'Erro ao processar pagamento');
      }
    } catch (err: any) {
      setError(err.message || err.error || 'Erro de conexão. Tente novamente.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = async () => {
    if (!checkoutUrl) return;
    try {
      await WebBrowser.openBrowserAsync(checkoutUrl);
      // Quando o navegador fechar, começa a verificar o status automaticamente
      if (paymentId) startPolling(paymentId);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link de pagamento');
    }
  };

  const reset = () => {
    stopPolling();
    setMethod(null);
    setPkg(null);
    setCustomAmount('');
    setPhone('');
    setEmail('');
    setError('');
    setSuccessMsg('');
    setPaymentId(null);
    setStep('method');
  };

  const getStatusInfo = (status: string) => STATUS_CONFIG[status] || { label: status, color: Colors.textMuted };

  const renderMethodStep = () => (
    <>
      <Text style={styles.sectionTitle}>Como quer pagar?</Text>
      <View style={styles.methodGrid}>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.methodCard}
            onPress={() => handleSelectMethod(m)}
            activeOpacity={0.7}>
            <View style={[styles.methodIcon, { backgroundColor: m.color + '15' }]}>
              <Ionicons name={m.icon as any} size={22} color={m.color} />
            </View>
            <Text style={styles.methodName}>{m.name}</Text>
            <Text style={styles.methodDesc} numberOfLines={1}>
              {m.description}
            </Text>
            <View style={styles.methodCurrencyPill}>
              <Text style={[styles.methodCurrencyText, { color: m.color }]}>
                {m.currency === 'MZN' ? '🇲🇿 MT' : '🇧🇷 R$'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color={Colors.primary} />
        <Text style={styles.infoBoxText}>
          Os valores aparecem na moeda do método escolhido. Após o pagamento, os coins são creditados automaticamente.
        </Text>
      </View>
    </>
  );

  const renderAmountStep = () => {
    if (!method) return null;
    return (
      <>
        <View style={styles.summaryRow}>
          <TouchableOpacity style={styles.backChip} onPress={() => setStep('method')}>
            <Ionicons name="arrow-back" size={16} color={Colors.textSecondary} />
            <Text style={styles.backChipText}>Método</Text>
          </TouchableOpacity>
          <View style={[styles.methodPill, { backgroundColor: method.color + '15' }]}>
            <Ionicons name={method.icon as any} size={14} color={method.color} />
            <Text style={[styles.methodPillText, { color: method.color }]}>{method.name}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Escolha um pacote</Text>
        <View style={styles.packageGrid}>
          {packages.map((p) => (
            <TouchableOpacity
              key={p.amount}
              style={[styles.packageCard, p.popular && styles.packageCardPopular]}
              onPress={() => handleSelectPackage(p)}
              activeOpacity={0.8}>
              {p.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>POPULAR</Text>
                </View>
              )}
              <Text style={styles.packageAmount}>
                {currencySymbol} {p.amount}
              </Text>
              <Text style={styles.packageCurrency}>{currency === 'MZN' ? 'Meticais' : 'Reais'}</Text>
              <View style={styles.packageCoinsRow}>
                <Ionicons name="wallet" size={14} color={Colors.coins} />
                <Text style={styles.packageCoins}>{p.coins} coins</Text>
              </View>
              {p.bonus && <Text style={styles.packageBonus}>{p.bonus}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou valor personalizado</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            Valor (mín. {currencySymbol} {minDeposit})
          </Text>
          <View style={styles.amountInputRow}>
            <View style={styles.currencyPrefix}>
              <Text style={styles.currencyPrefixText}>{currencySymbol}</Text>
            </View>
            <TextInput
              style={styles.amountInput}
              placeholder={`Ex: ${minDeposit * 3}`}
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={(v) => setCustomAmount(v.replace(/[^0-9.]/g, ''))}
            />
          </View>
          {customAmount && getCoinsFromAmount(parseFloat(customAmount) || 0, currency) > 0 && (
            <View style={styles.coinsPreview}>
              <Ionicons name="wallet" size={16} color={Colors.coins} />
              <Text style={styles.coinsPreviewText}>
                Você receberá:{' '}
                <Text style={styles.coinsPreviewStrong}>
                  {getCoinsFromAmount(parseFloat(customAmount) || 0, currency)} coins
                </Text>
              </Text>
            </View>
          )}
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, !customAmount && { opacity: 0.5 }]}
          onPress={handleCustomAmount}
          disabled={!customAmount}>
          <Text style={styles.primaryBtnText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </>
    );
  };

  const renderDetailsStep = () => {
    if (!method) return null;
    return (
      <>
        <View style={styles.summaryRow}>
          <TouchableOpacity style={styles.backChip} onPress={() => setStep('amount')}>
            <Ionicons name="arrow-back" size={16} color={Colors.textSecondary} />
            <Text style={styles.backChipText}>Pacotes</Text>
          </TouchableOpacity>
          <View style={[styles.methodPill, { backgroundColor: method.color + '15' }]}>
            <Ionicons name={method.icon as any} size={14} color={method.color} />
            <Text style={[styles.methodPillText, { color: method.color }]}>{method.name}</Text>
          </View>
        </View>

        <View style={styles.resumeCard}>
          <Text style={styles.resumeLabel}>Resumo do pedido</Text>
          <Text style={styles.resumeAmount}>
            {currencySymbol} {finalAmount} ={' '}
            <Text style={styles.resumeCoins}>{finalCoins} coins</Text>
          </Text>
          <Text style={styles.resumeCurrency}>
            {currency === 'MZN' ? '🇲🇿 Metical Moçambicano' : '🇧🇷 Real Brasileiro'}
          </Text>
        </View>

        {method.requiresPhone && (
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Número {method.name}</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+258</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder={`${method.prefix.join(' ou ')}XXXXXXX`}
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                maxLength={9}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
              />
            </View>
            <Text style={styles.fieldHint}>Exemplo: {method.prefix[0]}1234567</Text>
          </View>
        )}

        {method.requiresEmail && (
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email para receber comprovante</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        )}

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
          <Text style={styles.securityText}>
            Pagamento seguro. Você receberá uma notificação no celular para aprovar o pagamento.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          onPress={handlePayment}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Confirmar Pagamento</Text>
            </>
          )}
        </TouchableOpacity>
      </>
    );
  };

  const renderProcessingStep = () => (
    <View style={styles.centerStep}>
      <View style={styles.spinnerCircle}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Aguarde...</Text>
      <Text style={styles.stepSubtitle}>Processando pagamento via {method?.name}</Text>
      {method?.requiresPhone && (
        <View style={styles.pinBox}>
          <Ionicons name="phone-portrait" size={22} color={Colors.warning} />
          <Text style={styles.pinTitle}>Confirme no seu telefone</Text>
          {instructions.map((inst, i) => (
            <Text key={i} style={styles.pinStep}>
              {i + 1}. {inst}
            </Text>
          ))}
        </View>
      )}
      <Text style={styles.pollingHint}>Verificando o pagamento automaticamente...</Text>
    </View>
  );

  const renderCheckoutStep = () => (
    <View style={styles.centerStep}>
      <View style={[styles.stepIconCircle, { backgroundColor: '#cffafe' }]}>
        <Ionicons name="card" size={40} color="#06b6d4" />
      </View>
      <Text style={styles.stepTitle}>Quase lá!</Text>
      <Text style={styles.stepSubtitle}>
        Finalize o pagamento via {method?.name} no navegador que vai abrir.
      </Text>
      <TouchableOpacity style={styles.checkoutBtn} onPress={handleOpenCheckout}>
        <Ionicons name="open-outline" size={18} color="#fff" />
        <Text style={styles.checkoutBtnText}>Abrir Pagamento</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => {
          if (paymentId) startPolling(paymentId);
          else setStep('method');
        }}>
        <Text style={styles.secondaryBtnText}>Já paguei — Verificar status</Text>
      </TouchableOpacity>
      <Text style={styles.pollingHint}>
        Depois de pagar, volte aqui e toque em "Verificar status". As coins são creditadas automaticamente.
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.centerStep}>
      <View style={[styles.stepIconCircle, { backgroundColor: '#dcfce7' }]}>
        <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
      </View>
      <Text style={styles.stepTitle}>Pagamento confirmado!</Text>
      <Text style={styles.stepSubtitle}>{successMsg || 'Coins adicionados à sua conta.'}</Text>
      <View style={styles.successCard}>
        <Ionicons name="wallet" size={18} color={Colors.coins} />
        <Text style={styles.successCardText}>Você já pode criar e renovar seus containers!</Text>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={reset}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Comprar mais coins</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/containers')}>
        <Text style={styles.secondaryBtnText}>Ir para Containers</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.centerStep}>
      <View style={[styles.stepIconCircle, { backgroundColor: '#fee2e2' }]}>
        <Ionicons name="close-circle" size={44} color={Colors.error} />
      </View>
      <Text style={styles.stepTitle}>Erro no pagamento</Text>
      <Text style={styles.stepSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('method')}>
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Tentar Novamente</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
        <Text style={styles.secondaryBtnText}>Voltar ao início</Text>
      </TouchableOpacity>
    </View>
  );

  const isProcessing = step === 'processing' || step === 'checkout' || step === 'success' || step === 'error';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceLeft}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={26} color="#fff" />
          </View>
          <View>
            <Text style={styles.balanceLabel}>Saldo de Coins</Text>
            <Text style={styles.balanceAmount}>{balance}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => { loadBalance(); refreshUser(); }}>
          <Ionicons name="refresh" size={20} color="#fde68a" />
        </TouchableOpacity>
      </View>

      {successMsg && step !== 'success' ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.successBannerText}>{successMsg}</Text>
        </View>
      ) : null}

      {/* Flow */}
      {step === 'method' && renderMethodStep()}
      {step === 'amount' && renderAmountStep()}
      {step === 'details' && renderDetailsStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'checkout' && renderCheckoutStep()}
      {step === 'success' && renderSuccessStep()}
      {step === 'error' && renderErrorStep()}

      {/* History */}
      {!isProcessing && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Histórico de Transações</Text>
            <TouchableOpacity onPress={loadHistory}>
              <Ionicons name="refresh" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loadingHistory ? (
            <View style={styles.historyEmpty}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.historyEmptyText}>Nenhuma compra ainda</Text>
            </View>
          ) : (
            history.slice(0, 10).map((item) => {
              const info = getStatusInfo(item.status);
              return (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="wallet" size={16} color={Colors.coins} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyCoins}>+{item.coins} coins</Text>
                    <Text style={styles.historyMeta}>
                      {new Date(item.created_at).toLocaleDateString('pt-MZ')} · {item.method?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>
                      {item.amount} {item.method === 'mercadopago' ? 'R$' : 'MT'}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: info.color + '15' }]}>
                      <Text style={[styles.statusPillText, { color: info.color }]}>{info.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const ErrorBanner = ({ message }: { message: string }) => (
  <View style={styles.errorBanner}>
    <Ionicons name="alert-circle" size={18} color={Colors.error} />
    <Text style={styles.errorBannerText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gradient.start,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  balanceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 13, color: '#93c5fd', fontWeight: '600' },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  methodName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  methodDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  methodCurrencyPill: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: Colors.surfaceVariant, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  methodCurrencyText: { fontSize: 11, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  infoBoxText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: Colors.surfaceVariant, borderRadius: 8 },
  backChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  methodPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  methodPillText: { fontSize: 12, fontWeight: '700' },
  packageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  packageCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  packageCardPopular: { borderColor: Colors.primary, backgroundColor: '#eff6ff' },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  packageAmount: { fontSize: 22, fontWeight: '800', color: Colors.text },
  packageCurrency: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  packageCoinsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  packageCoins: { fontSize: 13, fontWeight: '700', color: Colors.text },
  packageBonus: { fontSize: 11, color: Colors.success, fontWeight: '700', marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textMuted },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  amountInputRow: { flexDirection: 'row' },
  currencyPrefix: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: Colors.border,
  },
  currencyPrefixText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  phoneRow: { flexDirection: 'row' },
  phonePrefix: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: Colors.border,
  },
  phonePrefixText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  fieldHint: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  coinsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
  },
  coinsPreviewText: { flex: 1, fontSize: 13, color: Colors.text },
  coinsPreviewStrong: { fontWeight: '800', color: Colors.coins },
  resumeCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resumeLabel: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  resumeAmount: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 6 },
  resumeCoins: { color: Colors.coins },
  resumeCurrency: { fontSize: 12, color: '#1e40af', marginTop: 4 },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  securityText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  centerStep: { alignItems: 'center', paddingVertical: 24 },
  spinnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  stepSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },
  pinBox: {
    width: '100%',
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  pinTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginTop: 6, marginBottom: 8 },
  pinStep: { fontSize: 12, color: '#78350f', alignSelf: 'flex-start', marginVertical: 2 },
  pollingHint: { fontSize: 12, color: Colors.textMuted, marginTop: 16, textAlign: 'center' },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    justifyContent: 'center',
    marginTop: 16,
  },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginTop: 16,
  },
  successCardText: { flex: 1, fontSize: 13, color: '#166534', fontWeight: '600' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: { flex: 1, fontSize: 13, color: '#166534', fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#991b1b', fontWeight: '600' },
  historySection: { marginTop: 24 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyEmpty: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    gap: 8,
  },
  historyEmptyText: { fontSize: 13, color: Colors.textMuted },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCoins: { fontSize: 14, fontWeight: '700', color: Colors.text },
  historyMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 13, fontWeight: '600', color: Colors.text },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
});
