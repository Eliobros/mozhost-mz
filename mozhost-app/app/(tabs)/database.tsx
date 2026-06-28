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
import * as Clipboard from 'expo-clipboard';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

type Database = {
  id: number;
  name: string;
  type: string;
  database_name: string;
  username: string;
  password: string;
  host: string;
  port: number;
  status: string;
  created_at: string;
};

export default function DatabaseScreen() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [copiedField, setCopiedField] = useState('');
  const [formData, setFormData] = useState({
    type: 'mysql',
    name: '',
    database_name: '',
    username: '',
    password: '',
  });

  // Custo em coins — bate com backend/config/constants.js DATABASE_COST_COINS
  const DB_COST_COINS = 5;

  const loadDatabases = useCallback(async () => {
    try {
      const data = await api.get('/databases');
      setDatabases(data.databases || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  const copyToClipboard = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.database_name.trim() || !formData.username.trim() || !formData.password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    setCreating(true);
    try {
      await api.post('/databases', formData);
      setShowCreate(false);
      setFormData({ type: 'mysql', name: '', database_name: '', username: '', password: '' });
      await loadDatabases();
      Alert.alert('Sucesso', 'Database criado com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao criar database');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Deletar Database', `Deletar "${name}"? Esta ação é irreversível.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/databases/${id}`);
            await loadDatabases();
          } catch (err: any) {
            Alert.alert('Erro', err.message || 'Falha ao deletar');
          }
        },
      },
    ]);
  };

  const InfoRow = ({ label, value, field, isPassword }: { label: string; value: string; field: string; isPassword?: boolean }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue} numberOfLines={1}>
          {isPassword && !showPasswords[Number(field.split('-')[0])] ? '••••••••' : value}
        </Text>
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPasswords((prev) => ({ ...prev, [Number(field.split('-')[0])]: !prev[Number(field.split('-')[0])] }))}>
            <Ionicons name={showPasswords[Number(field.split('-')[0])] ? 'eye-off' : 'eye'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => copyToClipboard(value, field)}>
          <Ionicons name={copiedField === field ? 'checkmark' : 'copy'} size={18} color={copiedField === field ? Colors.success : Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{databases.length} database(s)</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDatabases(); }} />}>
        {databases.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum database</Text>
            <Text style={styles.emptySubtitle}>Crie seu primeiro database</Text>
          </View>
        ) : (
          databases.map((db) => (
            <View key={db.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="layers" size={20} color={Colors.secondary} />
                  <Text style={styles.cardName}>{db.name}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(db.id, db.name)}>
                  <Ionicons name="trash" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
              {(db.containers && db.containers.length > 0) && (
                <View style={styles.linkedRow}>
                  <Ionicons name="link" size={12} color={Colors.textMuted} />
                  <Text style={styles.linkedLabel}>Vinculado a:</Text>
                  {db.containers.map((c, i) => (
                    <View key={i} style={styles.linkedTag}>
                      <Text style={styles.linkedTagText}>{typeof c === 'string' ? c : c.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              <InfoRow label="Host" value={db.host} field={`${db.id}-host`} />
              <InfoRow label="Porta" value={String(db.port)} field={`${db.id}-port`} />
              <InfoRow label="Database" value={db.database_name} field={`${db.id}-dbname`} />
              <InfoRow label="Usuário" value={db.username} field={`${db.id}-user`} />
              <InfoRow label="Senha" value={db.password} field={`${db.id}-pass`} isPassword />
              {db.connection_string && (
                <View style={styles.connRow}>
                  <View style={styles.connHeader}>
                    <Text style={styles.connLabel}>Connection string</Text>
                    <TouchableOpacity onPress={() => copyToClipboard(db.connection_string, `${db.id}-conn`)}>
                      <Ionicons name={copiedField === `${db.id}-conn` ? 'checkmark' : 'copy'} size={14} color={copiedField === `${db.id}-conn` ? Colors.success : Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.connValue} numberOfLines={2}>{db.connection_string}</Text>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Database</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome</Text>
                <TextInput style={styles.formInput} placeholder="meu-db" placeholderTextColor={Colors.textMuted} value={formData.name} onChangeText={(v) => setFormData((p) => ({ ...p, name: v }))} autoCapitalize="none" />
              </View>
              
              <View style={styles.formGroup}>
  <Text style={styles.formLabel}>Tipo</Text>
  <View style={styles.typeSelector}>
    {(['mysql', 'mariadb', 'postgres', 'mongodb', 'redis'] as const).map((t) => (
      <TouchableOpacity
        key={t}
        style={[styles.typeBtn, formData.type === t && styles.typeBtnActive]}
        onPress={() => setFormData((p) => ({ ...p, type: t }))}
      >
        <Text style={[styles.typeBtnText, formData.type === t && styles.typeBtnTextActive]}>
          {t}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome do Database</Text>
                <TextInput style={styles.formInput} placeholder="meubanco" placeholderTextColor={Colors.textMuted} value={formData.database_name} onChangeText={(v) => setFormData((p) => ({ ...p, database_name: v }))} autoCapitalize="none" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Usuário</Text>
                <TextInput style={styles.formInput} placeholder="usuario" placeholderTextColor={Colors.textMuted} value={formData.username} onChangeText={(v) => setFormData((p) => ({ ...p, username: v }))} autoCapitalize="none" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Senha</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="senha" placeholderTextColor={Colors.textMuted} value={formData.password} onChangeText={(v) => setFormData((p) => ({ ...p, password: v }))} autoCapitalize="none" />
                  <TouchableOpacity style={styles.genBtn} onPress={generatePassword}>
                    <Ionicons name="key" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cost preview */}
              <View style={styles.costBox}>
                <Text style={styles.costText}>Custo: {DB_COST_COINS} coins</Text>
                <Text style={styles.costHint}>Será descontado do seu saldo</Text>
              </View>

              <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.5 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Criar Database</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceVariant },
typeBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },  typeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeBtnTextActive: { color: '#fff' },
  costBox: { backgroundColor: Colors.surfaceVariant, padding: 12, borderRadius: 10, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  costHint: { fontSize: 12, color: Colors.textMuted },
  linkedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  linkedLabel: { fontSize: 12, color: Colors.textMuted, marginRight: 4 },
  linkedTag: { backgroundColor: Colors.surfaceVariant, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  linkedTagText: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  connRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  connHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  connLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  connValue: { fontSize: 12, fontFamily: 'monospace', color: Colors.text, backgroundColor: Colors.surfaceVariant, padding: 8, borderRadius: 6 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, width: 70 },
  infoValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  infoValue: { fontSize: 13, fontWeight: '500', color: Colors.text, maxWidth: 180 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: Colors.text, backgroundColor: Colors.surfaceVariant },
  genBtn: { justifyContent: 'center', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.surfaceVariant },
  createBtn: { backgroundColor: Colors.secondary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
