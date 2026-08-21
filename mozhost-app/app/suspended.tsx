import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

const WHATSAPP_NUMBER = '258862840075';

export default function SuspendedScreen() {
  const router = useRouter();
  const { user, logout, accountStatus } = useAuth();

  const reason =
    accountStatus?.suspension_reason === 'billing_expired'
      ? 'Seu plano mensal expirou e seus containers foram pausados.'
      : 'Seu período de teste grátis (7 dias) terminou e seus containers foram pausados.';

  const openWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Minha conta MozHost está suspensa (${user?.username || 'usuário'}). Acabei de fazer o pagamento do plano, segue o comprovante: `
    );
    Linking.openURL(`https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${text}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="ban" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>Conta Suspensa</Text>
            <Text style={styles.subtitle}>{reason}</Text>
          </View>

          {/* Aviso */}
          <View style={styles.alert}>
            <Ionicons name="warning" size={20} color={Colors.warning} />
            <Text style={styles.alertText}>
              Seus dados estão guardados por <Text style={styles.bold}>5 dias</Text>. Depois disso os
              containers serão removidos para liberar espaço no servidor.
            </Text>
          </View>

          {/* Como pagar */}
          <Text style={styles.sectionTitle}>Como pagar</Text>

          <View style={styles.payCard}>
            <Text style={styles.payTitle}>📱 M-Pesa / e-Mola</Text>
            <Text style={styles.payText}>Envie o valor do seu plano para:</Text>
            <View style={styles.phoneBox}>
              <Text style={styles.phone}>86 284 0075</Text>
            </View>
            <Text style={styles.payHint}>
              Planos: Starter 150 MT · Basic 350 MT · Pro 700 MT · Business 1500 MT (por mês)
            </Text>
          </View>

          {/* Ações */}
          <TouchableOpacity style={[styles.button, styles.whatsappButton]} onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.buttonText}>Enviar comprovante no WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => Linking.openURL('https://mozhost.shop/billing')}
          >
            <Ionicons name="globe" size={20} color="#fff" />
            <Text style={styles.buttonText}>Pagar pelo painel web</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            Dúvidas? Chama no WhatsApp +258 86 284 0075 — a gente te ajuda.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  header: {
    backgroundColor: Colors.error,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#fecaca',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  alert: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    margin: 20,
  },
  alertText: {
    flex: 1,
    color: '#92400e',
    fontSize: 13,
    lineHeight: 19,
  },
  bold: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  payCard: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  payTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  payText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  phoneBox: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  phone: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  payHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
    lineHeight: 17,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  whatsappButton: {
    backgroundColor: '#22c55e',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
});
