import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
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

const getCodeMirrorMode = (lang: string): string => {
  const map: Record<string, string> = {
    'JavaScript': 'javascript',
    'TypeScript': 'javascript',
    'HTML': 'xml',
    'CSS': 'css',
    'Python': 'python',
    'Shell': 'shell',
    'JSON': 'javascript',
    'Markdown': 'markdown',
    'YAML': 'yaml',
  };
  return map[lang] || 'text';
};

const getEditorHTML = (code: string, lang: string, fontSize: number) => {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const mode = getCodeMirrorMode(lang);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/dracula.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/shell/shell.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/yaml/yaml.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; background: #1e1e1e; overflow: hidden; }
  .CodeMirror {
    height: 100vh;
    font-size: ${fontSize}px;
    font-family: 'Courier New', monospace;
    line-height: 1.6;
    background: #1e1e1e !important;
  }
  .CodeMirror-scroll { padding-bottom: 300px; }
  .CodeMirror-gutters { background: #1e1e1e !important; border-right: 1px solid #333; }
  .CodeMirror-linenumber { color: #555; }
</style>
</head>
<body>
<textarea id="editor">${escaped}</textarea>
<script>
  const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    mode: '${mode}',
    theme: 'dracula',
    lineNumbers: true,
    indentWithTabs: false,
    tabSize: 2,
    lineWrapping: true,
    autofocus: true,
  });

  let changeTimeout;
  editor.on('change', () => {
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(() => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'change',
        content: editor.getValue()
      }));
    }, 300);
  });

  editor.on('cursorActivity', () => {
    const cursor = editor.getCursor();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'cursor',
      line: cursor.line + 1,
      col: cursor.ch + 1
    }));
  });

  window.setFontSize = (size) => {
    document.querySelector('.CodeMirror').style.fontSize = size + 'px';
    editor.refresh();
  };

  window.getValue = () => {
    return editor.getValue();
  };
</script>
</body>
</html>`;
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

  const webViewRef = useRef<WebView>(null);

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

  useEffect(() => {
    if (!loading) {
      webViewRef.current?.injectJavaScript(`window.setFontSize(${fontSize}); true;`);
    }
  }, [fontSize, loading]);

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

  const handleMessage = (e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'change') setContent(data.content);
      if (data.type === 'cursor') {
        setCursorLine(data.line);
        setCursorCol(data.col);
      }
    } catch {}
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

      {/* Editor WebView */}
      <View style={styles.editorWrapper}>
        <WebView
          ref={webViewRef}
          source={{ html: getEditorHTML(content, language, fontSize) }}
          onMessage={handleMessage}
          scrollEnabled={true}
          keyboardDisplayRequiresUserAction={false}
          style={{ flex: 1, backgroundColor: '#1e1e1e' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

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
  container: { flex: 1, backgroundColor: '#1e1e1e' },
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#e0e0e0', fontFamily: 'monospace' },
  headerSubtitle: { fontSize: 11, color: '#888', marginTop: 2 },
  saveBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  saveBtnActive: { backgroundColor: Colors.primary },
  unsavedDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#f59e0b', zIndex: 1,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: '#888' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#e0e0e0' },
  errorText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, gap: 8, marginTop: 8,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  editorWrapper: { flex: 1 },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#007acc',
    paddingHorizontal: 12, paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusText: { fontSize: 11, color: '#fff', fontFamily: 'monospace' },
  statusUnsaved: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusUnsavedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
  statusUnsavedText: { fontSize: 11, color: '#fde68a' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusLang: { fontSize: 11, color: '#fff' },
  fontControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fontBtn: {
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4,
  },
  fontSizeText: { fontSize: 11, color: '#fff', fontFamily: 'monospace', minWidth: 18, textAlign: 'center' },
});
