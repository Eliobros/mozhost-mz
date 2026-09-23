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
  Linking,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api, getToken, API_BASE_URL } from '@/services/api';
import { Colors } from '@/constants/Colors';

type Plan = {
  id: string;
  name: string;
  price_mt: number;
  price_brl: number;
  period: string;
  max_containers: number;
  max_ram_mb: number;
  max_storage_mb: number;
  features: string[];
  popular?: boolean;
};

type ActiveSubscription = {
  id: number;
  plan_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference_code: string;
  activated_at: string | null;
  expires_at: string | null;
};

type BillingItem = {
  id: number;
  plan_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference_code: string;
  created_at: string;
};

const PLAN_ICONS: Record<string, string> = {
  starter: 'flash',
  basic: 'star',
  pro: 'rocket',
  business: 'business',
};

const PLAN_COLORS: Record<string, string> = {
  starter: '#3b82f6',
  basic: '#8b5cf6',
  pro: '#f97316',
  business: '#eab308',
};

const METHODS = [
  { id: 'mpesa', name: 'M-Pesa', icon: 'phone-portrait', color: '#22c55e', prefix: ['84', '85'] },
  { id: 'emola', name: 'e-Mola', icon: 'wallet', color: '#3b82f6', prefix: ['86', '87'] },
  { id: 'visa_mastercard', name: 'Cartão', icon: 'card', color: '#6366f1', prefix: [] as string[] },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: Colors.success },
  scheduled: { label: 'Agendado', color: Colors.info },
  expired: { label: 'Expirado', color: Colors.textMuted },
  failed: { label: 'Falhou', color: Colors.error },
  cancelled: { label: 'Cancelado', color: Colors.textMuted },
  pending: { label: 'Pendente', color: Colors.warning },
  processing: { label: 'Processando', color: Colors.info },
};

