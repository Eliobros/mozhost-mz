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
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';
import * as WebBrowser from 'expo-web-browser';

type GitHubStatus = {
  connected: boolean;
  github_username: string;
};

type GitHubRepo = {
  id: number;
  full_name: string;
  html_url: string;
  default_branch: string;
  description: string;
};

type Container = {
  id: number;
  name: string;
  status: string;
  type: string;
  repo_url?: string;
  repo_name?: string;
  repo_branch?: string;
};

export default function ConnectionsScreen() {
  const [ghStatus, setGhStatus] = useState<GitHubStatus | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Pickers
  const [showContainerPicker, setShowContainerPicker] = useState(false);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branch, setBranch] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get('/github/status');
      setGhStatus(data);
    } catch {
      setGhStatus({ connected: false, github_username: '' });
    }
  }, []);

  const loadContainers = useCallback(async () => {
    try {
      const data = await api.get('/containers');
      setContainers(data.containers || []);
    } catch {
      // ignore
    }
  }, []);

  const loadRepos = useCallback(async () => {
    try {
      const data = await api.get('/github/repos');
      setRepos(data.repos || []);
    } catch {
      // ignore
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStatus(), loadContainers()]);
    setLoading(false);
  }, [loadStatus, loadContainers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (ghStatus?.connected) {
      loadRepos();
    }
  }, [ghStatus?.connected, loadRepos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStatus(), loadContainers(), loadRepos()]);
    setRefreshing(false);
  };

  const handleConnectGitHub = async () => {
    try {
      const data = await api.get('/github/auth');
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        await loadStatus();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.error || 'Falha ao conectar GitHub');
    }
  };

  const handleDisconnectGitHub = () => {
    Alert.alert(
      'Desconectar GitHub',
      'Tem certeza que deseja desconectar sua conta do GitHub?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/github/disconnect');
              setGhStatus({ connected: false, github_username: '' });
              setRepos([]);
              setSelectedRepo(null);
            } catch (e: any) {
              Alert.alert('Erro', e.error || 'Falha ao desconectar');
            }
          },
        },
      ]
    );
  };

  const handleSelectContainer = (container: Container) => {
    setSelectedContainer(container);
    setShowContainerPicker(false);
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setBranch(repo.default_branch);
    setShowRepoPicker(false);
  };

  const handleConnectRepo = async () => {
    if (!selectedContainer || !selectedRepo) return;
    setConnecting(true);
    try {
      await api.post('/github/connect', {
        container_id: selectedContainer.id,
        repo_url: selectedRepo.html_url,
        repo_name: selectedRepo.full_name,
        branch: branch || selectedRepo.default_branch,
      });
      Alert.alert('Sucesso', 'Repositório conectado com sucesso!');
      setSelectedContainer(null);
      setSelectedRepo(null);
      setBranch('');
      await loadContainers();
    } catch (e: any) {
      Alert.alert('Erro', e.error || 'Falha ao conectar repositório');
    } finally {
      setConnecting(false);
    }
  };

  const connectedContainers = containers.filter((c) => c.repo_url || c.repo_name);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Conexões', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Conexões', headerShown: true }} />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* GitHub Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTA GITHUB</Text>
          <View style={styles.card}>
            {ghStatus?.connected ? (
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Ionicons name="logo-github" size={24} color={Colors.text} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusText}>{ghStatus.github_username}</Text>
                    <View style={styles.connectedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.connectedText}>Conectado</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnectGitHub}>
                  <Text style={styles.disconnectBtnText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.notConnected}>
                <Ionicons name="logo-github" size={40} color={Colors.textMuted} />
                <Text style={styles.notConnectedText}>GitHub não conectado</Text>
                <Text style={styles.notConnectedSubtext}>
                  Conecte sua conta para vincular repositórios aos containers
                </Text>
                <TouchableOpacity style={styles.connectBtn} onPress={handleConnectGitHub}>
                  <Ionicons name="logo-github" size={20} color="#fff" />
                  <Text style={styles.connectBtnText}>Conectar GitHub</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Connect Repository Section */}
        {ghStatus?.connected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONECTAR REPOSITÓRIO</Text>
            <View style={styles.card}>
              {/* Container picker */}
              <Text style={styles.fieldLabel}>Container</Text>
              <TouchableOpacity
                style={styles.pickerBar}
                onPress={() => setShowContainerPicker(true)}
              >
                <Ionicons name="cube-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.pickerText}>
                  {selectedContainer ? selectedContainer.name : 'Selecionar container...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Repo picker */}
              {selectedContainer && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Repositório</Text>
                  <TouchableOpacity
                    style={styles.pickerBar}
                    onPress={() => setShowRepoPicker(true)}
                  >
                    <Ionicons name="git-branch-outline" size={20} color={Colors.textSecondary} />
                    <Text style={styles.pickerText}>
                      {selectedRepo ? selectedRepo.full_name : 'Selecionar repositório...'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}

              {/* Branch input */}
              {selectedRepo && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Branch</Text>
                  <TextInput
                    style={styles.branchInput}
                    value={branch}
                    onChangeText={setBranch}
                    placeholder="main"
                    placeholderTextColor={Colors.textMuted}
                  />
                </>
              )}

              {/* Connect button */}
              {selectedContainer && selectedRepo && (
                <TouchableOpacity
                  style={[styles.connectRepoBtn, connecting && { opacity: 0.6 }]}
                  onPress={handleConnectRepo}
                  disabled={connecting}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="link" size={18} color="#fff" />
                      <Text style={styles.connectRepoBtnText}>Conectar Repositório</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Connected Repos List */}
        {connectedContainers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REPOSITÓRIOS CONECTADOS</Text>
            <View style={styles.card}>
              {connectedContainers.map((c, i) => (
                <View
                  key={c.id}
                  style={[
                    styles.connectedRepoRow,
                    i < connectedContainers.length - 1 && styles.connectedRepoRowBorder,
                  ]}
                >
                  <View style={styles.connectedRepoIcon}>
                    <Ionicons name="git-branch" size={18} color="#f97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.connectedRepoName}>{c.name}</Text>
                    <Text style={styles.connectedRepoDetail}>
                      {c.repo_name || c.repo_url}
                    </Text>
                    {c.repo_branch && (
                      <Text style={styles.connectedRepoBranch}>
                        <Ionicons name="git-branch-outline" size={12} color={Colors.textMuted} />{' '}
                        {c.repo_branch}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Container Picker Modal */}
      <Modal visible={showContainerPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Container</Text>
              <TouchableOpacity onPress={() => setShowContainerPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {containers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.containerOption,
                    selectedContainer?.id === c.id && styles.containerOptionActive,
                  ]}
                  onPress={() => handleSelectContainer(c)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: c.status === 'running' ? Colors.success : Colors.error },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.containerName}>{c.name}</Text>
                    <Text style={styles.containerType}>
                      {c.type} • {c.status}
                    </Text>
                  </View>
                  {selectedContainer?.id === c.id && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Repo Picker Modal */}
      <Modal visible={showRepoPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Repositório</Text>
              <TouchableOpacity onPress={() => setShowRepoPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {repos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>Nenhum repositório</Text>
                  <Text style={styles.emptySubtitle}>
                    Nenhum repositório encontrado na sua conta GitHub
                  </Text>
                </View>
              ) : (
                repos.map((repo) => (
                  <TouchableOpacity
                    key={repo.id}
                    style={[
                      styles.containerOption,
                      selectedRepo?.id === repo.id && styles.containerOptionActive,
                    ]}
                    onPress={() => handleSelectRepo(repo)}
                  >
                    <Ionicons name="logo-github" size={20} color={Colors.text} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.containerName}>{repo.full_name}</Text>
                      {repo.description ? (
                        <Text style={styles.containerType} numberOfLines={1}>
                          {repo.description}
                        </Text>
                      ) : null}
                      <Text style={styles.containerType}>branch: {repo.default_branch}</Text>
                    </View>
                    {selectedRepo?.id === repo.id && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // GitHub status
  statusRow: { gap: 12 },
  statusInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  connectedText: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  disconnectBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  disconnectBtnText: { fontSize: 14, fontWeight: '600', color: Colors.error },

  // Not connected
  notConnected: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  notConnectedText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  notConnectedSubtext: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#24292e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 8,
  },
  connectBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Field
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },

  // Picker bar
  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerText: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },

  // Branch input
  branchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surfaceVariant,
  },

  // Connect repo button
  connectRepoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  connectRepoBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Connected repos
  connectedRepoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  connectedRepoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  connectedRepoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f9731615',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedRepoName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  connectedRepoDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  connectedRepoBranch: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Modal (same pattern as files.tsx)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },

  containerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 12,
    marginBottom: 4,
  },
  containerOptionActive: { backgroundColor: '#eff6ff' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  containerName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  containerType: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
