import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, getToken } from '@/services/api';
import { Colors } from '@/constants/Colors';

const WS_BASE = 'wss://api.mozhost.topaziocoin.online/api';

type Container = {
  id: number;
  name: string;
  status: string;
  type: string;
};

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export default function TerminalScreen() {
  const params = useLocalSearchParams<{ containerId?: string; containerName?: string }>();

  const [containers, setContainers] = useState<Container[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(true);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [output, setOutput] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const loadContainers = useCallback(async () => {
    try {
      const data = await api.get('/containers');
      const list: Container[] = data.containers || [];
      setContainers(list);

      if (params.containerId) {
        const match = list.find((c) => String(c.id) === params.containerId);
        if (match) setSelectedContainer(match);
      }
    } catch {
      setOutput((prev) => [...prev, '\x1b[31m[Error] Failed to load containers\x1b[0m']);
    } finally {
      setLoadingContainers(false);
    }
  }, [params.containerId]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  const connect = useCallback(async (container: Container) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('connecting');
    setOutput((prev) => [...prev, `\n--- Connecting to ${container.name} ---`]);

    const token = await getToken();
    if (!token) {
      setStatus('disconnected');
      setOutput((prev) => [...prev, '[Error] Not authenticated']);
      return;
    }

    const ws = new WebSocket(
      `${WS_BASE}/terminal/${container.id}?token=${encodeURIComponent(token)}`
    );

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
      setOutput((prev) => [...prev, `[Connected to ${container.name}]`]);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && msg.data) {
          setOutput((prev) => [...prev, msg.data]);
        } else if (msg.type === 'error') {
          setOutput((prev) => [...prev, `[Error] ${msg.data || 'Unknown error'}`]);
        }
      } catch {
        setOutput((prev) => [...prev, String(event.data)]);
      }
    };

    ws.onerror = () => {
      setOutput((prev) => [...prev, '[Connection error]']);
    };

    ws.onclose = () => {
      setStatus('disconnected');
      setOutput((prev) => [...prev, '[Disconnected]']);
      wsRef.current = null;
      scheduleReconnect(container);
    };

    wsRef.current = ws;
  }, []);

  const scheduleReconnect = useCallback((container: Container) => {
    if (reconnectAttemptsRef.current >= 5) {
      setOutput((prev) => [...prev, '[Max reconnect attempts reached]']);
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
    reconnectAttemptsRef.current += 1;
    setOutput((prev) => [...prev, `[Reconnecting in ${Math.round(delay / 1000)}s...]`]);
    reconnectTimeoutRef.current = setTimeout(() => {
      connect(container);
    }, delay);
  }, [connect]);

  useEffect(() => {
    if (selectedContainer) {
      connect(selectedContainer);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [selectedContainer]);

  const sendCommand = useCallback(() => {
    const cmd = inputText.trim();
    if (!cmd || !wsRef.current || status !== 'connected') return;

    wsRef.current.send(JSON.stringify({ type: 'input', data: cmd + '\n' }));
    setOutput((prev) => [...prev, `$ ${cmd}`]);
    setCommandHistory((prev) => {
      const filtered = prev.filter((c) => c !== cmd);
      return [cmd, ...filtered].slice(0, 50);
    });
    setInputText('');
  }, [inputText, status]);

  const selectHistoryItem = useCallback((cmd: string) => {
    setInputText(cmd);
    setShowHistory(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 5;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
    setSelectedContainer(null);
    setOutput([]);
  }, []);

  const handleReconnect = useCallback(() => {
    if (!selectedContainer) return;
    reconnectAttemptsRef.current = 0;
    connect(selectedContainer);
  }, [selectedContainer, connect]);

  const clearTerminal = useCallback(() => {
    setOutput([]);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [output]);

  const statusColor =
    status === 'connected'
      ? Colors.success
      : status === 'connecting'
      ? Colors.warning
      : Colors.error;

  const statusLabel =
    status === 'connected'
      ? 'Connected'
      : status === 'connecting'
      ? 'Connecting...'
      : status === 'disconnected'
      ? 'Disconnected'
      : 'Idle';

  const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, '');

  if (loadingContainers) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Terminal',
            headerShown: true,
            headerStyle: { backgroundColor: '#1e1e1e' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading containers...</Text>
        </View>
      </>
    );
  }

  if (!selectedContainer) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Terminal',
            headerShown: true,
            headerStyle: { backgroundColor: '#1e1e1e' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <View style={styles.pickerScreen}>
          <View style={styles.pickerCard}>
            <Ionicons name="terminal" size={48} color={Colors.primary} />
            <Text style={styles.pickerTitle}>Select a Container</Text>
            <Text style={styles.pickerSubtitle}>
              Choose a running container to open a terminal session
            </Text>

            {containers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="server-outline" size={32} color="#555" />
                <Text style={styles.emptyText}>No containers found</Text>
              </View>
            ) : (
              <ScrollView style={styles.containerList}>
                {containers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.containerItem}
                    onPress={() => setSelectedContainer(c)}>
                    <View style={styles.containerItemLeft}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              c.status === 'running' ? Colors.success : Colors.textMuted,
                          },
                        ]}
                      />
                      <View>
                        <Text style={styles.containerItemName}>{c.name}</Text>
                        <Text style={styles.containerItemType}>
                          {c.type} · {c.status}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#555" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Terminal - ${selectedContainer.name}`,
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 15 },
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={clearTerminal} style={styles.headerBtn}>
                <Ionicons name="trash-outline" size={20} color="#aaa" />
              </TouchableOpacity>
              {status === 'disconnected' ? (
                <TouchableOpacity onPress={handleReconnect} style={styles.headerBtn}>
                  <Ionicons name="refresh" size={20} color={Colors.warning} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleDisconnect} style={styles.headerBtn}>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.terminalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {/* Status bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.switchBtn}>
            <Ionicons name="swap-horizontal" size={14} color="#aaa" />
            <Text style={styles.switchBtnText}>Switch</Text>
          </TouchableOpacity>
        </View>

        {/* Terminal output */}
        <ScrollView
          ref={scrollRef}
          style={styles.outputArea}
          contentContainerStyle={styles.outputContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {output.map((line, i) => {
            const isError =
              line.includes('[Error]') || line.includes('[Connection error]');
            const isSystem =
              line.startsWith('---') ||
              line.startsWith('[Connected') ||
              line.startsWith('[Disconnected') ||
              line.startsWith('[Reconnecting') ||
              line.startsWith('[Max reconnect');
            const isCommand = line.startsWith('$ ');

            return (
              <Text
                key={i}
                style={[
                  styles.outputLine,
                  isError && styles.outputError,
                  isSystem && styles.outputSystem,
                  isCommand && styles.outputCommand,
                ]}
                selectable>
                {stripAnsi(line)}
              </Text>
            );
          })}
        </ScrollView>

        {/* Command history popup */}
        {showHistory && commandHistory.length > 0 && (
          <View style={styles.historyPopup}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Command History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyList}>
              {commandHistory.map((cmd, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.historyItem}
                  onPress={() => selectHistoryItem(cmd)}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.historyItemText} numberOfLines={1}>
                    {cmd}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input area */}
        <View style={styles.inputArea}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setShowHistory(!showHistory)}
            disabled={commandHistory.length === 0}>
            <Ionicons
              name="time"
              size={20}
              color={commandHistory.length > 0 ? '#aaa' : '#444'}
            />
          </TouchableOpacity>
          <Text style={styles.prompt}>$</Text>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a command..."
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={sendCommand}
            editable={status === 'connected'}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || status !== 'connected') && styles.sendBtnDisabled,
            ]}
            onPress={sendCommand}
            disabled={!inputText.trim() || status !== 'connected'}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Container picker modal */}
        {showPicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerModal}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Switch Container</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {containers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.containerItem,
                      selectedContainer?.id === c.id && styles.containerItemSelected,
                    ]}
                    onPress={() => {
                      setShowPicker(false);
                      setOutput([]);
                      reconnectAttemptsRef.current = 0;
                      setSelectedContainer(c);
                    }}>
                    <View style={styles.containerItemLeft}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              c.status === 'running' ? Colors.success : Colors.textMuted,
                          },
                        ]}
                      />
                      <View>
                        <Text style={styles.containerItemName}>{c.name}</Text>
                        <Text style={styles.containerItemType}>
                          {c.type} · {c.status}
                        </Text>
                      </View>
                    </View>
                    {selectedContainer?.id === c.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
  },
  pickerScreen: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: '#252535',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  containerList: {
    width: '100%',
    maxHeight: 300,
  },
  containerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  containerItemSelected: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  containerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  containerItemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  containerItemType: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    padding: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16162a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  switchBtnText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  outputArea: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  outputContent: {
    padding: 12,
    paddingBottom: 20,
  },
  outputLine: {
    color: '#d4d4d4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  outputError: {
    color: '#f87171',
  },
  outputSystem: {
    color: '#888',
    fontStyle: 'italic',
  },
  outputCommand: {
    color: '#4ade80',
    fontWeight: '600',
  },
  historyPopup: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    backgroundColor: '#252535',
    borderTopWidth: 1,
    borderTopColor: '#333',
    maxHeight: 200,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '700',
  },
  historyList: {
    maxHeight: 150,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  historyItemText: {
    color: '#d4d4d4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    flex: 1,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16162a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    gap: 8,
  },
  historyBtn: {
    padding: 4,
  },
  prompt: {
    color: '#4ade80',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15,
    fontWeight: '700',
  },
  textInput: {
    flex: 1,
    color: '#d4d4d4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#252535',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
