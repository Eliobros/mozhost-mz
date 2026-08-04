import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [coins, setCoins] = useState(0);
  const [stats, setStats] = useState({ total: 0, running: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [redeemingCoupon, setRedeemingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState({ type: '', text: '' });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const loadData = useCallback(async () => {
    try {
      const data = await api.get('/containers');
      const containers = data.containers || [];
      setCoins(data.coins || 0);
      setStats({
        total: containers.length,
        running: containers.filter((c: any) => c.status === 'running').length,
      });
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recarrega saldo ao voltar para a aba (ex: depois de comprar coins em /coins)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage({ type: 'error', text: 'Digite um código de cupom' });
      return;
    }
    setRedeemingCoupon(true);
    setCouponMessage({ type: '', text: '' });
    try {
      const data = await api.post('/coupons/redeem', { code: couponCode.trim() });
      setCouponMessage({ type: 'success', text: `🎉 ${data.message} Novo saldo: ${data.newBalance} coins` });
      setCoins(data.newBalance);
      setCouponCode('');
      setTimeout(() => setCouponMessage({ type: '', text: '' }), 5000);
    } catch (err: any) {
      setCouponMessage({ type: 'error', text: err.message || 'Erro ao resgatar cupom' });
    } finally {
      setRedeemingCoupon(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new,
      });
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setPasswordForm({ current: '', new: '', confirm: '' });
      setTimeout(() => setPasswordMsg({ type: '', text: '' }), 5000);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || err.error || 'Erro ao alterar senha' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const getPlanInfo = (plan: string) => {
    const plans: Record<string, { name: string; icon: string; color: string }> = {
      free: { name: 'Gratuito', icon: 'star', color: Colors.textSecondary },
      basic: { name: 'Básico', icon: 'flash', color: Colors.primary },
      pro: { name: 'Pro', icon: 'diamond', color: Colors.secondary },
    };
    return plans[plan] || plans.free;
  };

  const planInfo = getPlanInfo(user?.plan || 'free');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); refreshUser(); }} />}>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.userName}>{user?.username || 'Usuário'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        <View style={[styles.planBadge, { backgroundColor: planInfo.color + '20' }]}>
          <Ionicons name={planInfo.icon as any} size={16} color={planInfo.color} />
          <Text style={[styles.planBadgeText, { color: planInfo.color }]}>{planInfo.name}</Text>
        </View>
      </View>

      {/* Coins Section */}
      <View style={styles.section}>
        <View style={styles.coinsCard}>
          <View style={styles.coinsHeader}>
            <Ionicons name="wallet" size={24} color={Colors.coins} />
            <Text style={styles.coinsAmount}>{coins}</Text>
            <Text style={styles.coinsLabel}>coins</Text>
          </View>
          <TouchableOpacity
            style={styles.buyCoinsBtn}
            onPress={() => router.push('/coins')}>
            <Ionicons name="cart" size={16} color="#fff" />
            <Text style={styles.buyCoinsBtnText}>Comprar Coins</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Coupon Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resgatar Cupom</Text>
        {couponMessage.text ? (
          <View style={[styles.messageBox, couponMessage.type === 'success' ? styles.successBox : styles.errorBox]}>
            <Ionicons name={couponMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={16} color={couponMessage.type === 'success' ? Colors.success : Colors.error} />
            <Text style={[styles.messageText, { color: couponMessage.type === 'success' ? Colors.success : Colors.error }]}>{couponMessage.text}</Text>
          </View>
        ) : null}
        <View style={styles.couponRow}>
          <TextInput
            style={styles.couponInput}
            placeholder="CÓDIGO"
            placeholderTextColor={Colors.textMuted}
            value={couponCode}
            onChangeText={(v) => setCouponCode(v.toUpperCase())}
            autoCapitalize="characters"
            onSubmitEditing={handleRedeemCoupon}
          />
          <TouchableOpacity style={styles.couponBtn} onPress={handleRedeemCoupon} disabled={redeemingCoupon || !couponCode.trim()}>
            <Ionicons name="pricetag" size={18} color="#fff" />
            <Text style={styles.couponBtnText}>Usar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="server" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Containers</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="play-circle" size={20} color={Colors.success} />
            <Text style={styles.statValue}>{stats.running}</Text>
            <Text style={styles.statLabel}>Ativos</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="hardware-chip" size={20} color={Colors.secondary} />
            <Text style={styles.statValue}>{user?.maxRamMb || 0}MB</Text>
            <Text style={styles.statLabel}>RAM Máx</Text>
          </View>
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações da Conta</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Containers máx</Text>
            <Text style={styles.infoValue}>{user?.maxContainers || 2}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>RAM máx</Text>
            <Text style={styles.infoValue}>{user?.maxRamMb || 0}MB</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage máx</Text>
            <Text style={styles.infoValue}>{user?.maxStorageMb || 0}MB</Text>
          </View>
        </View>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => setShowPasswordSection(!showPasswordSection)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Alterar Senha</Text>
          <Ionicons name={showPasswordSection ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        {showPasswordSection && (
          <View style={styles.infoCard}>
            {passwordMsg.text ? (
              <View style={[styles.messageBox, passwordMsg.type === 'success' ? styles.successBox : styles.errorBox]}>
                <Ionicons name={passwordMsg.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={16} color={passwordMsg.type === 'success' ? Colors.success : Colors.error} />
                <Text style={[styles.messageText, { color: passwordMsg.type === 'success' ? Colors.success : Colors.error }]}>{passwordMsg.text}</Text>
              </View>
            ) : null}
            <TextInput style={styles.couponInput} placeholder="Senha atual" placeholderTextColor={Colors.textMuted} value={passwordForm.current} onChangeText={v => setPasswordForm(p => ({ ...p, current: v }))} secureTextEntry />
            <TextInput style={[styles.couponInput, { marginTop: 10 }]} placeholder="Nova senha" placeholderTextColor={Colors.textMuted} value={passwordForm.new} onChangeText={v => setPasswordForm(p => ({ ...p, new: v }))} secureTextEntry />
            <TextInput style={[styles.couponInput, { marginTop: 10 }]} placeholder="Confirmar nova senha" placeholderTextColor={Colors.textMuted} value={passwordForm.confirm} onChangeText={v => setPasswordForm(p => ({ ...p, confirm: v }))} secureTextEntry />
            <TouchableOpacity
              style={[styles.couponBtn, { marginTop: 12, paddingVertical: 14, justifyContent: 'center', borderRadius: 10 }]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={styles.couponBtnText}>Salvar Nova Senha</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileHeader: { alignItems: 'center', paddingVertical: 32, backgroundColor: Colors.gradient.start },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  userEmail: { fontSize: 14, color: '#93c5fd', marginTop: 4 },
  planBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12, gap: 6 },
  planBadgeText: { fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  coinsCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  coinsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinsAmount: { fontSize: 32, fontWeight: '800', color: Colors.text },
  coinsLabel: { fontSize: 16, color: Colors.textSecondary },
  buyCoinsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
    width: '100%',
  },
  buyCoinsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  messageBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 10, gap: 6 },
  successBox: { backgroundColor: '#f0fdf4' },
  errorBox: { backgroundColor: '#fef2f2' },
  messageText: { fontSize: 13, flex: 1 },
  couponRow: { flexDirection: 'row', gap: 10 },
  couponInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: Colors.text, backgroundColor: Colors.surfaceVariant },
  couponBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, paddingHorizontal: 20, borderRadius: 10, gap: 6 },
  couponBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statItem: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary },
  infoCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
});
