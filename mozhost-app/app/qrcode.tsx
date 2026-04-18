import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getToken } from '@/services/api';
import { Colors } from '@/constants/Colors';

const WS_BASE = 'wss://api.mozhost.shop/api';

type ConnectionState = 'waiting' | 'qr' | 'connecting' | 'connected' | 'disconnected' | 'error';

type ConnectedInfo = {
  name?: string;
  phone?: string;
  platform?: string;
};

export default function QRCodeScreen() {
  const { containerId } = useLocalSearchParams<{ containerId: string }>();
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  const [state, setState] = useState<ConnectionState>('waiting');
  const [qrData, setQrData] = useState<string | null>(null);
  const [message, setMessage] = useState('Aguardando geração do QR Code...');
  const [connectedInfo, setConnectedInfo] = useState<ConnectedInfo>({});

  const connect = useCallback(async () => {
    const token = await getToken();
    if (!token || !containerId) return;

    wsRef.current?.close();
    setState('waiting');
    setMessage('Aguardando geração do QR Code...');
    setQrData(null);
    setConnectedInfo({});

    const ws = new WebSocket(`${WS_BASE}/qrcode/${containerId}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'waiting':
            setState('waiting');
            setMessage(data.message || 'Aguardando geração do QR Code...');
            break;
          case 'qr':
            setState('qr');
            setQrData(data.qr);
            break;
          case 'connecting':
            setState('connecting');
            setMessage('Conectando ao WhatsApp...');
            break;
          case 'connected':
            setState('connected');
            setConnectedInfo(data.info || {});
            break;
          case 'disconnected':
            setState('disconnected');
            setMessage(data.message || 'Conexão perdida');
            break;
          case 'error':
            setState('error');
            setMessage(data.message || 'Erro na conexão');
            break;
        }
      } catch {}
    };

    ws.onerror = () => {
      setState('error');
      setMessage('Erro na conexão WebSocket');
    };

    ws.onclose = () => {
      if (state !== 'connected' && state !== 'error') {
        setState('disconnected');
        setMessage('Conexão encerrada');
      }
    };
  }, [containerId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const renderContent = () => {
    switch (state) {
      case 'waiting':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.stateText}>{message}</Text>
          </View>
        );

      case 'qr':
        return (
          <View style={styles.qrContainer}>
            <View style={styles.qrCard}>
              <View style={styles.qrIconRow}>
                <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                <Text style={styles.qrTitle}>Escaneie o QR Code</Text>
              </View>
              {qrData && (
                <Image
                  source={{ uri: qrData }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>Como conectar:</Text>
                <Text style={styles.instructionsText}>
                  Abra o WhatsApp {'>'} Menu {'>'} Aparelhos conectados {'>'} Conectar aparelho
                </Text>
              </View>
            </View>
          </View>
        );

      case 'connecting':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#25D366" />
            <Text style={styles.stateText}>Conectando ao WhatsApp...</Text>
          </View>
        );

      case 'connected':
        return (
          <View style={styles.stateContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Conectado com sucesso!</Text>
            <View style={styles.infoCard}>
              {connectedInfo.name && (
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={18} color={Colors.textSecondary} />
                  <Text style={styles.infoLabel}>Nome:</Text>
                  <Text style={styles.infoValue}>{connectedInfo.name}</Text>
                </View>
              )}
              {connectedInfo.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={18} color={Colors.textSecondary} />
                  <Text style={styles.infoLabel}>Telefone:</Text>
                  <Text style={styles.infoValue}>{connectedInfo.phone}</Text>
                </View>
              )}
              {connectedInfo.platform && (
                <View style={styles.infoRow}>
                  <Ionicons name="phone-portrait" size={18} color={Colors.textSecondary} />
                  <Text style={styles.infoLabel}>Plataforma:</Text>
                  <Text style={styles.infoValue}>{connectedInfo.platform}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'disconnected':
      case 'error':
        return (
          <View style={styles.stateContainer}>
            <Ionicons
              name={state === 'error' ? 'alert-circle' : 'cloud-offline'}
              size={64}
              color={Colors.error}
            />
            <Text style={styles.errorTitle}>
              {state === 'error' ? 'Erro na conexão' : 'Desconectado'}
            </Text>
            <Text style={styles.errorMessage}>{message}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={connect}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'QR Code WhatsApp',
          headerShown: true,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {renderContent()}

        {state !== 'disconnected' && state !== 'error' && state !== 'connected' && (
          <TouchableOpacity style={styles.reconnectBtn} onPress={connect}>
            <Ionicons name="refresh" size={18} color={Colors.primary} />
            <Text style={styles.reconnectBtnText}>Reconectar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  stateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    width: '100%',
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  qrImage: {
    width: 280,
    height: 280,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionsBox: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 14,
    width: '100%',
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  successIcon: {
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  reconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  reconnectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
