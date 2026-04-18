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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

type FileItem = {
  name: string;
  type: 'file' | 'directory';
  size: number;
  path: string;
  modified?: string;
};

type Container = {
  id: number;
  name: string;
  status: string;
  type: string;
};

export default function FilesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ containerId?: string }>();

  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);

  // Modals
  const [showContainerPicker, setShowContainerPicker] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState({
    title: '',
    placeholder: '',
    defaultValue: '',
    onSubmit: (_v: string) => {},
  });
  const [inputValue, setInputValue] = useState('');

  // FAB
  const [showFab, setShowFab] = useState(false);

  const loadContainers = useCallback(async () => {
    try {
      const data = await api.get('/containers');
      const list = data.containers || [];
      setContainers(list);
      if (params.containerId) {
        const found = list.find((c: Container) => String(c.id) === params.containerId);
        if (found) setSelectedContainer(found);
        else if (list.length) setSelectedContainer(list[0]);
      } else if (list.length && !selectedContainer) {
        setSelectedContainer(list[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [params.containerId]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  const loadFiles = useCallback(async (path = '') => {
    if (!selectedContainer) return;
    try {
      const data = await api.get(`/files/${selectedContainer.id}?path=${encodeURIComponent(path)}`);
      if (data.type === 'directory') {
        setFiles(data.items || []);
      }
    } catch {
      setFiles([]);
    } finally {
      setRefreshing(false);
    }
  }, [selectedContainer]);

  useEffect(() => {
    if (selectedContainer) {
      setCurrentPath('');
      loadFiles('');
    }
  }, [selectedContainer]);

  useEffect(() => {
    if (selectedContainer) {
      loadFiles(currentPath);
    }
  }, [currentPath, selectedContainer, loadFiles]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFiles(currentPath);
  };

  const navigateTo = (path: string) => {
    clearSelection();
    setCurrentPath(path);
  };

  const goBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo(parts.join('/'));
  };

  // File actions
  const handleFilePress = (file: FileItem) => {
    if (selectionMode) {
      toggleSelection(file);
      return;
    }
    if (file.type === 'directory') {
      navigateTo(file.path);
    } else {
      router.push({
        pathname: '/editor',
        params: { containerId: String(selectedContainer!.id), filePath: file.path },
      });
    }
  };

  const handleLongPress = (file: FileItem) => {
    setSelectionMode(true);
    toggleSelection(file);
  };

  // Selection
  const toggleSelection = (file: FileItem) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.path === file.path);
      const next = exists ? prev.filter((f) => f.path !== file.path) : [...prev, file];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectionMode(false);
  };

  const isSelected = (file: FileItem) => selectedFiles.some((f) => f.path === file.path);

  // Input modal helper
  const showInput = (title: string, placeholder: string, defaultValue: string, onSubmit: (v: string) => void) => {
    setInputModalConfig({ title, placeholder, defaultValue, onSubmit });
    setInputValue(defaultValue);
    setShowInputModal(true);
  };

  // CRUD operations
  const handleCreateFile = () => {
    setShowFab(false);
    showInput('Novo Arquivo', 'nome.js', '', async (name) => {
      if (!name.trim()) return;
      try {
        const filePath = currentPath ? `${currentPath}/${name}` : name;
        await api.post(`/files/${selectedContainer!.id}`, { path: filePath, type: 'file', content: '' });
        loadFiles(currentPath);
      } catch (e: any) {
        Alert.alert('Erro', e.error || 'Falha ao criar arquivo');
      }
    });
  };

  const handleCreateFolder = () => {
    setShowFab(false);
    showInput('Nova Pasta', 'nome-da-pasta', '', async (name) => {
      if (!name.trim()) return;
      try {
        const folderPath = currentPath ? `${currentPath}/${name}` : name;
        await api.post(`/files/${selectedContainer!.id}`, { path: folderPath, type: 'directory' });
        loadFiles(currentPath);
      } catch (e: any) {
        Alert.alert('Erro', e.error || 'Falha ao criar pasta');
      }
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Deletar',
      `Deletar ${selectedFiles.length} item(ns)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            for (const file of selectedFiles) {
              try {
                await api.delete(`/files/${selectedContainer!.id}/${file.path}`);
              } catch {}
            }
            clearSelection();
            loadFiles(currentPath);
          },
        },
      ]
    );
  };

  const handleRename = () => {
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    showInput('Renomear', 'novo-nome', file.name, async (newName) => {
      if (!newName.trim() || newName === file.name) return;
      const newPath = currentPath ? `${currentPath}/${newName}` : newName;
      try {
        const token = await (await import('@/services/api')).getToken();
        await fetch(`https://api.mozhost.shop/api/files/${selectedContainer!.id}/${file.path}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ newPath }),
        });
        clearSelection();
        loadFiles(currentPath);
      } catch {
        Alert.alert('Erro', 'Falha ao renomear');
      }
    });
  };

  const handleMove = () => {
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    showInput('Mover para', 'pasta/arquivo.js', file.path, async (newPath) => {
      if (!newPath.trim() || newPath === file.path) return;
      try {
        const token = await (await import('@/services/api')).getToken();
        await fetch(`https://api.mozhost.shop/api/files/${selectedContainer!.id}/${file.path}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ newPath }),
        });
        clearSelection();
        loadFiles(currentPath);
      } catch {
        Alert.alert('Erro', 'Falha ao mover');
      }
    });
  };

  const handleDuplicate = async () => {
    if (selectedFiles.length !== 1 || selectedFiles[0].type === 'directory') return;
    const file = selectedFiles[0];
    try {
      const data = await api.get(`/files/${selectedContainer!.id}?path=${encodeURIComponent(file.path)}`);
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
      const base = file.name.replace(ext, '');
      const newName = `${base}_copia${ext}`;
      const newPath = currentPath ? `${currentPath}/${newName}` : newName;
      await api.post(`/files/${selectedContainer!.id}`, { path: newPath, type: 'file', content: data.content || '' });
      clearSelection();
      loadFiles(currentPath);
    } catch {
      Alert.alert('Erro', 'Falha ao duplicar');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: FileItem): string => {
    if (file.type === 'directory') return 'folder';
    const ext = file.name.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: 'logo-javascript', ts: 'logo-javascript', py: 'logo-python',
      json: 'code-slash', html: 'globe', css: 'color-palette',
      md: 'document-text', yml: 'settings', yaml: 'settings',
      env: 'lock-closed', sh: 'terminal', zip: 'archive',
    };
    return map[ext || ''] || 'document';
  };

  const getFileIconColor = (file: FileItem): string => {
    if (file.type === 'directory') return '#3b82f6';
    const ext = file.name.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: '#f59e0b', ts: '#3b82f6', py: '#22c55e',
      json: '#8b5cf6', html: '#ef4444', css: '#06b6d4',
      zip: '#6366f1',
    };
    return map[ext || ''] || Colors.textSecondary;
  };

  // Breadcrumb parts
  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Arquivos', headerShown: true }} />
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
          title: 'Arquivos',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={() => loadFiles(currentPath)} style={{ marginRight: 8 }}>
              <Ionicons name="refresh" size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Container Picker */}
        <TouchableOpacity style={styles.pickerBar} onPress={() => setShowContainerPicker(true)}>
          <Ionicons name="server" size={18} color={Colors.primary} />
          <Text style={styles.pickerText} numberOfLines={1}>
            {selectedContainer ? `${selectedContainer.name} (${selectedContainer.type})` : 'Selecionar container'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Breadcrumb */}
        {selectedContainer && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumb}>
            <TouchableOpacity onPress={() => navigateTo('')} style={styles.breadcrumbItem}>
              <Ionicons name="home" size={14} color={Colors.primary} />
              <Text style={styles.breadcrumbText}>{selectedContainer.name}</Text>
            </TouchableOpacity>
            {pathParts.map((part, i) => (
              <React.Fragment key={i}>
                <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} style={{ marginHorizontal: 2 }} />
                <TouchableOpacity
                  onPress={() => navigateTo(pathParts.slice(0, i + 1).join('/'))}
                  style={styles.breadcrumbItem}
                >
                  <Text style={[styles.breadcrumbText, i === pathParts.length - 1 && { color: Colors.text, fontWeight: '600' }]}>
                    {part}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ScrollView>
        )}

        {/* Selection Bar */}
        {selectionMode && selectedFiles.length > 0 && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedFiles.length} selecionado(s)</Text>
            <View style={styles.selectionActions}>
              <TouchableOpacity onPress={handleDelete} style={[styles.selectionBtn, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="trash" size={16} color={Colors.error} />
              </TouchableOpacity>
              {selectedFiles.length === 1 && (
                <>
                  <TouchableOpacity onPress={handleRename} style={[styles.selectionBtn, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="pencil" size={16} color={Colors.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleMove} style={[styles.selectionBtn, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="move" size={16} color={Colors.success} />
                  </TouchableOpacity>
                  {selectedFiles[0].type === 'file' && (
                    <TouchableOpacity onPress={handleDuplicate} style={[styles.selectionBtn, { backgroundColor: '#ede9fe' }]}>
                      <Ionicons name="copy" size={16} color={Colors.secondary} />
                    </TouchableOpacity>
                  )}
                </>
              )}
              <TouchableOpacity onPress={clearSelection} style={[styles.selectionBtn, { backgroundColor: Colors.surfaceVariant }]}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* File List */}
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {!selectedContainer ? (
            <View style={styles.emptyState}>
              <Ionicons name="server-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Selecione um container</Text>
            </View>
          ) : (
            <>
              {currentPath !== '' && (
                <TouchableOpacity style={styles.fileRow} onPress={goBack}>
                  <Ionicons name="return-up-back" size={20} color={Colors.textSecondary} />
                  <Text style={[styles.fileName, { color: Colors.textSecondary }]}>.. (voltar)</Text>
                </TouchableOpacity>
              )}

              {files.map((file) => (
                <TouchableOpacity
                  key={file.path}
                  style={[styles.fileRow, isSelected(file) && styles.fileRowSelected]}
                  onPress={() => handleFilePress(file)}
                  onLongPress={() => handleLongPress(file)}
                  delayLongPress={400}
                >
                  {selectionMode && (
                    <Ionicons
                      name={isSelected(file) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected(file) ? Colors.primary : Colors.textMuted}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <View style={[styles.fileIcon, { backgroundColor: getFileIconColor(file) + '15' }]}>
                    <Ionicons name={getFileIcon(file) as any} size={18} color={getFileIconColor(file)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    {file.type === 'file' && (
                      <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
                    )}
                  </View>
                  {file.type === 'directory' && !selectionMode && (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}

              {files.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={64} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>Pasta vazia</Text>
                  <Text style={styles.emptySubtitle}>Toque no + para criar arquivos</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* FAB */}
        {selectedContainer && !selectionMode && (
          <View style={styles.fabContainer}>
            {showFab && (
              <View style={styles.fabMenu}>
                <TouchableOpacity style={styles.fabMenuItem} onPress={handleCreateFile}>
                  <Ionicons name="document-text" size={20} color={Colors.primary} />
                  <Text style={styles.fabMenuText}>Novo Arquivo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fabMenuItem} onPress={handleCreateFolder}>
                  <Ionicons name="folder" size={20} color="#3b82f6" />
                  <Text style={styles.fabMenuText}>Nova Pasta</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setShowFab(!showFab)}
            >
              <Ionicons name={showFab ? 'close' : 'add'} size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

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
                    style={[styles.containerOption, selectedContainer?.id === c.id && styles.containerOptionActive]}
                    onPress={() => {
                      setSelectedContainer(c);
                      setShowContainerPicker(false);
                    }}
                  >
                    <View style={[styles.statusDot, { backgroundColor: c.status === 'running' ? Colors.success : Colors.error }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.containerName}>{c.name}</Text>
                      <Text style={styles.containerType}>{c.type} • {c.status}</Text>
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

        {/* Input Modal */}
        <Modal visible={showInputModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '85%' }]}>
              <Text style={styles.modalTitle}>{inputModalConfig.title}</Text>
              <TextInput
                style={styles.modalInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={inputModalConfig.placeholder}
                placeholderTextColor={Colors.textMuted}
                autoFocus
                selectTextOnFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: Colors.surfaceVariant }]}
                  onPress={() => setShowInputModal(false)}
                >
                  <Text style={[styles.modalBtnText, { color: Colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: Colors.primary }]}
                  onPress={() => {
                    setShowInputModal(false);
                    inputModalConfig.onSubmit(inputValue);
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  pickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 12,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },

  breadcrumb: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 40,
  },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbText: { fontSize: 13, color: Colors.textSecondary },

  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    marginHorizontal: 12,
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  selectionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  selectionActions: { flexDirection: 'row', gap: 6 },
  selectionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  fileRowSelected: { backgroundColor: '#eff6ff' },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: { fontSize: 15, fontWeight: '500', color: Colors.text },
  fileSize: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  fabContainer: { position: 'absolute', right: 20, bottom: 24, alignItems: 'flex-end' },
  fabMenu: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  fabMenuText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

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
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surfaceVariant,
    marginVertical: 12,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 15, fontWeight: '600' },

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
