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
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

type Subscription = {
  hasSubscription: boolean;
  subscriptionId?: number;
  expiresAt?: string;
  daysLeft?: number;
  expired: boolean;
  expiringSoon: boolean;
  status?: string;
};

type Container = {
  id: number;
  name: string;
  status: string;
  type: string;
  domain?: string;
  port?: number;
  ram_mb?: number;
  storage_used_mb?: number;
  max_storage_mb?: number;
  created_at: string;
  updated_at: string;
  subscription?: Subscription;
};

type ContainerStats = {
  cpu: number;
  memory: {
    used: number;
    limit: number;
    percent: number;
  };
};

const RENEW_COST = 500;

export default function ContainersScreen() {
  const router = useRouter();
  const [containers, setContainers] = useState<Container[]>([]);
  const [coins, setCoins] = useState(0);
  const [storageAlerts, setStorageAlerts] = useState<any[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, ContainerStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'nodejs',
    template: 'api',
    environment: {} as Record<string, string>,
  });

  // Upgrade storage
  const [upgradeTarget, setUpgradeTarget] = useState<Container | null>(null);
  const [addMb, setAddMb] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  const loadContainers = useCallback(async () => {
    try {
      const data = await api.get('/containers');
      setContainers(data.containers || []);
      setCoins(data.coins || 0);
      setStorageAlerts(Array.isArray(data.storageAlerts) ? data.storageAlerts : []);
      loadStats();
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get('/containers/stats/all');
      if (data.stats) {
        const map: Record<number, ContainerStats> = {};
        data.stats.forEach((s: any) => {
          map[s.id] = s.stats;
        });
        setStatsMap(map);
      }
    } catch {
      // stats são opcionais
    }
  }, []);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  // Recarrega ao voltar para a aba (ex: depois de comprar coins em /coins)
  useFocusEffect(
    useCallback(() => {
      loadContainers();
    }, [loadContainers])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadContainers();
  };

  const insufficientCoinsAlert = (needed: number, have: number) => {
    Alert.alert(
      'Coins insuficientes',
      `Você tem ${have} coins e precisa de ${needed}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Comprar Coins', onPress: () => router.push('/coins') },
      ]
    );
  };

  const handleAction = async (id: number, action: string) => {
    const labels: Record<string, string> = {
      start: 'Iniciar',
      stop: 'Parar',
      restart: 'Reiniciar',
    };
    setActionLoading((prev) => ({ ...prev, [id]: action }));
    try {
      await api.post(`/containers/${id}/${action}`);
      await loadContainers();
    } catch (err: any) {
      if (err.status === 402) {
        insufficientCoinsAlert(err.needed, err.have);
      } else {
        Alert.alert('Erro', err.message || `Falha ao ${labels[action] || action}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const handleRenew = (container: Container) => {
    Alert.alert(
      'Renovar Container',
      `Renovar "${container.name}" por mais 30 dias custará ${RENEW_COST} coins. Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Renovar',
          onPress: async () => {
            setActionLoading((prev) => ({ ...prev, [container.id]: 'renewing' }));
            try {
              const data = await api.post(`/containers/${container.id}/renew`);
              setCoins(data.coins);
              await loadContainers();
              Alert.alert(
                '✅ Container renovado!',
                `Nova expiração: ${new Date(data.expiresAt).toLocaleDateString('pt-MZ')}`
              );
            } catch (err: any) {
              if (err.status === 402) {
                insufficientCoinsAlert(err.needed, err.have);
              } else {
                Alert.alert('Erro', err.message || err.error || 'Falha ao renovar container');
              }
            } finally {
              setActionLoading((prev) => ({ ...prev, [container.id]: '' }));
            }
          },
        },
      ]
    );
  };

  const handleUpgradeStorage = (container: Container) => {
    setUpgradeTarget(container);
    setAddMb('');
  };

  const confirmUpgrade = async () => {
    const mb = parseInt(addMb, 10);
    if (isNaN(mb) || mb < 100 || mb > 10240) {
      Alert.alert('Valor inválido', 'Informe um valor entre 100 e 10240 MB.');
      return;
    }
    if (!upgradeTarget || upgrading) return;
    setUpgrading(true);
    try {
      const data = await api.post(`/containers/${upgradeTarget.id}/upgrade-storage`, { addMb: mb });
      setUpgradeTarget(null);
      setCoins(data.coins);
      await loadContainers();
      Alert.alert(
        '✅ Armazenamento atualizado!',
        `Novo limite: ${data.maxStorageMb} MB. Coins restantes: ${data.coins}.`
      );
    } catch (err: any) {
      if (err.status === 402) {
        insufficientCoinsAlert(err.needed, err.have);
      } else {
        Alert.alert('Erro', err.message || err.error || 'Falha no upgrade de armazenamento');
      }
    } finally {
      setUpgrading(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Deletar Container',
      `Tem certeza que deseja deletar "${name}"? Esta ação é irreversível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/containers/${id}`);
              await loadContainers();
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao deletar');
            }
          },
        },
      ]
    );
  };

  const needsToken =
    createForm.template === 'bot-telegram' || createForm.template === 'bot-discord';
  const tokenKey = needsToken
    ? createForm.template === 'bot-telegram'
      ? 'TELEGRAM_BOT_TOKEN'
      : 'DISCORD_BOT_TOKEN'
    : '';
  const hasToken = !!(createForm.environment[tokenKey] || '').trim();

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Erro', 'Insira um nome para o container');
      return;
    }
    if (needsToken && !hasToken) {
      Alert.alert(
        'Token necessário',
        createForm.template === 'bot-telegram'
          ? 'Crie seu bot com @BotFather no Telegram e informe o token.'
          : 'Gere o token no Discord Developer Portal e informe.'
      );
      return;
    }
    if (isCreating) return;
    setIsCreating(true);
    try {
      await api.post('/containers', createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'nodejs', template: 'api', environment: {} });
      await loadContainers();
      Alert.alert('Sucesso', 'Container criado com sucesso!');
    } catch (err: any) {
      if (err.status === 402) {
        insufficientCoinsAlert(err.needed, err.have);
      } else {
        Alert.alert('Erro', err.message || err.error || 'Falha ao criar container');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return Colors.statusRunning;
      case 'stopped': return Colors.statusStopped;
      case 'building': return Colors.statusBuilding;
      case 'error': return Colors.statusError;
      default: return Colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return 'play-circle';
      case 'stopped': return 'stop-circle';
      case 'building': return 'hammer';
      case 'error': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const statBarColor = (value: number) => {
    if (value > 80) return Colors.error;
    if (value > 50) return Colors.warning;
    return Colors.success;
  };

  const filtered = containers.filter((c) => filter === 'all' || c.status === filter);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with coins */}
      <View style={styles.headerBar}>
        <View style={styles.coinsBadge}>
          <Ionicons name="wallet" size={16} color={Colors.coins} />
          <Text style={styles.coinsText}>{coins} coins</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.buyBtn} onPress={() => router.push('/coins')}>
            <Ionicons name="cart" size={16} color="#fff" />
            <Text style={styles.buyBtnText}>Coins</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Novo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Storage Alerts */}
      {storageAlerts.length > 0 && (
        <View style={styles.alertBanner}>
          <View style={styles.alertBannerHeader}>
            <Ionicons name="warning" size={18} color="#c2410c" />
            <Text style={styles.alertBannerTitle}>Armazenamento quase cheio</Text>
          </View>
          {storageAlerts.map((a) => (
            <Text key={a.id} style={styles.alertBannerText}>
              • {a.name}: {a.usedMB}MB de {a.maxMB}MB usados. Considere fazer upgrade.
            </Text>
          ))}
        </View>
      )}

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['all', 'running', 'stopped', 'building', 'error'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Container List */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="server-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum container encontrado</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all' ? 'Tente outro filtro' : 'Crie seu primeiro container'}
            </Text>
          </View>
        ) : (
          filtered.map((container) => {
            const sub = container.subscription;
            const stats = statsMap[container.id];
            return (
              <View key={container.id} style={styles.card}>
                {/* Subscription banners */}
                {sub?.expired && (
                  <View style={styles.subExpired}>
                    <Ionicons name="alert-circle" size={16} color="#fff" />
                    <Text style={styles.subExpiredText}>Expirado — Recarregue {RENEW_COST} coins</Text>
                    <TouchableOpacity
                      style={styles.subRenewBtn}
                      onPress={() => handleRenew(container)}
                      disabled={actionLoading[container.id] === 'renewing'}>
                      {actionLoading[container.id] === 'renewing' ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Text style={styles.subRenewBtnText}>Renovar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {sub?.expiringSoon && !sub?.expired && (
                  <View style={styles.subExpiring}>
                    <Ionicons name="time" size={16} color="#fff" />
                    <Text style={styles.subExpiringText}>
                      Expira em {sub.daysLeft} {sub.daysLeft === 1 ? 'dia' : 'dias'} — Renove agora!
                    </Text>
                    <TouchableOpacity
                      style={styles.subRenewBtnYellow}
                      onPress={() => handleRenew(container)}
                      disabled={actionLoading[container.id] === 'renewing'}>
                      {actionLoading[container.id] === 'renewing' ? (
                        <ActivityIndicator size="small" color="#b45309" />
                      ) : (
                        <Text style={styles.subRenewBtnYellowText}>Renovar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons
                      name={getStatusIcon(container.status) as any}
                      size={20}
                      color={getStatusColor(container.status)}
                    />
                    <Text style={styles.cardName}>{container.name}</Text>
                  </View>
                  <View
                    style={[styles.statusPill, { backgroundColor: getStatusColor(container.status) + '20' }]}>
                    <Text style={[styles.statusPillText, { color: getStatusColor(container.status) }]}>
                      {container.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Tipo</Text>
                    <Text style={styles.infoValue}>{container.type}</Text>
                  </View>
                  {container.domain && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Domínio</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {container.domain}
                      </Text>
                    </View>
                  )}
                  {container.port != null && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Porta</Text>
                      <Text style={styles.infoValue}>{container.port}</Text>
                    </View>
                  )}
                  {container.ram_mb != null && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>RAM</Text>
                      <Text style={styles.infoValue}>{container.ram_mb}MB</Text>
                    </View>
                  )}
                  {container.storage_used_mb != null && container.max_storage_mb != null && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Storage</Text>
                      <Text style={styles.infoValue}>
                        {container.storage_used_mb}MB / {container.max_storage_mb}MB
                      </Text>
                    </View>
                  )}
                  {sub?.daysLeft != null && !sub?.expired && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Expira em</Text>
                      <Text style={[styles.infoValue, sub.expiringSoon && { color: Colors.warning }]}>
                        {sub.daysLeft} {sub.daysLeft === 1 ? 'dia' : 'dias'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Métricas CPU/RAM */}
                {container.status === 'running' && stats && (
                  <View style={styles.metricsBox}>
                    <Text style={styles.metricsTitle}>📊 Métricas</Text>
                    <View style={styles.metricRow}>
                      <View style={styles.metricHeader}>
                        <Text style={styles.metricLabel}>CPU</Text>
                        <Text style={styles.metricValue}>{(stats.cpu ?? 0).toFixed(1)}%</Text>
                      </View>
                      <View style={styles.metricTrack}>
                        <View
                          style={[
                            styles.metricFill,
                            {
                              width: `${Math.min(stats.cpu || 0, 100)}%`,
                              backgroundColor: statBarColor(stats.cpu || 0),
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricHeader}>
                        <Text style={styles.metricLabel}>RAM</Text>
                        <Text style={styles.metricValue}>
                          {((stats.memory?.used || 0) / 1024 / 1024).toFixed(0)}MB /{' '}
                          {((stats.memory?.limit || 0) / 1024 / 1024).toFixed(0)}MB
                        </Text>
                      </View>
                      <View style={styles.metricTrack}>
                        <View
                          style={[
                            styles.metricFill,
                            {
                              width: `${Math.min(stats.memory?.percent || 0, 100)}%`,
                              backgroundColor: statBarColor(stats.memory?.percent || 0),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.cardActions}>
                  {container.status === 'stopped' || container.status === 'error' ? (
                    <TouchableOpacity
                      style={[styles.actionChip, { backgroundColor: '#dcfce7' }]}
                      onPress={() => handleAction(container.id, 'start')}
                      disabled={!!actionLoading[container.id]}>
                      {actionLoading[container.id] === 'start' ? (
                        <ActivityIndicator size="small" color={Colors.success} />
                      ) : (
                        <>
                          <Ionicons name="play" size={16} color={Colors.success} />
                          <Text style={[styles.actionChipText, { color: Colors.success }]}>Iniciar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  {container.status === 'running' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionChip, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleAction(container.id, 'stop')}
                        disabled={!!actionLoading[container.id]}>
                        {actionLoading[container.id] === 'stop' ? (
                          <ActivityIndicator size="small" color={Colors.error} />
                        ) : (
                          <>
                            <Ionicons name="stop" size={16} color={Colors.error} />
                            <Text style={[styles.actionChipText, { color: Colors.error }]}>Parar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionChip, { backgroundColor: '#fef3c7' }]}
                        onPress={() => handleAction(container.id, 'restart')}
                        disabled={!!actionLoading[container.id]}>
                        {actionLoading[container.id] === 'restart' ? (
                          <ActivityIndicator size="small" color={Colors.warning} />
                        ) : (
                          <>
                            <Ionicons name="refresh" size={16} color={Colors.warning} />
                            <Text style={[styles.actionChipText, { color: Colors.warning }]}>Reiniciar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.actionChip, { backgroundColor: '#dbeafe' }]}
                    onPress={() => handleUpgradeStorage(container)}>
                    <Ionicons name="hardware-chip" size={16} color={Colors.primary} />
                    <Text style={[styles.actionChipText, { color: Colors.primary }]}>Storage</Text>
                  </TouchableOpacity>

                  {sub?.expired || sub?.expiringSoon ? (
                    <TouchableOpacity
                      style={[styles.actionChip, { backgroundColor: '#fef9c3' }]}
                      onPress={() => handleRenew(container)}
                      disabled={actionLoading[container.id] === 'renewing'}>
                      {actionLoading[container.id] === 'renewing' ? (
                        <ActivityIndicator size="small" color={Colors.coins} />
                      ) : (
                        <>
                          <Ionicons name="refresh-circle" size={16} color={Colors.coins} />
                          <Text style={[styles.actionChipText, { color: '#a16207' }]}>Renovar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.actionChip, { backgroundColor: '#fee2e2' }]}
                    onPress={() => handleDelete(container.id, container.name)}>
                    <Ionicons name="trash" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>

                {/* Tools Row */}
                <View style={styles.cardTools}>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={() => router.push({ pathname: '/terminal', params: { containerId: String(container.id), containerName: container.name } })}>
                    <Ionicons name="terminal" size={16} color={Colors.textSecondary} />
                    <Text style={styles.toolBtnText}>Terminal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={() => router.push({ pathname: '/files', params: { containerId: String(container.id) } })}>
                    <Ionicons name="folder" size={16} color={Colors.textSecondary} />
                    <Text style={styles.toolBtnText}>Arquivos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={() => router.push({ pathname: '/editor', params: { containerId: String(container.id), filePath: 'index.js' } })}>
                    <Ionicons name="code-slash" size={16} color={Colors.textSecondary} />
                    <Text style={styles.toolBtnText}>Editor</Text>
                  </TouchableOpacity>
                  {(container.type === 'bot-baileys' || container.type === 'bot-wwebjs') && (
                    <TouchableOpacity
                      style={styles.toolBtn}
                      onPress={() => router.push({ pathname: '/qrcode', params: { containerId: String(container.id) } })}>
                      <Ionicons name="qr-code" size={16} color={Colors.textSecondary} />
                      <Text style={styles.toolBtnText}>QR Code</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Container</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCost}>Custo: 500 coins</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome do Container *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="meu-bot"
                placeholderTextColor={Colors.textMuted}
                value={createForm.name}
                onChangeText={(v) =>
                  setCreateForm((prev) => ({ ...prev, name: v }))
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                {[
                  { key: 'nodejs', label: 'Node.js', icon: 'logo-nodejs' },
                  { key: 'python', label: 'Python', icon: 'logo-python' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeBtn,
                      createForm.type === t.key && styles.typeBtnActive,
                    ]}
                    onPress={() =>
                      setCreateForm((prev) => ({ ...prev, type: t.key }))
                    }>
                    <Ionicons
                      name={t.icon as any}
                      size={24}
                      color={createForm.type === t.key ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        createForm.type === t.key && { color: Colors.primary },
                      ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Template</Text>
              <View style={styles.typeRow}>
                {[
                  { key: 'api', label: 'API' },
                  { key: 'bot-baileys', label: 'Bot Baileys' },
                  { key: 'bot-wwebjs', label: 'Bot WWebJS' },
                  { key: 'bot-telegram', label: 'Bot Telegram' },
                  { key: 'bot-discord', label: 'Bot Discord' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.templateBtn,
                      createForm.template === t.key && styles.typeBtnActive,
                    ]}
                    onPress={() =>
                      setCreateForm((prev) => {
                        // Mantém apenas o token do template escolhido
                        const env =
                          t.key === 'bot-telegram'
                            ? { TELEGRAM_BOT_TOKEN: prev.environment.TELEGRAM_BOT_TOKEN || '' }
                            : t.key === 'bot-discord'
                              ? { DISCORD_BOT_TOKEN: prev.environment.DISCORD_BOT_TOKEN || '' }
                              : {};
                        return { ...prev, template: t.key, environment: env };
                      })
                    }>
                    <Text
                      style={[
                        styles.templateLabel,
                        createForm.template === t.key && { color: Colors.primary },
                      ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(createForm.template === 'bot-telegram' || createForm.template === 'bot-discord') && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {createForm.template === 'bot-telegram'
                    ? 'Token do Bot do Telegram'
                    : 'Token do Bot do Discord'}
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={createForm.template === 'bot-telegram'
                    ? '123456789:AAHxxxx...'
                    : 'MTIzNDU2Nzg5...'}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  value={createForm.environment[createForm.template === 'bot-telegram' ? 'TELEGRAM_BOT_TOKEN' : 'DISCORD_BOT_TOKEN'] || ''}
                  onChangeText={(v) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      environment: {
                        ...prev.environment,
                        [createForm.template === 'bot-telegram' ? 'TELEGRAM_BOT_TOKEN' : 'DISCORD_BOT_TOKEN']: v,
                      },
                    }))
                  }
                />
                <Text style={styles.tokenHint}>
                  {createForm.template === 'bot-telegram'
                    ? 'Crie com @BotFather no Telegram'
                    : 'Gere no Discord Developer Portal'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.createBtn,
                (isCreating || (needsToken && !hasToken)) && { opacity: 0.5 },
              ]}
              onPress={handleCreate}
              disabled={isCreating || (needsToken && !hasToken)}>
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Criar Container (500 coins)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Upgrade Storage Modal */}
      <Modal visible={!!upgradeTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upgrade de Storage</Text>
              <TouchableOpacity onPress={() => setUpgradeTarget(null)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {upgradeTarget && (
              <>
                <Text style={styles.modalCost}>
                  Container: {upgradeTarget.name} · 1 MB = 1 coin
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Quantos MB adicionar? *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ex: 100"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={addMb}
                    onChangeText={(v) => setAddMb(v.replace(/[^0-9]/g, ''))}
                  />
                  <Text style={styles.fieldHint}>Mínimo 100 MB · Máximo 10240 MB</Text>
                </View>

                {addMb && parseInt(addMb, 10) >= 100 && (
                  <View style={styles.upgradePreview}>
                    <Ionicons name="wallet" size={16} color={Colors.coins} />
                    <Text style={styles.upgradePreviewText}>
                      Custo: <Text style={styles.upgradePreviewStrong}>{addMb} coins</Text> · Saldo atual:{' '}
                      <Text style={styles.upgradePreviewStrong}>{coins} coins</Text>
                    </Text>
                  </View>
                )}

                {parseInt(addMb, 10) > 0 && parseInt(addMb, 10) > coins && (
                  <View style={styles.insufficientBox}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error} />
                    <Text style={styles.insufficientText}>
                      Coins insuficientes. Compre mais coins para continuar.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.createBtn, upgrading && { opacity: 0.5 }]}
                  onPress={confirmUpgrade}
                  disabled={upgrading}>
                  {upgrading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createBtnText}>Confirmar Upgrade</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  coinsText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coins,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  alertBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    padding: 12,
  },
  alertBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  alertBannerTitle: { fontSize: 13, fontWeight: '700', color: '#c2410c' },
  alertBannerText: { fontSize: 12, color: '#9a3412', marginTop: 2 },
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
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
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
    overflow: 'hidden',
  },
  subExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subExpiredText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '700' },
  subRenewBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subRenewBtnText: { color: Colors.error, fontSize: 12, fontWeight: '800' },
  subExpiring: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warning,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subExpiringText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '700' },
  subRenewBtnYellow: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subRenewBtnYellowText: { color: '#b45309', fontSize: 12, fontWeight: '800' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cardInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  infoItem: {},
  infoLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  metricsBox: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  metricsTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  metricRow: { marginBottom: 10 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metricLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  metricValue: { fontSize: 11, color: Colors.text, fontWeight: '700' },
  metricTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  metricFill: { height: 6, borderRadius: 3 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  cardTools: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.surfaceVariant,
  },
  toolBtnText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionChipText: { fontSize: 13, fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalCost: { color: Colors.textSecondary, fontSize: 14, marginBottom: 20 },
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
  fieldHint: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
    gap: 4,
  },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: '#eff6ff' },
  typeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  templateBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
  },
  templateLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tokenHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  upgradePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  upgradePreviewText: { flex: 1, fontSize: 13, color: Colors.text },
  upgradePreviewStrong: { fontWeight: '800', color: Colors.coins },
  insufficientBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  insufficientText: { flex: 1, fontSize: 13, color: '#991b1b', fontWeight: '600' },
});
