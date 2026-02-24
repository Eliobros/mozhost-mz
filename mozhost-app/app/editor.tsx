import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { api } from '@/services/api';
import { Colors } from '@/constants/Colors';

const getLanguageLabel = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
    py: 'Python', json: 'JSON', html: 'HTML', css: 'CSS',
    md: 'Markdown', yml: 'YAML', yaml: 'YAML', env: 'Environment',
    sh: 'Shell', txt: 'Text',
  };
  return map[ext || ''] || 'Text';
};

export default function EditorScreen() {
  const router = useRouter();
  const { containerId, filePath } = useLocalSearchParams<{ containerId: string; filePath: string }>();

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  const inputRef = useRef<TextInput>(null);

  const fileName = filePath?.split('/').pop() || 'file';
  const language = getLanguageLabel(fileName);
  const hasUnsavedChanges = content !== originalContent;
  const lineCount = content.split('\n').length;

  const loadFile = useCallback(async () => {
    if (!containerId || !filePath) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/files/${containerId}?path=${encodeURIComponent(filePath)}`);
      const fileContent = data.content || '';
      setContent(fileContent);
      setOriginalContent(fileContent);
    } catch (err: any) {
      setError(err.message || err.error || 'Falha ao carregar arquivo');
    } finally {
      setLoading(false);
    }
  }, [containerId, filePath]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  const handleSave = async () => {
    if (!containerId || !filePath) return;
    setSaving(true);
    try {
      await api.put(`/files/${containerId}/${filePath}`, { content });
      setOriginalContent(content);
      Alert.alert('Salvo', 'Arquivo salvo com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || err.error || 'Falha ao salvar arquivo');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { start } = e.nativeEvent.selection;
    const textBefore = content.substring(0, start);
    const lines = textBefore.split('\n');
    setCursorLine(lines.length);
    setCursorCol((lines[lines.length - 1]?.length || 0) + 1);
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Alterações não salvas',
        'Deseja sair sem salvar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{fileName}</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando arquivo...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{fileName}</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Erro ao carregar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadFile}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.headerSubtitle}>{language}</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, hasUnsavedChanges && styles.saveBtnActive]}
          disabled={saving || !hasUnsavedChanges}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              {hasUnsavedChanges && <View style={styles.unsavedDot} />}
              <Ionicons
                name="save"
                size={20}
                color={hasUnsavedChanges ? '#fff' : '#ffffff60'}
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Editor */}
      <KeyboardAvoidingView
        style={styles.editorWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <TextInput
          ref={inputRef}
          style={[styles.editor, { fontSize }]}
          value={content}
          onChangeText={setContent}
          onSelectionChange={handleSelectionChange}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          textAlignVertical="top"
          placeholder="// Empty file"
          placeholderTextColor="#555"
        />
      </KeyboardAvoidingView>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>
            Ln {cursorLine}, Col {cursorCol} | {lineCount} linhas
          </Text>
          {hasUnsavedChanges && (
            <View style={styles.statusUnsaved}>
              <View style={styles.statusUnsavedDot} />
              <Text style={styles.statusUnsavedText}>Modificado</Text>
            </View>
          )}
        </View>
        <View style={styles.statusRight}>
          <Text style={styles.statusLang}>{language}</Text>
          <View style={styles.fontControls}>
            <TouchableOpacity
              onPress={() => setFontSize((s) => Math.max(10, s - 1))}
              style={styles.fontBtn}
            >
              <Ionicons name="remove" size={14} color="#aaa" />
            </TouchableOpacity>
            <Text style={styles.fontSizeText}>{fontSize}</Text>
            <TouchableOpacity
              onPress={() => setFontSize((s) => Math.min(24, s + 1))}
              style={styles.fontBtn}
            >
              <Ionicons name="add" size={14} color="#aaa" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252526',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  saveBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  saveBtnActive: {
    backgroundColor: Colors.primary,
  },
  unsavedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e0e0e0',
  },
  errorText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editorWrapper: {
    flex: 1,
  },
  editor: {
    flex: 1,
    color: '#d4d4d4',
    fontFamily: 'monospace',
    padding: 16,
    lineHeight: 22,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007acc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontFamily: 'monospace',
  },
  statusUnsaved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusUnsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  statusUnsavedText: {
    fontSize: 11,
    color: '#fde68a',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLang: {
    fontSize: 11,
    color: '#fff',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fontBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
  },
  fontSizeText: {
    fontSize: 11,
    color: '#fff',
    fontFamily: 'monospace',
    minWidth: 18,
    textAlign: 'center',
  },
});
