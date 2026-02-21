import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

// ===== TYPES =====

type Domain = {
  id: number;
  domain: string;
  status: string;
  container_id: number;
  container_name: string;
  container_type: string;
  server_ip: string;
  ssl_status?: string;
  ssl_expires_at?: string;
  verified_at?: string;
  created_at: string;
};

type Container = {
  id: number;
  name: string;
  type: string;
  status: string;
};

type SearchResult = {
  domain: string;
  available: boolean;
  price: string;
  regular_price?: string;
  first_year_promo?: boolean;
  premium?: boolean;
  renewal_price?: string;
};

type RegisteredDomain = {
  domain: string;
  expireDate?: string;
  expire_date?: string;
  status?: string;
  createDate?: string;
};

const POPULAR_TLDS = ['.com', '.net', '.org', '.io', '.dev', '.app', '.co', '.mz'];

// ===== MAIN SCREEN =====

export default function DomainsScreen() {
  const router = useRouter();

  // Tab
  const [activeTab, setActiveTab] = useState<'connected' | 'register'>('connected');

  // Connected domains (existing)
  const [domains, setDomains] = useState<Domain[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState<Record<number, boolean>>({});
  const [copiedField, setCopiedField] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Connect domain modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search / Register
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [registeredDomains, setRegisteredDomains] = useState<RegisteredDomain[]>([]);

  // Buy modal
  const [showBuyModal, setShowBuyModal] = useState<SearchResult | null>(null);
  const [buyStep, setBuyStep] = useState(1);
  const [buyLinkContainer, setBuyLinkContainer] = useState<number | null>(null);

  // Renew modal
  const [showRenewModal, setShowRenewModal] = useState<RegisteredDomain | null>(null);
  const [renewYears, setRenewYears] = useState(1);
  const [renewStep, setRenewStep] = useState(1);

  // Payment (shared between buy/renew)
  const [payMethod, setPayMethod] = useState<'mpesa' | 'emola' | 'mercadopago'>('mpesa');
  const [payPhone, setPayPhone] = useState('');
  const [payPhoneError, setPayPhoneError] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [payResult, setPayResult] = useState<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ===== DATA LOADING =====

  const loadData = useCallback(async () => {
    try {
      const [domainsData, containersData] = await Promise.all([
        api.get('/domains'),
        api.get('/containers'),
      ]);
      setDomains(Array.isArray(domainsData) ? domainsData : []);
      setContainers(containersData?.containers || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadRegisteredDomains = useCallback(async () => {
    try {
      const data = await api.get('/registrar/list');
      setRegisteredDomains(data?.domains || []);
    } catch {
      // Porkbun may not be configured
    }
  }, []);

  useEffect(() => {
    loadData();
    loadRegisteredDomains();
  }, [loadData, loadRegisteredDomains]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    loadRegisteredDomains();
  };

  // ===== HELPERS =====

  const copyToClipboard = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      pending: { icon: 'time', color: '#eab308', bg: '#fefce8', label: 'Pendente' },
      dns_configured: { icon: 'sync', color: '#3b82f6', bg: '#eff6ff', label: 'DNS OK' },
      ssl_generating: { icon: 'lock-closed', color: '#a855f7', bg: '#faf5ff', label: 'SSL...' },
      active: { icon: 'checkmark-circle', color: '#22c55e', bg: '#f0fdf4', label: 'Ativo' },
      failed: { icon: 'close-circle', color: '#ef4444', bg: '#fef2f2', label: 'Falhou' },
    };
    return configs[status] || { icon: 'help-circle', color: '#6b7280', bg: '#f9fafb', label: status || '?' };
  };

  const daysUntil = (date?: string) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryColor = (days: number | null) => {
    if (days === null) return Colors.textMuted;
    if (days < 0) return '#ef4444';
    if (days <= 30) return '#ef4444';
    if (days <= 90) return '#f59e0b';
    return '#22c55e';
  };

  // ===== CONNECTED DOMAIN ACTIONS =====

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      Alert.alert('Erro', 'Digite o domínio');
      return;
    }
    if (!selectedContainer) {
      Alert.alert('Erro', 'Selecione um container');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post('/domains', {
        containerId: selectedContainer,
        domain: newDomain.toLowerCase().trim(),
      });
      setShowAddModal(false);
      setNewDomain('');
      setSelectedContainer(null);
      await loadData();
      Alert.alert(
        'Domínio Adicionado!',
        `Configure um registro DNS tipo A apontando para: ${data.instructions?.ip || 'IP do servidor'}\n\nAguarde 5-30 minutos para propagação.`
      );
    } catch (err: any) {
      Alert.alert('Erro', err.error || err.message || 'Falha ao adicionar domínio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: number) => {
    setVerifying((prev) => ({ ...prev, [id]: true }));
    try {
      const data = await api.post(`/domains/${id}/verify`);
      if (data.configured) {
        Alert.alert('✅ DNS Verificado', `IP detectado: ${data.ip}`);
      } else {
        Alert.alert('⏳ DNS Pendente', `IP detectado: ${data.ip || 'nenhum'}\n\nO DNS ainda não propagou. Tente novamente em alguns minutos.`);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Erro', err.error || 'Falha na verificação');
    } finally {
      setVerifying((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = (id: number, domain: string) => {
    Alert.alert(
      'Remover Domínio',
      `Remover "${domain}"? O domínio será desconectado do container.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/domains/${id}`);
              await loadData();
            } catch (err: any) {
              Alert.alert('Erro', err.error || 'Falha ao remover');
            }
          },
        },
      ]
    );
  };

  // ===== SEARCH =====

  const checkDomain = async () => {
    const raw = searchQuery.trim().toLowerCase();
    if (!raw) return;

    setSearching(true);
    setSearchResults([]);

    const hasTld = raw.includes('.');
    const domainsToCheck = hasTld ? [raw] : POPULAR_TLDS.map(tld => `${raw}${tld}`);

    try {
      const results = await Promise.allSettled(
        domainsToCheck.map(async (domain) => {
          const data = await api.get(`/registrar/check/${domain}`);
          return { ...data, domain } as SearchResult;
        })
      );

      const parsed = results
        .filter((r): r is PromiseFulfilledResult<SearchResult> => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => {
          if (a.available && !b.available) return -1;
          if (!a.available && b.available) return 1;
          return (parseFloat(a.price) || 999) - (parseFloat(b.price) || 999);
        });

      setSearchResults(parsed);
      if (parsed.length === 0) Alert.alert('Info', 'Nenhum resultado encontrado');
    } catch {
      Alert.alert('Erro', 'Erro ao pesquisar domínios');
    } finally {
      setSearching(false);
    }
  };

  // ===== PHONE VALIDATION =====

  const handlePayPhoneChange = (value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    setPayPhone(clean);
    if (clean.length === 0) { setPayPhoneError(''); return; }
    if (clean.length < 9) { setPayPhoneError('Número deve ter 9 dígitos'); return; }
    if (clean.length > 9) { setPayPhoneError('Máximo 9 dígitos'); return; }
    const prefix = clean.substring(0, 2);
    if (!['84', '85', '86', '87'].includes(prefix)) { setPayPhoneError('Deve começar com 84, 85, 86 ou 87'); return; }
    if (payMethod === 'mpesa' && !['84', '85'].includes(prefix)) { setPayPhoneError('M-Pesa aceita apenas 84/85'); return; }
    if (payMethod === 'emola' && !['86', '87'].includes(prefix)) { setPayPhoneError('e-Mola aceita apenas 86/87'); return; }
    setPayPhoneError('');
  };

  // ===== PAYMENT =====

  const resetPayState = () => {
    setBuyStep(1);
    setRenewStep(1);
    setPayMethod('mpesa');
    setPayPhone('');
    setPayPhoneError('');
    setPayProcessing(false);
    setPayResult(null);
    setBuyLinkContainer(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const closeBuyModal = () => { setShowBuyModal(null); resetPayState(); };
  const closeRenewModal = () => { setShowRenewModal(null); setRenewYears(1); resetPayState(); };

  const submitDomainPayment = async (action: 'buy' | 'renew', domain: string, cost: string, years?: number) => {
    if ((payMethod === 'mpesa' || payMethod === 'emola') && payPhone.length !== 9) {
      Alert.alert('Erro', 'Digite um número válido com 9 dígitos');
      return;
    }
    if (payPhoneError) {
      Alert.alert('Erro', 'Corrija o número de telefone');
      return;
    }

    setPayProcessing(true);
    try {
      const body: any = { domain, action, cost, method: payMethod, years: years || 1 };
      if (payMethod === 'mpesa' || payMethod === 'emola') body.phone = payPhone;

      const data = await api.post('/registrar/pay', body);

      if (data.success) {
        setPayResult(data);

        if (data.payment_url) {
          Linking.openURL(data.payment_url).catch(() => {});
        }

        // Poll payment status
        if (data.payment_id) {
          const interval = setInterval(async () => {
            try {
              const sData = await api.get(`/registrar/pay/${data.payment_id}/status`);
              if (sData.payment?.status === 'completed') {
                clearInterval(interval);
                pollingRef.current = null;
                Alert.alert('🎉 Sucesso!', action === 'buy' ? 'Domínio registrado com sucesso!' : 'Domínio renovado com sucesso!');

                if (action === 'buy' && buyLinkContainer) {
                  try {
                    await api.post('/domains', { containerId: buyLinkContainer, domain });
                  } catch {}
                }

                closeBuyModal();
                closeRenewModal();
                loadData();
                loadRegisteredDomains();
              } else if (sData.payment?.status === 'failed') {
                clearInterval(interval);
                pollingRef.current = null;
                Alert.alert('Erro', 'Pagamento falhou. Tente novamente.');
              }
            } catch {}
          }, 5000);
          pollingRef.current = interval;
          setTimeout(() => {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }, 600000);
        }
      } else {
        Alert.alert('Erro', data.error || 'Erro ao processar pagamento');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.error || err.message || 'Erro de conexão');
    } finally {
      setPayProcessing(false);
    }
  };

  // ===== FILTERS =====

  const filteredDomains =
    statusFilter === 'all'
      ? domains
      : domains.filter((d) => d.status === statusFilter);

  // ===== RENDER =====

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Domínios', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Domínios',
          headerShown: true,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <View style={styles.container}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'connected' && styles.tabActive]}
            onPress={() => setActiveTab('connected')}>
            <Ionicons name="globe" size={16} color={activeTab === 'connected' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'connected' && styles.tabTextActive]}>Meus Domínios</Text>
            {domains.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'connected' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'connected' && styles.tabBadgeTextActive]}>{domains.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'register' && styles.tabActive]}
            onPress={() => setActiveTab('register')}>
            <Ionicons name="search" size={16} color={activeTab === 'register' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {/* ===== TAB: CONNECTED DOMAINS ===== */}
        {activeTab === 'connected' && (
          <>
            {/* Header bar */}
            <View style={styles.headerBar}>
              <Text style={styles.headerCount}>{domains.length} domínio(s)</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Conectar</Text>
              </TouchableOpacity>
            </View>

            {/* Status filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {[
                { key: 'all', label: 'Todos' },
                { key: 'active', label: 'Ativos' },
                { key: 'pending', label: 'Pendentes' },
                { key: 'failed', label: 'Falhos' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
                  onPress={() => setStatusFilter(f.key)}>
                  <Text style={[styles.filterText, statusFilter === f.key && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Domains list */}
            <ScrollView
              style={{ flex: 1 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
              {filteredDomains.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="globe-outline" size={64} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {statusFilter !== 'all' ? 'Nenhum domínio com este status' : 'Nenhum domínio conectado'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    Conecte um domínio ou registre um novo na aba "Registrar"
                  </Text>
                  <TouchableOpacity
                    style={[styles.addBtn, { marginTop: 16 }]}
                    onPress={() => setActiveTab('register')}>
                    <Ionicons name="search" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Registrar Novo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredDomains.map((domain) => {
                  const st = getStatusConfig(domain.status);
                  return (
                    <View key={domain.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                          <Ionicons name="globe" size={20} color={Colors.primary} />
                          <Text style={styles.domainName} numberOfLines={1}>{domain.domain}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                          <Ionicons name={st.icon as any} size={14} color={st.color} />
                          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>

                      <View style={styles.domainInfo}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Container</Text>
                          <Text style={styles.infoValue}>{domain.container_name}</Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Tipo</Text>
                          <Text style={styles.infoValue}>{domain.container_type}</Text>
                        </View>
                        {domain.ssl_status === 'active' && (
                          <View style={styles.infoItem}>
                            <Ionicons name="lock-closed" size={14} color={Colors.success} />
                            <Text style={[styles.infoValue, { color: Colors.success }]}>SSL Ativo</Text>
                          </View>
                        )}
                      </View>

                      {domain.status === 'pending' && domain.server_ip && (
                        <View style={styles.dnsBox}>
                          <Text style={styles.dnsTitle}>⚙️ Configure o DNS:</Text>
                          <Text style={styles.dnsInstruction}>
                            Adicione um registro tipo <Text style={styles.dnsBold}>A</Text> apontando para:
                          </Text>
                          <TouchableOpacity
                            style={styles.ipRow}
                            onPress={() => copyToClipboard(domain.server_ip, `ip-${domain.id}`)}>
                            <Text style={styles.ipText}>{domain.server_ip}</Text>
                            <Ionicons
                              name={copiedField === `ip-${domain.id}` ? 'checkmark' : 'copy'}
                              size={16}
                              color={copiedField === `ip-${domain.id}` ? Colors.success : Colors.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.actionChip, { backgroundColor: '#eff6ff' }]}
                          onPress={() => handleVerify(domain.id)}
                          disabled={verifying[domain.id]}>
                          {verifying[domain.id] ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          ) : (
                            <>
                              <Ionicons name="sync" size={16} color={Colors.primary} />
                              <Text style={[styles.actionChipText, { color: Colors.primary }]}>Verificar DNS</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionChip, { backgroundColor: '#fef2f2' }]}
                          onPress={() => handleDelete(domain.id, domain.domain)}>
                          <Ionicons name="trash" size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
              <View style={{ height: 32 }} />
            </ScrollView>
          </>
        )}

        {/* ===== TAB: REGISTER / SEARCH / BUY ===== */}
        {activeTab === 'register' && (
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

            {/* Search Box */}
            <View style={styles.searchCard}>
              <Text style={styles.searchTitle}>Encontre o domínio perfeito</Text>
              <Text style={styles.searchSubtitle}>Pesquise a disponibilidade e registre em segundos</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="meusite.com ou apenas meusite"
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  keyboardType="url"
                  returnKeyType="search"
                  onSubmitEditing={checkDomain}
                />
                <TouchableOpacity
                  style={[styles.searchBtn, (!searchQuery.trim() || searching) && { opacity: 0.5 }]}
                  onPress={checkDomain}
                  disabled={!searchQuery.trim() || searching}>
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="search" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.searchHint}>💡 Digite sem extensão para pesquisar múltiplas extensões</Text>
            </View>

            {/* Searching indicator */}
            {searching && (
              <View style={styles.searchingBox}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.searchingText}>Pesquisando disponibilidade...</Text>
              </View>
            )}

            {/* Search Results */}
            {!searching && searchResults.length > 0 && (
              <View style={styles.resultsCard}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsHeaderText}>
                    {searchResults.filter(r => r.available).length} disponíveis de {searchResults.length}
                  </Text>
                  <TouchableOpacity onPress={() => setSearchResults([])}>
                    <Text style={styles.clearResults}>Limpar</Text>
                  </TouchableOpacity>
                </View>

                {searchResults.map((result, i) => (
                  <View key={i} style={[styles.resultItem, !result.available && { opacity: 0.5 }]}>
                    <View style={styles.resultLeft}>
                      <Ionicons
                        name={result.available ? 'checkmark-circle' : 'close-circle'}
                        size={22}
                        color={result.available ? '#22c55e' : '#ef4444'}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultDomain}>{result.domain}</Text>
                        <View style={styles.resultBadges}>
                          {result.first_year_promo && (
                            <View style={styles.promoBadge}>
                              <Text style={styles.promoBadgeText}>Promo 1º ano</Text>
                            </View>
                          )}
                          {result.premium && (
                            <View style={styles.premiumBadge}>
                              <Text style={styles.premiumBadgeText}>Premium</Text>
                            </View>
                          )}
                          {result.renewal_price && (
                            <Text style={styles.renewalPrice}>Renovação: ${result.renewal_price}/ano</Text>
                          )}
                        </View>
                      </View>
                    </View>
                    {result.available ? (
                      <View style={styles.resultRight}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.resultPrice}>${result.price}</Text>
                          {result.regular_price && result.regular_price !== result.price && (
                            <Text style={styles.resultRegularPrice}>${result.regular_price}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.buyBtn}
                          onPress={() => { setShowBuyModal(result); setBuyStep(1); }}>
                          <Ionicons name="cart" size={16} color="#fff" />
                          <Text style={styles.buyBtnText}>Comprar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.unavailableText}>Indisponível</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Registered Domains */}
            <View style={styles.registeredCard}>
              <View style={styles.registeredHeader}>
                <View>
                  <Text style={styles.registeredTitle}>Domínios Registrados</Text>
                  <Text style={styles.registeredSubtitle}>Domínios na sua conta</Text>
                </View>
                <TouchableOpacity onPress={loadRegisteredDomains} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {registeredDomains.length === 0 ? (
                <View style={styles.regEmptyState}>
                  <Ionicons name="globe-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.regEmptyTitle}>Nenhum domínio registrado</Text>
                  <Text style={styles.regEmptySubtitle}>Use a pesquisa acima para registrar</Text>
                </View>
              ) : (
                registeredDomains.map((d, i) => {
                  const domainName = d.domain || (d as any);
                  const expiry = d.expireDate || d.expire_date;
                  const days = daysUntil(expiry);
                  const expiryColor = getExpiryColor(days);
                  const isConnected = domains.some(cd => cd.domain === domainName);

                  return (
                    <View key={i} style={styles.regItem}>
                      <View style={styles.regItemMain}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.regItemNameRow}>
                            <Text style={styles.regItemName} numberOfLines={1}>{domainName}</Text>
                            {isConnected && (
                              <View style={styles.connectedBadge}>
                                <Ionicons name="link" size={10} color={Colors.primary} />
                                <Text style={styles.connectedBadgeText}>Conectado</Text>
                              </View>
                            )}
                          </View>
                          {expiry && (
                            <View style={styles.expiryRow}>
                              <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.expiryText}>
                                Expira: {new Date(expiry).toLocaleDateString('pt-BR')}
                              </Text>
                              {days !== null && (
                                <View style={[styles.expiryBadge, { backgroundColor: expiryColor + '20' }]}>
                                  <Text style={[styles.expiryBadgeText, { color: expiryColor }]}>
                                    {days < 0 ? 'Expirado' : `${days}d`}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.renewBtn}
                          onPress={() => { setShowRenewModal({ ...d, domain: domainName }); setRenewYears(1); setRenewStep(1); }}>
                          <Ionicons name="refresh" size={14} color="#92400e" />
                          <Text style={styles.renewBtnText}>Renovar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        )}

        {/* ===== MODAL: CONNECT DOMAIN ===== */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Conectar Domínio</Text>
                <TouchableOpacity onPress={() => { setShowAddModal(false); setNewDomain(''); setSelectedContainer(null); }}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Domínio</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="meusite.com.br"
                    placeholderTextColor={Colors.textMuted}
                    value={newDomain}
                    onChangeText={setNewDomain}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Conectar ao Container</Text>
                  {containers.length === 0 ? (
                    <Text style={styles.noContainers}>Nenhum container disponível.</Text>
                  ) : (
                    containers.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.containerOption, selectedContainer === c.id && styles.containerOptionActive]}
                        onPress={() => setSelectedContainer(c.id)}>
                        <View style={styles.containerOptionRow}>
                          <Ionicons name="server" size={18} color={selectedContainer === c.id ? Colors.primary : Colors.textSecondary} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.containerOptionName, selectedContainer === c.id && { color: Colors.primary }]}>{c.name}</Text>
                            <Text style={styles.containerOptionType}>{c.type} • {c.status}</Text>
                          </View>
                          {selectedContainer === c.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, (submitting || !newDomain.trim() || !selectedContainer) && { opacity: 0.5 }]}
                  onPress={handleAddDomain}
                  disabled={submitting || !newDomain.trim() || !selectedContainer}>
                  {submitting ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="link" size={18} color="#fff" />
                      <Text style={styles.submitBtnText}>Conectar Domínio</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: BUY DOMAIN ===== */}
        <Modal visible={!!showBuyModal && !payResult} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {buyStep === 1 ? 'Registrar Domínio' : 'Pagamento'}
                </Text>
                <TouchableOpacity onPress={closeBuyModal}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Domain summary */}
                {showBuyModal && (
                  <View style={styles.buySummary}>
                    <View>
                      <Text style={styles.buySummaryDomain}>{showBuyModal.domain}</Text>
                      <View style={styles.resultBadges}>
                        {showBuyModal.first_year_promo && (
                          <View style={styles.promoBadge}>
                            <Text style={styles.promoBadgeText}>Promo</Text>
                          </View>
                        )}
                        {showBuyModal.renewal_price && (
                          <Text style={styles.renewalPrice}>Renovação: ${showBuyModal.renewal_price}/ano</Text>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.buySummaryPrice}>${showBuyModal.price}</Text>
                      <Text style={styles.buySummaryPriceLabel}>por ano</Text>
                    </View>
                  </View>
                )}

                {buyStep === 1 && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Conectar a um container (opcional)</Text>
                      {containers.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.containerOption, buyLinkContainer === c.id && styles.containerOptionActive]}
                          onPress={() => setBuyLinkContainer(buyLinkContainer === c.id ? null : c.id)}>
                          <View style={styles.containerOptionRow}>
                            <Ionicons name="server" size={18} color={buyLinkContainer === c.id ? Colors.primary : Colors.textSecondary} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.containerOptionName, buyLinkContainer === c.id && { color: Colors.primary }]}>{c.name}</Text>
                              <Text style={styles.containerOptionType}>{c.type}</Text>
                            </View>
                            {buyLinkContainer === c.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                          </View>
                        </TouchableOpacity>
                      ))}
                      <Text style={styles.formHint}>O domínio será conectado após o pagamento</Text>
                    </View>

                    <View style={styles.modalBtns}>
                      <TouchableOpacity style={styles.modalBtnCancel} onPress={closeBuyModal}>
                        <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setBuyStep(2)}>
                        <Text style={styles.modalBtnPrimaryText}>Ir para Pagamento</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {buyStep === 2 && showBuyModal && (
                  <>
                    {renderPaymentForm()}
                    <View style={styles.modalBtns}>
                      <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setBuyStep(1)}>
                        <Text style={styles.modalBtnCancelText}>Voltar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtnBuy, (payProcessing || ((payMethod === 'mpesa' || payMethod === 'emola') && (payPhone.length !== 9 || !!payPhoneError))) && { opacity: 0.5 }]}
                        onPress={() => submitDomainPayment('buy', showBuyModal.domain, showBuyModal.price)}
                        disabled={payProcessing || ((payMethod === 'mpesa' || payMethod === 'emola') && (payPhone.length !== 9 || !!payPhoneError))}>
                        {payProcessing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="cart" size={18} color="#fff" />}
                        <Text style={styles.modalBtnPrimaryText}>Pagar e Registrar</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: RENEW DOMAIN ===== */}
        <Modal visible={!!showRenewModal && !payResult} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {renewStep === 1 ? 'Renovar Domínio' : 'Pagamento'}
                </Text>
                <TouchableOpacity onPress={closeRenewModal}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {showRenewModal && (
                  <View style={styles.renewSummary}>
                    <Ionicons name="globe" size={24} color="#92400e" />
                    <Text style={styles.renewSummaryDomain}>{showRenewModal.domain}</Text>
                  </View>
                )}

                {renewStep === 1 && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Duração da renovação</Text>
                      <View style={styles.yearsRow}>
                        {[1, 2, 3, 5].map(y => (
                          <TouchableOpacity
                            key={y}
                            style={[styles.yearBtn, renewYears === y && styles.yearBtnActive]}
                            onPress={() => setRenewYears(y)}>
                            <Text style={[styles.yearBtnText, renewYears === y && styles.yearBtnTextActive]}>
                              {y} ano{y > 1 ? 's' : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.modalBtns}>
                      <TouchableOpacity style={styles.modalBtnCancel} onPress={closeRenewModal}>
                        <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalBtnRenew} onPress={() => setRenewStep(2)}>
                        <Text style={styles.modalBtnPrimaryText}>Ir para Pagamento</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {renewStep === 2 && showRenewModal && (
                  <>
                    {renderPaymentForm()}
                    <View style={styles.modalBtns}>
                      <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setRenewStep(1)}>
                        <Text style={styles.modalBtnCancelText}>Voltar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtnRenew, (payProcessing || ((payMethod === 'mpesa' || payMethod === 'emola') && (payPhone.length !== 9 || !!payPhoneError))) && { opacity: 0.5 }]}
                        onPress={() => submitDomainPayment('renew', showRenewModal.domain, '10', renewYears)}
                        disabled={payProcessing || ((payMethod === 'mpesa' || payMethod === 'emola') && (payPhone.length !== 9 || !!payPhoneError))}>
                        {payProcessing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="refresh" size={18} color="#fff" />}
                        <Text style={styles.modalBtnPrimaryText}>Pagar e Renovar ({renewYears}a)</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ===== MODAL: PAYMENT RESULT ===== */}
        <Modal visible={!!payResult} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
              <ScrollView>
                <View style={styles.payResultHeader}>
                  <View style={styles.payResultIcon}>
                    {pollingRef.current ? (
                      <ActivityIndicator size="large" color={Colors.primary} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={48} color={Colors.primary} />
                    )}
                  </View>
                  <Text style={styles.payResultTitle}>
                    {pollingRef.current ? 'Aguardando Confirmação' : 'Pagamento Iniciado'}
                  </Text>
                  <Text style={styles.payResultSubtitle}>
                    {pollingRef.current ? 'Confirme o pagamento no seu celular' : 'Siga as instruções abaixo'}
                  </Text>
                </View>

                {payResult && (
                  <>
                    <View style={styles.payResultDetails}>
                      {[
                        { label: 'Domínio', value: payResult.domain },
                        { label: 'Ação', value: payResult.action === 'buy' ? 'Registro' : 'Renovação' },
                        { label: 'Preço (USD)', value: `$${payResult.price_usd}` },
                        { label: 'Valor cobrado', value: `${payResult.currency === 'BRL' ? 'R$' : 'MT'} ${parseFloat(payResult.amount).toFixed(0)}` },
                        { label: 'Referência', value: payResult.reference_code },
                      ].map((item, i) => (
                        <View key={i} style={styles.payResultRow}>
                          <Text style={styles.payResultLabel}>{item.label}</Text>
                          <TouchableOpacity
                            onPress={() => copyToClipboard(item.value, `pay-${i}`)}
                            style={styles.payResultValueRow}>
                            <Text style={styles.payResultValue}>{item.value}</Text>
                            {item.label === 'Referência' && (
                              <Ionicons
                                name={copiedField === `pay-${i}` ? 'checkmark' : 'copy-outline'}
                                size={14}
                                color={Colors.textMuted}
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {payResult.payment_details?.instructions && (
                      <View style={styles.payInstructions}>
                        <Text style={styles.payInstructionsTitle}>Instruções:</Text>
                        {payResult.payment_details.instructions.map((inst: string, i: number) => (
                          <View key={i} style={styles.payInstructionItem}>
                            <View style={styles.payInstructionNum}>
                              <Text style={styles.payInstructionNumText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.payInstructionText}>{inst}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {payResult.payment_url && (
                      <TouchableOpacity
                        style={styles.openPayUrlBtn}
                        onPress={() => Linking.openURL(payResult.payment_url).catch(() => {})}>
                        <Ionicons name="open-outline" size={18} color="#fff" />
                        <Text style={styles.openPayUrlBtnText}>Abrir MercadoPago</Text>
                      </TouchableOpacity>
                    )}

                    {pollingRef.current && (
                      <View style={styles.pollingRow}>
                        <ActivityIndicator size="small" color={Colors.textMuted} />
                        <Text style={styles.pollingText}>Verificando pagamento automaticamente...</Text>
                      </View>
                    )}
                  </>
                )}

                <TouchableOpacity
                  style={styles.payResultCloseBtn}
                  onPress={() => { closeBuyModal(); closeRenewModal(); }}>
                  <Text style={styles.payResultCloseBtnText}>Fechar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );

  // ===== PAYMENT FORM (reusable between buy and renew) =====
  function renderPaymentForm() {
    return (
      <>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Método de Pagamento</Text>
          <View style={styles.payMethodRow}>
            {([
              { id: 'mpesa' as const, name: 'M-Pesa', desc: '84/85', icon: '🟢', activeColor: '#22c55e' },
              { id: 'emola' as const, name: 'e-Mola', desc: '86/87', icon: '🔵', activeColor: '#3b82f6' },
              { id: 'mercadopago' as const, name: 'MercadoPago', desc: 'Cartão/PIX', icon: '💳', activeColor: '#06b6d4' },
            ]).map(m => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.payMethodBtn,
                  payMethod === m.id && { borderColor: m.activeColor, backgroundColor: m.activeColor + '10' },
                ]}
                onPress={() => { setPayMethod(m.id); setPayPhoneError(''); }}>
                <Text style={styles.payMethodIcon}>{m.icon}</Text>
                <Text style={[styles.payMethodName, payMethod === m.id && { color: m.activeColor, fontWeight: '700' }]}>{m.name}</Text>
                <Text style={styles.payMethodDesc}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(payMethod === 'mpesa' || payMethod === 'emola') && (
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Número de Telefone</Text>
            <TextInput
              style={[
                styles.phoneInput,
                payPhoneError ? { borderColor: '#ef4444' }
                : payPhone.length === 9 && !payPhoneError ? { borderColor: '#22c55e' }
                : {},
              ]}
              placeholder={payMethod === 'mpesa' ? '841234567' : '861234567'}
              placeholderTextColor={Colors.textMuted}
              value={payPhone}
              onChangeText={handlePayPhoneChange}
              keyboardType="phone-pad"
              maxLength={9}
            />
            {payPhoneError ? (
              <Text style={styles.phoneError}>{payPhoneError}</Text>
            ) : payPhone.length === 9 && !payPhoneError ? (
              <View style={styles.phoneValidRow}>
                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                <Text style={styles.phoneValid}>Número válido</Text>
              </View>
            ) : null}
          </View>
        )}

        {payMethod === 'mercadopago' && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={Colors.info} />
            <Text style={styles.infoBoxText}>
              Será redirecionado para o MercadoPago para pagar com cartão ou PIX.
            </Text>
          </View>
        )}

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.textMuted} />
          <Text style={styles.securityNoteText}>
            Pagamento seguro. Após confirmação, a ação será executada automaticamente.
          </Text>
        </View>
      </>
    );
  }
}

// ===== STYLES =====

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  tabBadge: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: Colors.primary + '20' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  tabBadgeTextActive: { color: Colors.primary },

  // Header
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCount: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Filters
  filterRow: { paddingHorizontal: 16, marginBottom: 8, maxHeight: 40 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },

  // Card
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  domainName: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  domainInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 12, color: Colors.textMuted },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.text },

  // DNS box
  dnsBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 12, marginBottom: 12 },
  dnsTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  dnsInstruction: { fontSize: 12, color: '#92400e' },
  dnsBold: { fontWeight: '800' },
  ipRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 8, gap: 8, borderWidth: 1, borderColor: '#fde68a' },
  ipText: { fontSize: 15, fontWeight: '700', color: Colors.text, fontFamily: 'monospace', flex: 1 },

  // Actions
  cardActions: { flexDirection: 'row', gap: 8 },
  actionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  actionChipText: { fontSize: 13, fontWeight: '600' },

  // Search
  searchCard: {
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 4 },
  searchSubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surfaceVariant,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchHint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 10 },

  searchingBox: { alignItems: 'center', padding: 32 },
  searchingText: { fontSize: 14, color: Colors.textMuted, marginTop: 12 },

  // Results
  resultsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultsHeaderText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  clearResults: { fontSize: 12, color: Colors.textMuted },

  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  resultDomain: { fontSize: 15, fontWeight: '700', color: Colors.text },
  resultBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  promoBadge: { backgroundColor: '#dcfce7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  promoBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  premiumBadge: { backgroundColor: '#f3e8ff', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  premiumBadgeText: { fontSize: 10, fontWeight: '700', color: '#7e22ce' },
  renewalPrice: { fontSize: 10, color: Colors.textMuted },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultPrice: { fontSize: 18, fontWeight: '800', color: Colors.text },
  resultRegularPrice: { fontSize: 11, color: Colors.textMuted, textDecorationLine: 'line-through' },
  unavailableText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },

  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Registered
  registeredCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  registeredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  registeredTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  registeredSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  refreshBtn: { padding: 8 },

  regEmptyState: { alignItems: 'center', paddingVertical: 40 },
  regEmptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 12 },
  regEmptySubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  regItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  regItemMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  regItemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  regItemName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  connectedBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },

  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  expiryText: { fontSize: 11, color: Colors.textMuted },
  expiryBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4 },
  expiryBadgeText: { fontSize: 10, fontWeight: '700' },

  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  renewBtnText: { fontSize: 12, fontWeight: '700', color: '#92400e' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },

  // Form
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surfaceVariant,
  },
  formHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  noContainers: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', padding: 12 },
  containerOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    backgroundColor: Colors.surfaceVariant,
  },
  containerOptionActive: { borderColor: Colors.primary, backgroundColor: '#eff6ff' },
  containerOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  containerOptionName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  containerOptionType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Buy summary
  buySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  buySummaryDomain: { fontSize: 17, fontWeight: '800', color: '#166534' },
  buySummaryPrice: { fontSize: 24, fontWeight: '800', color: Colors.text },
  buySummaryPriceLabel: { fontSize: 11, color: Colors.textMuted },

  // Renew summary
  renewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  renewSummaryDomain: { fontSize: 17, fontWeight: '800', color: '#92400e' },

  // Years
  yearsRow: { flexDirection: 'row', gap: 8 },
  yearBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
  },
  yearBtnActive: { backgroundColor: Colors.primary },
  yearBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  yearBtnTextActive: { color: '#fff' },

  // Modal buttons
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtnCancel: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalBtnPrimary: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    gap: 6,
  },
  modalBtnBuy: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    gap: 6,
  },
  modalBtnRenew: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    gap: 6,
  },
  modalBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Payment methods
  payMethodRow: { flexDirection: 'row', gap: 8 },
  payMethodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  payMethodIcon: { fontSize: 20, marginBottom: 4 },
  payMethodName: { fontSize: 12, fontWeight: '600', color: Colors.text },
  payMethodDesc: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  // Phone
  phoneInput: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: Colors.text,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  phoneError: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  phoneValidRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneValid: { fontSize: 12, color: '#22c55e' },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoBoxText: { fontSize: 13, color: '#1e40af', flex: 1, lineHeight: 18 },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  securityNoteText: { fontSize: 12, color: Colors.textMuted, flex: 1, lineHeight: 16 },

  // Payment result
  payResultHeader: { alignItems: 'center', marginBottom: 20 },
  payResultIcon: { marginBottom: 12 },
  payResultTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  payResultSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  payResultDetails: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  payResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payResultLabel: { fontSize: 13, color: Colors.textMuted },
  payResultValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  payResultValue: { fontSize: 13, fontWeight: '700', color: Colors.text },

  payInstructions: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  payInstructionsTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 10 },
  payInstructionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  payInstructionNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payInstructionNumText: { fontSize: 10, fontWeight: '800', color: '#1e40af' },
  payInstructionText: { fontSize: 12, color: '#1e40af', flex: 1, lineHeight: 18 },

  openPayUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  openPayUrlBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pollingText: { fontSize: 12, color: Colors.textMuted },

  payResultCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  payResultCloseBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
