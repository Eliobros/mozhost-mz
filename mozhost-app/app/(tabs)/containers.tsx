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
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

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
};

export default function ContainersScreen() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [coins, setCoins] = useState(0);
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
  });

  const loadContainers = useCallback(async () => {
    try {
      const data = await api.get('/containers');
      setContainers(data.containers || []);
      setCoins(data.coins || 0);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContainers();
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
      Alert.alert('Erro', err.message || `Falha ao ${labels[action] || action}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: '' }));
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

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Erro', 'Insira um nome para o container');
      return;
    }
    if (isCreating) return;
    setIsCreating(true);
    try {
      await api.post('/containers', createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'nodejs', template: 'api' });
      await loadContainers();
      Alert.alert('Sucesso', 'Container criado com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || err.error || 'Falha ao criar container');
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
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

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
          filtered.map((container) => (
            <View key={container.id} style={styles.card}>
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
                {container.ram_mb != null && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>RAM</Text>
                    <Text style={styles.infoValue}>{container.ram_mb}MB</Text>
                  </View>
                )}
              </View>

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
                  style={[styles.actionChip, { backgroundColor: '#fee2e2' }]}
                  onPress={() => handleDelete(container.id, container.name)}>
                  <Ionicons name="trash" size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
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
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.templateBtn,
                      createForm.template === t.key && styles.typeBtnActive,
                    ]}
                    onPress={() =>
                      setCreateForm((prev) => ({ ...prev, template: t.key }))
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

            <TouchableOpacity
              style={[styles.createBtn, isCreating && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={isCreating}>
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Criar Container (500 coins)</Text>
              )}
            </TouchableOpacity>
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
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cardInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  infoItem: {},
  infoLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
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
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
