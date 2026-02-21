import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { api, getToken } from '@/services/api';
import { Colors } from '@/constants/Colors';

const API_BASE = 'https://api.mozhost.topaziocoin.online/api';

type AdminStats = {
  users: { total: number; active: number; verified: number; byPlan: { plan: string; count: number }[] };
  containers: { total: number; running: number; byStatus: { status: string; count: number }[] };
  coins: { total: number };
  resources: { cpu: number; ram: number; storage: number };
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  plan: string;
  coins: number;
  isActive: boolean;
  emailVerified: boolean;
  containerCount: number;
  createdAt: string;
};

type Coupon = {
  id: number;
  code: string;
  coins: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  total_redemptions: number;
  total_coins_given: number;
};

export default function AdminScreen() {
  const [adminPassword, setAdminPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'coupons'>('stats');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    coins: '',
    maxUses: '',
    expiresAt: '',
  });

  const unlock = () => {
    if (!passwordInput.trim()) {
      Alert.alert('Erro', 'Digite a senha de admin');
      return;
    }
    setAdminPassword(passwordInput);
    setIsUnlocked(true);
    loadStats(passwordInput);
  };

  const loadStats = useCallback(async (pwd?: string) => {
    const pass = pwd || adminPassword;
    if (!pass) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stats?password=${encodeURIComponent(pass)}`);
      if (res.ok) {
        setStats(await res.json());
      } else {
        Alert.alert('Erro', 'Senha inválida');
        setIsUnlocked(false);
      }
    } catch {
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminPassword]);

  const loadUsers = useCallback(async () => {
    if (!adminPassword) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/admin/users?password=${encodeURIComponent(adminPassword)}`;
      if (userSearch.trim()) url += `&search=${encodeURIComponent(userSearch)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminPassword, userSearch]);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/coupons');
      setCoupons(data.coupons || []);
    } catch (err: any) {
      if (err.status === 403) Alert.alert('Erro', 'Acesso restrito');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleCreateCoupon = async () => {
    if (!couponForm.code.trim() || !couponForm.coins.trim()) {
      Alert.alert('Erro', 'Código e coins são obrigatórios');
      return;
    }
    const coinsNum = parseInt(couponForm.coins);
    if (isNaN(coinsNum) || coinsNum <= 0) {
      Alert.alert('Erro', 'Coins deve ser maior que 0');
      return;
    }
    setCreatingCoupon(true);
    try {
      const body: any = { code: couponForm.code.toUpperCase().trim(), coins: coinsNum };
      if (couponForm.maxUses.trim()) body.maxUses = parseInt(couponForm.maxUses);
      if (couponForm.expiresAt.trim()) body.expiresAt = couponForm.expiresAt.trim();
      const data = await api.post('/admin/coupons/create', body);
      Alert.alert('Sucesso', `Cupom ${data.coupon.code} criado! (${data.coupon.coins} coins)`);
      setShowCreateCoupon(false);
      setCouponForm({ code: '', coins: '', maxUses: '', expiresAt: '' });
      await loadCoupons();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao criar cupom');
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleDeactivateCoupon = (id: number, code: string) => {
    Alert.alert('Desativar Cupom', `Desativar "${code}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desativar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/admin/coupons/${id}/deactivate`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (res.ok) await loadCoupons();
            else Alert.alert('Erro', 'Falha ao desativar');
          } catch {
            Alert.alert('Erro', 'Falha ao desativar');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (!isUnlocked) return;
    if (activeTab === 'stats') loadStats();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'coupons') loadCoupons();
  }, [activeTab, isUnlocked]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'stats') loadStats();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'coupons') loadCoupons();
  };

  if (!isUnlocked) {
    return (
      <>
        <Stack.Screen options={{ title: 'Admin', headerShown: true, headerStyle: { backgroundColor: Colors.surface }, headerTintColor: Colors.text }} />
        <View style={styles.lockScreen}>
          <View style={styles.lockCard}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
            <Text style={styles.lockTitle}>Área Administrativa</Text>
            <Text style={styles.lockSubtitle}>Digite a senha de admin para continuar</Text>
            <TextInput
              style={styles.lockInput}
              placeholder="Senha de admin"
              placeholderTextColor={Colors.textMuted}
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              onSubmitEditing={unlock}
            />
            <TouchableOpacity style={styles.lockBtn} onPress={unlock}>
              <Text style={styles.lockBtnText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Admin', headerShown: true, headerStyle: { backgroundColor: Colors.surface }, headerTintColor: Colors.text, headerTitleStyle: { fontWeight: '700' } }} />
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {([
            { key: 'stats' as const, label: 'Dashboard', icon: 'bar-chart' },
            { key: 'users' as const, label: 'Usuários', icon: 'people' },
            { key: 'coupons' as const, label: 'Cupons', icon: 'pricetag' },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {loading && !refreshing ? (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : activeTab === 'stats' && stats ? (
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>Visão Geral</Text>
              <View style={styles.statsGrid}>
                {[
                  { icon: 'people', color: Colors.primary, num: stats.users.total, label: 'Usuários' },
                  { icon: 'checkmark-circle', color: Colors.success, num: stats.users.active, label: 'Ativos' },
                  { icon: 'server', color: Colors.secondary, num: stats.containers.total, label: 'Containers' },
                  { icon: 'wallet', color: Colors.coins, num: stats.coins.total, label: 'Coins Total' },
                ].map((s, i) => (
                  <View key={i} style={[styles.statCard, { borderLeftColor: s.color }]}>
                    <Ionicons name={s.icon as any} size={22} color={s.color} />
                    <Text style={styles.statNum}>{s.num}</Text>
                    <Text style={styles.statLbl}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Containers</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rodando</Text>
                  <Text style={[styles.infoValue, { color: Colors.success }]}>{stats.containers.running}</Text>
                </View>
                {stats.containers.byStatus.map((s) => (
                  <View key={s.status} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{s.status}</Text>
                    <Text style={styles.infoValue}>{s.count}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Planos</Text>
              <View style={styles.infoCard}>
                {stats.users.byPlan.map((p) => (
                  <View key={p.plan} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{p.plan.toUpperCase()}</Text>
                    <Text style={styles.infoValue}>{p.count} users</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Recursos em Uso</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>RAM Total</Text>
                  <Text style={styles.infoValue}>{stats.resources.ram} MB</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Storage Total</Text>
                  <Text style={styles.infoValue}>{stats.resources.storage} MB</Text>
                </View>
              </View>
            </View>

          ) : activeTab === 'users' ? (
            <View style={styles.content}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar username ou email..."
                  placeholderTextColor={Colors.textMuted}
                  value={userSearch}
                  onChangeText={setUserSearch}
                  onSubmitEditing={loadUsers}
                  returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={loadUsers}>
                  <Ionicons name="search" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.resultCount}>{users.length} usuário(s)</Text>
              {users.map((u) => (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{u.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{u.username}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                    <View style={[styles.planPill, { backgroundColor: u.plan === 'pro' ? '#f3e8ff' : u.plan === 'basic' ? '#dbeafe' : '#f1f5f9' }]}>
                      <Text style={[styles.planPillText, { color: u.plan === 'pro' ? Colors.secondary : u.plan === 'basic' ? Colors.primary : Colors.textSecondary }]}>
                        {u.plan.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.userMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="wallet" size={14} color={Colors.coins} />
                      <Text style={styles.metaText}>{u.coins} coins</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="server" size={14} color={Colors.primary} />
                      <Text style={styles.metaText}>{u.containerCount} containers</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name={u.isActive ? 'checkmark-circle' : 'close-circle'} size={14} color={u.isActive ? Colors.success : Colors.error} />
                      <Text style={styles.metaText}>{u.isActive ? 'Ativo' : 'Inativo'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name={u.emailVerified ? 'mail' : 'mail-unread'} size={14} color={u.emailVerified ? Colors.success : Colors.textMuted} />
                      <Text style={styles.metaText}>{u.emailVerified ? 'Verificado' : 'Não verif.'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

          ) : activeTab === 'coupons' ? (
            <View style={styles.content}>
              <TouchableOpacity style={styles.createCouponBtn} onPress={() => setShowCreateCoupon(true)}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createCouponBtnText}>Criar Cupom</Text>
              </TouchableOpacity>

              {coupons.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Ionicons name="pricetag-outline" size={48} color={Colors.textMuted} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textMuted, marginTop: 12 }}>Nenhum cupom</Text>
                </View>
              ) : (
                coupons.map((coupon) => (
                  <View key={coupon.id} style={styles.couponCard}>
                    <View style={styles.couponHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="pricetag" size={18} color={coupon.active ? Colors.success : Colors.error} />
                        <Text style={styles.couponCode}>{coupon.code}</Text>
                      </View>
                      <View style={[styles.activePill, { backgroundColor: coupon.active ? '#dcfce7' : '#fef2f2' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: coupon.active ? Colors.success : Colors.error }}>
                          {coupon.active ? 'Ativo' : 'Inativo'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.couponMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="wallet" size={14} color={Colors.coins} />
                        <Text style={styles.metaText}>{coupon.coins} coins</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="people" size={14} color={Colors.primary} />
                        <Text style={styles.metaText}>{coupon.used_count}/{coupon.max_uses || '∞'} usos</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="stats-chart" size={14} color={Colors.secondary} />
                        <Text style={styles.metaText}>{coupon.total_coins_given} distribuídos</Text>
                      </View>
                    </View>
                    {coupon.expires_at && (
                      <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
                        Expira: {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                      </Text>
                    )}
                    {coupon.active && (
                      <TouchableOpacity style={styles.deactivateBtn} onPress={() => handleDeactivateCoupon(coupon.id, coupon.code)}>
                        <Ionicons name="close-circle" size={16} color={Colors.error} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.error }}>Desativar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          ) : null}
          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Create Coupon Modal */}
        <Modal visible={showCreateCoupon} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Criar Cupom</Text>
                <TouchableOpacity onPress={() => setShowCreateCoupon(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Código *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="MOZHOST100"
                  placeholderTextColor={Colors.textMuted}
                  value={couponForm.code}
                  onChangeText={(v) => setCouponForm((p) => ({ ...p, code: v.toUpperCase() }))}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Coins *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="500"
                  placeholderTextColor={Colors.textMuted}
                  value={couponForm.coins}
                  onChangeText={(v) => setCouponForm((p) => ({ ...p, coins: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Máximo de Usos (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ilimitado"
                  placeholderTextColor={Colors.textMuted}
                  value={couponForm.maxUses}
                  onChangeText={(v) => setCouponForm((p) => ({ ...p, maxUses: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Data de Expiração (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="2025-12-31"
                  placeholderTextColor={Colors.textMuted}
                  value={couponForm.expiresAt}
                  onChangeText={(v) => setCouponForm((p) => ({ ...p, expiresAt: v }))}
                />
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>Formato: AAAA-MM-DD</Text>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, creatingCoupon && { opacity: 0.5 }]}
                onPress={handleCreateCoupon}
                disabled={creatingCoupon}>
                {creatingCoupon ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="pricetag" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Criar Cupom</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  lockScreen: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 24 },
  lockCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  lockTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8, marginTop: 16 },
  lockSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, textAlign: 'center' },
  lockInput: { width: '100%', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: Colors.text, backgroundColor: Colors.surfaceVariant, marginBottom: 16 },
  lockBtn: { width: '100%', backgroundColor: Colors.primary, borderRadius: 10, padding: 16, alignItems: 'center' },
  lockBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, gap: 4 },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textSecondary },
  infoCard: { backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.text, backgroundColor: Colors.surfaceVariant },
  searchBtn: { backgroundColor: Colors.primary, borderRadius: 10, padding: 12, justifyContent: 'center' },
  resultCount: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  userCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  planPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planPillText: { fontSize: 11, fontWeight: '700' },
  userMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  createCouponBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success, borderRadius: 10, padding: 14, gap: 8, marginBottom: 16 },
  createCouponBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  couponCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  couponCode: { fontSize: 18, fontWeight: '800', color: Colors.text },
  activePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  couponMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  deactivateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: Colors.text, backgroundColor: Colors.surfaceVariant },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success, borderRadius: 10, padding: 16, gap: 8, marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
