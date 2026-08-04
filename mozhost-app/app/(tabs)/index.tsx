import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

type Container = {
  id: number;
  name: string;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
};

export default function DashboardScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [containers, setContainers] = useState<Container[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    stopped: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const [containerData, userData] = await Promise.all([
        api.get('/containers'),
        api.get('/auth/verify'),
      ]);

      const list = containerData.containers || [];
      setContainers(list);
      setCoins(containerData.coins || 0);

      setStats({
        total: list.length,
        running: list.filter((c: Container) => c.status === 'running').length,
        stopped: list.filter((c: Container) => c.status === 'stopped').length,
      });
    } catch {
      // handle silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    refreshUser();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return Colors.statusRunning;
      case 'stopped':
        return Colors.statusStopped;
      case 'building':
        return Colors.statusBuilding;
      default:
        return Colors.textMuted;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Welcome Header */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>
              Olá, {user?.username || 'Usuário'}! 👋
            </Text>
            <Text style={styles.planText}>
              Plano {user?.plan?.toUpperCase() || 'FREE'}
            </Text>
          </View>
          <View style={styles.coinsBadge}>
            <Ionicons name="wallet" size={16} color={Colors.coins} />
            <Text style={styles.coinsText}>{coins}</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
          <Ionicons name="server" size={24} color={Colors.primary} />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
          <Ionicons name="play-circle" size={24} color={Colors.success} />
          <Text style={styles.statNumber}>{stats.running}</Text>
          <Text style={styles.statLabel}>Ativos</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.error }]}>
          <Ionicons name="stop-circle" size={24} color={Colors.error} />
          <Text style={styles.statNumber}>{stats.stopped}</Text>
          <Text style={styles.statLabel}>Parados</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/containers')}>
            <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Novo Container</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/database')}>
            <View style={[styles.actionIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="layers" size={24} color={Colors.secondary} />
            </View>
            <Text style={styles.actionLabel}>Database</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/coins')}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="wallet" size={24} color={Colors.coins} />
            </View>
            <Text style={styles.actionLabel}>Comprar Coins</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Containers Preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Containers</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/containers')}>
            <Text style={styles.seeAll}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {containers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="server-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum container ainda</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/(tabs)/containers')}>
              <Text style={styles.createBtnText}>Criar Primeiro Container</Text>
            </TouchableOpacity>
          </View>
        ) : (
          containers.slice(0, 5).map((container) => (
            <View key={container.id} style={styles.containerItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(container.status) },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.containerName}>{container.name}</Text>
                <Text style={styles.containerType}>{container.type}</Text>
              </View>
              <View style={styles.containerMeta}>
                <Text
                  style={[
                    styles.statusBadge,
                    { color: getStatusColor(container.status) },
                  ]}>
                  {container.status}
                </Text>
                <Text style={styles.timeAgo}>
                  {getTimeAgo(container.updated_at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  welcomeCard: {
    backgroundColor: Colors.gradient.start,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  planText: {
    fontSize: 13,
    color: '#93c5fd',
    marginTop: 2,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  coinsText: {
    color: Colors.coins,
    fontWeight: '700',
    fontSize: 15,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginTop: 12,
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  containerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  containerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  containerType: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  containerMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  timeAgo: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