export default function PlansScreen() {
  const router = useRouter();
  const { refreshUser, refreshAccountStatus, accountStatus } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<BillingItem[]>([]);

  // Checkout
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [method, setMethod] = useState<typeof METHODS[number] | null>(null);
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [waitingConfirm, setWaitingConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Recibo
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSubscription: ActiveSubscription | null = current?.active_subscription || null;
  const subscriptionExpired =
    !!current?.suspended ||
    (!!activeSubscription && !!activeSubscription.expires_at &&
      new Date(activeSubscription.expires_at) <= new Date());
  const renewPlanId = activeSubscription?.plan_id || current?.plan || 'basic';
  const renewPlan = plans.find((p) => p.id === renewPlanId) || null;

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

  const loadData = useCallback(async () => {
    try {
      const [plansData, currentData, historyData] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/current'),
        api.get('/billing/history'),
      ]);
      setPlans(plansData.plans || []);
      setCurrent(currentData.current || null);
      setHistory(historyData.billings || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => stopPolling();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ===== Checkout =====
  const openCheckout = (plan: Plan) => {
    setSelectedPlan(plan);
    setMethod(null);
    setPhone('');
    setError('');
    setSuccessMsg('');
    setCheckoutUrl('');
    setReferenceCode('');
    setInstructions([]);
    setWaitingConfirm(false);
  };

  const closeCheckout = () => {
    if (paying || waitingConfirm) return;
    setSelectedPlan(null);
    stopPolling();
  };

  const validatePhone = () => {
    if (!method?.prefix?.length) return true;
    const regex = /^\d{9}$/;
    if (!regex.test(phone)) return false;
    return method.prefix.includes(phone.substring(0, 2));
  };

  const startPolling = (billingId: number) => {
    stopPolling();
    setWaitingConfirm(true);

    intervalRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/billing/${billingId}/status`);
        if (data.billing?.status === 'active') {
          stopPolling();
          setWaitingConfirm(false);
          setSuccessMsg(`Plano ${selectedPlan?.name || ''} ativado com sucesso! 🎉`);
          setSelectedPlan(null);
          await loadData();
          refreshUser();
          refreshAccountStatus();
        } else if (['failed', 'cancelled', 'expired', 'rejected'].includes(data.billing?.status)) {
          stopPolling();
          setWaitingConfirm(false);
          setError('Pagamento não foi concluído. Tenta novamente.');
        }
      } catch {
        // continua tentando
      }
    }, 5000);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setWaitingConfirm(false);
      setError(
        'Tempo limite excedido. Se o valor foi debitado, o plano é ativado automaticamente quando o pagamento confirmar — ou contacta o suporte.'
      );
    }, 600000);
  };

  const handlePay = async () => {
    if (!selectedPlan || !method) return;

    if (method.prefix.length && !validatePhone()) {
      setError(
        `Número inválido. ${method.name} usa prefixo ${method.prefix.join(' ou ')} (9 dígitos).`
      );
      return;
    }

    setPaying(true);
    setError('');

    try {
      const data = await api.post('/billing/subscribe', {
        planId: selectedPlan.id,
        method: method.id,
        phone: method.prefix.length ? `258${phone}` : undefined,
      });

      if (!data.success) {
        throw new Error(data.message || data.error || 'Erro ao iniciar pagamento');
      }

      setReferenceCode(data.reference_code || '');
      setInstructions(data.payment_details?.instructions || []);

      if (data.payment_url) {
        // Cartão (ZumboPay): abre checkout externo
        setCheckoutUrl(data.payment_url);
        setPaying(false);
        startPolling(data.billing_id);
      } else {
        // M-Pesa / e-Mola: push no celular
        setPaying(false);
        startPolling(data.billing_id);
      }
    } catch (err: any) {
      setError(err.message || err.error || err.detail || 'Erro de conexão. Tente novamente.');
      setPaying(false);
    }
  };

  const handleOpenCheckoutUrl = async () => {
    if (!checkoutUrl) return;
    try {
      await WebBrowser.openBrowserAsync(checkoutUrl);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link de pagamento');
    }
  };

  const resetFlow = () => {
    stopPolling();
    setSelectedPlan(null);
    setMethod(null);
    setPhone('');
    setError('');
    setSuccessMsg('');
    setCheckoutUrl('');
    setInstructions([]);
    setWaitingConfirm(false);
    loadData();
  };

  // ===== Recibo PDF (download + abrir/partilhar) =====
  const handleDownloadReceipt = async (billingId: number) => {
    setDownloadingReceiptId(billingId);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const fileUri = `${FileSystem.documentDirectory}recibo_plano_mozhost_${billingId}.pdf`;
      const { uri, status } = await FileSystem.downloadAsync(
        `${API_BASE_URL}/billing/receipt/${billingId}`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (status !== 200) throw new Error('Erro ao baixar recibo');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Recibo do Plano — MozHost',
          UTI: 'com.adobe.pdf',
        });
      } else {
        await WebBrowser.openBrowserAsync(uri);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || err.error || 'Erro ao baixar recibo');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const getStatusInfo = (status: string) => STATUS_CONFIG[status] || { label: status, color: Colors.textMuted };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const planName = (id: string) => plans.find((p) => p.id === id)?.name || id;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* ===== Plano atual ===== */}
      <View style={styles.currentCard}>
        <View style={styles.currentHeader}>
          <View>
            <Text style={styles.currentLabel}>Plano atual</Text>
            <Text style={styles.currentPlan}>{planName(current?.plan || 'free')}</Text>
          </View>
          {activeSubscription && !subscriptionExpired && (
            <View style={styles.expiresBox}>
              <Text style={styles.expiresLabel}>Expira</Text>
              <Text style={styles.expiresValue}>
                {activeSubscription.expires_at
                  ? new Date(activeSubscription.expires_at).toLocaleDateString('pt-BR')
                  : '—'}
              </Text>
            </View>
          )}
        </View>

        {/* Renovar Plano — assinatura vencida */}
        {subscriptionExpired && renewPlan && (
          <View style={styles.renewBox}>
            <View style={styles.renewInfo}>
              <Ionicons name="alert-circle" size={20} color="#fff" />
              <Text style={styles.renewText}>
                Seu plano {renewPlan.name} venceu. Renove para reativar seus containers!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.renewBtn}
              onPress={() => openCheckout(renewPlan)}
              activeOpacity={0.85}>
              <Ionicons name="refresh" size={16} color={Colors.error} />
              <Text style={styles.renewBtnText}>Renovar Plano</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Renovar antecipado — plano ativo */}
        {!subscriptionExpired && renewPlan && activeSubscription && (
          <TouchableOpacity style={styles.renewEarlyBtn} onPress={() => openCheckout(renewPlan)}>
            <Ionicons name="refresh" size={16} color={Colors.primary} />
            <Text style={styles.renewEarlyText}>Renovar plano antecipadamente</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ===== Aviso de vencimento (de containers) ===== */}
      {accountStatus?.suspended && (
        <View style={styles.suspendedBanner}>
          <Ionicons name="ban" size={18} color="#fff" />
          <Text style={styles.suspendedBannerText}>
            Conta suspensa — renove o plano para reativar seus containers.
          </Text>
        </View>
      )}

      {/* ===== Lista de planos ===== */}
      <Text style={styles.sectionTitle}>Escolha seu plano</Text>
      <Text style={styles.sectionSubtitle}>M-Pesa · e-Mola · Cartão Visa/Mastercard</Text>

      <View style={styles.plansGrid}>
        {plans.map((plan) => {
          const isCurrent = current?.plan === plan.id && !!activeSubscription && !subscriptionExpired;
          const color = PLAN_COLORS[plan.id] || Colors.primary;
          return (
            <View key={plan.id} style={[styles.planCard, isCurrent && styles.planCardCurrent]}>
              {!!plan.popular && !isCurrent && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>POPULAR</Text>
                </View>
              )}
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#fff" />
                  <Text style={styles.currentBadgeText}>PLANO ATUAL</Text>
                </View>
              )}

              <View style={[styles.planIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={(PLAN_ICONS[plan.id] || 'flash') as any} size={24} color={color} />
              </View>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{plan.price_mt}</Text>
                <Text style={styles.planPeriod}> MT/mês</Text>
              </View>
              <Text style={styles.planBrl}>≈ R$ {plan.price_brl}/mês</Text>

              <View style={styles.planFeatures}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={14} color={Colors.success} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.planBtn, isCurrent && styles.planBtnCurrent]}
                onPress={() => openCheckout(plan)}
                disabled={isCurrent}
                activeOpacity={0.85}>
                <Text style={[styles.planBtnText, isCurrent && styles.planBtnTextCurrent]}>
                  {isCurrent ? 'Plano Atual' : subscriptionExpired ? 'Renovar Plano' : 'Assinar Agora'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* ===== Histórico de pagamentos + recibos ===== */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Histórico de Pagamentos</Text>
          <TouchableOpacity onPress={loadData}>
            <Ionicons name="refresh" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {history.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.historyEmptyText}>Nenhum pagamento realizado</Text>
          </View>
        ) : (
          history.slice(0, 20).map((b) => {
            const info = getStatusInfo(b.status);
            const canReceipt = ['active', 'scheduled', 'expired'].includes(b.status);
            return (
              <View key={b.id} style={styles.historyItem}>
                <View style={[styles.historyIcon, { backgroundColor: info.color + '15' }]}>
                  <Ionicons name="server" size={16} color={info.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyPlan}>Plano {planName(b.plan_id)}</Text>
                  <Text style={styles.historyMeta}>
                    {new Date(b.created_at).toLocaleDateString('pt-BR')} · {b.method?.toUpperCase()} · Ref: {b.reference_code}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>
                    {b.currency === 'BRL' ? 'R$' : 'MT'} {parseFloat(String(b.amount)).toFixed(0)}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: info.color + '15' }]}>
                    <Text style={[styles.statusPillText, { color: info.color }]}>{info.label}</Text>
                  </View>
                  {canReceipt && (
                    <TouchableOpacity
                      style={styles.receiptBtn}
                      onPress={() => handleDownloadReceipt(b.id)}
                      disabled={downloadingReceiptId === b.id}>
                      {downloadingReceiptId === b.id ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="download" size={13} color={Colors.primary} />
                          <Text style={styles.receiptBtnText}>Recibo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 32 }} />

      {/* ===== MODAL DE CHECKOUT ===== */}
      <Modal visible={!!selectedPlan} transparent animationType="slide" onRequestClose={closeCheckout}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeCheckout} disabled={paying || waitingConfirm}>
                <Ionicons
                  name={waitingConfirm ? 'arrow-back' : 'close'}
                  size={24}
                  color={Colors.text}
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {checkoutUrl ? 'Pagamento com Cartão' : 'Assinar Plano'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Resumo do plano */}
              <View style={styles.planSummary}>
                <View>
                  <Text style={styles.planSummaryLabel}>Plano selecionado</Text>
                  <Text style={styles.planSummaryName}>{selectedPlan?.name}</Text>
                  <Text style={styles.planSummarySub}>Mensal · Renova a cada 30 dias</Text>
                </View>
                <Text style={styles.planSummaryPrice}>{selectedPlan?.price_mt} MT</Text>
              </View>

              {/* Sucesso */}
              {successMsg ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
                  <Text style={styles.successTitle}>Pagamento confirmado!</Text>
                  <Text style={styles.successText}>{successMsg}</Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={resetFlow}>
                    <Text style={styles.primaryBtnText}>Voltar aos planos</Text>
                  </TouchableOpacity>
                </View>
              ) : waitingConfirm ? (
                /* Aguardando confirmação */
                <View style={styles.waitingBox}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.waitingTitle}>Aguardando confirmação...</Text>

                  {checkoutUrl ? (
                    <>
                      <Text style={styles.waitingText}>
                        Finalize o pagamento no navegador. Depois de pagar, o plano é ativado automaticamente.
                      </Text>
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenCheckoutUrl}>
                        <Ionicons name="open-outline" size={16} color="#fff" />
                        <Text style={styles.primaryBtnText}>Abrir Pagamento</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {instructions.map((inst, i) => (
                        <Text key={i} style={styles.instructionText}>
                          {i + 1}. {inst}
                        </Text>
                      ))}
                      <Text style={styles.waitingText}>
                        Confirme o pagamento no seu celular. Verificamos automaticamente.
                      </Text>
                    </>
                  )}

                  {!!referenceCode && (
                    <View style={styles.refBox}>
                      <Text style={styles.refLabel}>Referência:</Text>
                      <Text style={styles.refValue}>{referenceCode}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  {/* Erro */}
                  {error ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={18} color={Colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Método */}
                  {!checkoutUrl && (
                    <>
                      <Text style={styles.inputLabel}>Método de Pagamento</Text>
                      <View style={styles.methodGrid}>
                        {METHODS.map((m) => (
                          <TouchableOpacity
                            key={m.id}
                            style={[styles.methodCard, method?.id === m.id && styles.methodCardSelected]}
                            onPress={() => { setMethod(m); setError(''); }}
                            activeOpacity={0.7}>
                            <Ionicons name={m.icon as any} size={20} color={method?.id === m.id ? m.color : Colors.textMuted} />
                            <Text style={[styles.methodName, method?.id === m.id && { color: m.color }]}>
                              {m.name}
                            </Text>
                            <Text style={styles.methodDesc}>
                              {m.prefix.length ? m.prefix.join('/') : 'Visa/Master'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Telefone */}
                      {!!method?.prefix.length && (
                        <>
                          <Text style={styles.inputLabel}>Número de Telefone</Text>
                          <TextInput
                            style={styles.phoneInput}
                            placeholder={method.id === 'mpesa' ? '841234567' : '861234567'}
                            placeholderTextColor={Colors.textMuted}
                            value={phone}
                            onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 9))}
                            keyboardType="phone-pad"
                            maxLength={9}
                          />
                        </>
                      )}

                      {/* Segurança */}
                      <View style={styles.securityBox}>
                        <Ionicons name="lock-closed" size={14} color={Colors.textSecondary} />
                        <Text style={styles.securityText}>
                          Pagamento seguro processado pela Alauda API. Seus dados não são armazenados.
                        </Text>
                      </View>

                      {/* Botão pagar */}
                      <TouchableOpacity
                        style={[styles.payBtn, (paying || !!(method?.prefix.length && !validatePhone())) ? { opacity: 0.6 } : null]}
                        onPress={handlePay}
                        disabled={paying}
                        activeOpacity={0.85}>
                        {paying ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="lock-closed" size={16} color="#fff" />
                            <Text style={styles.payBtnText}>Pagar {selectedPlan?.price_mt} MT</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },

  // ===== Plano atual =====
  currentCard: {
    backgroundColor: Colors.gradient.start,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  currentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentLabel: { fontSize: 13, color: '#93c5fd', fontWeight: '600' },
  currentPlan: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2, textTransform: 'capitalize' },
  expiresBox: { alignItems: 'flex-end' },
  expiresLabel: { fontSize: 11, color: '#93c5fd' },
  expiresValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  renewBox: {
    marginTop: 16,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.5)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  renewInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  renewText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  renewBtnText: { color: Colors.error, fontWeight: '800', fontSize: 14 },
  renewEarlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  renewEarlyText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },

  // ===== Suspensão =====
  suspendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  suspendedBannerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },

  // ===== Planos =====
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planCardCurrent: { borderColor: Colors.success },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  currentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currentBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  planName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  planPrice: { fontSize: 26, fontWeight: '800', color: Colors.text },
  planPeriod: { fontSize: 12, color: Colors.textSecondary },
  planBrl: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  planFeatures: { marginTop: 12, gap: 6, minHeight: 60 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  planBtn: {
    marginTop: 14,
    backgroundColor: Colors.text,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  planBtnCurrent: { backgroundColor: '#f0fdf4' },
  planBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  planBtnTextCurrent: { color: Colors.success },

  // ===== Histórico =====
  historySection: { marginTop: 4 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyEmpty: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  historyEmptyText: { fontSize: 13, color: Colors.textMuted },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  historyIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  historyPlan: { fontSize: 13, fontWeight: '700', color: Colors.text },
  historyMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 13, fontWeight: '800', color: Colors.text },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  receiptBtnText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },

  // ===== Modal =====
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalContent: { padding: 16 },

  planSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  planSummaryLabel: { fontSize: 11, color: Colors.textSecondary },
  planSummaryName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  planSummarySub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  planSummaryPrice: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: Colors.error, fontSize: 12, fontWeight: '600' },

  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  methodGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
  },
  methodCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  methodName: { fontSize: 12, fontWeight: '700', color: Colors.text },
  methodDesc: { fontSize: 10, color: Colors.textMuted },

  phoneInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surfaceVariant,
    marginBottom: 16,
    letterSpacing: 1,
  },

  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  securityText: { flex: 1, fontSize: 11, color: Colors.textSecondary },

  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
  },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  waitingBox: { alignItems: 'center', paddingVertical: 12, gap: 10 },
  waitingTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  waitingText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  instructionText: { fontSize: 12, color: Colors.text, textAlign: 'left', width: '100%' },
  refBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refLabel: { fontSize: 12, color: Colors.textSecondary },
  refValue: { fontSize: 12, fontWeight: '800', color: Colors.text, fontFamily: undefined },

  successBox: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  successTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  successText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
