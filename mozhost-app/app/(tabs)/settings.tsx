import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

type MenuItem = {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  subtitle?: string;
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link'));
  };

  const isAdmin = user?.id === 6;

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Ferramentas',
      items: [
        {
          icon: 'terminal',
          label: 'Terminal',
          subtitle: 'Acesso direto ao terminal',
          color: '#22c55e',
          onPress: () => router.push('/terminal'),
        },
        {
          icon: 'folder',
          label: 'Arquivos',
          subtitle: 'Gerenciador de arquivos',
          color: '#3b82f6',
          onPress: () => router.push('/files'),
        },
        {
          icon: 'code-slash',
          label: 'Editor de Código',
          subtitle: 'Editar arquivos dos containers',
          color: '#8b5cf6',
          onPress: () => router.push('/editor'),
        },
      ],
    },
    {
      title: 'Gestão',
      items: [
        {
          icon: 'globe',
          label: 'Domínios',
          subtitle: 'Gerir domínios conectados',
          color: '#0ea5e9',
          onPress: () => router.push('/domains'),
        },
        {
          icon: 'git-branch',
          label: 'Conexões',
          subtitle: 'GitHub e integrações',
          color: '#f97316',
          onPress: () => router.push('/connections'),
        },
        ...(isAdmin
          ? [
              {
                icon: 'shield-checkmark' as string,
                label: 'Admin',
                subtitle: 'Painel administrativo',
                color: '#dc2626',
                onPress: () => router.push('/admin'),
              },
            ]
          : []),
      ],
    },
    {
      title: 'Suporte',
      items: [
        {
          icon: 'logo-whatsapp',
          label: 'WhatsApp',
          subtitle: 'Fale diretamente conosco',
          color: '#22c55e',
          onPress: () => openLink('https://api.whatsapp.com/send?phone=258862840075&text=Ola%20preciso%20de%20ajuda'),
        },
        {
          icon: 'mail',
          label: 'Email',
          subtitle: 'mozhost@topaziocoin.online',
          color: Colors.primary,
          onPress: () => openLink('mailto:mozhost@topaziocoin.online'),
        },
        {
          icon: 'people',
          label: 'Comunidade WhatsApp',
          subtitle: 'Canal de novidades e ajuda',
          color: Colors.secondary,
          onPress: () => openLink('https://chat.whatsapp.com/LFgjPsLujgkE3RJYkZM62I'),
        },
      ],
    },
    {
      title: 'Recursos',
      items: [
        {
          icon: 'book',
          label: 'Documentação',
          subtitle: 'Guias completos',
          color: Colors.primary,
          onPress: () => openLink('https://mozhost.shop/docs'),
        },
        {
          icon: 'logo-youtube',
          label: 'Tutoriais em Vídeo',
          subtitle: 'Aprenda visualmente',
          color: '#ef4444',
          onPress: () => openLink('https://youtube.com/playlist?list=PLT04Pp33I859F87tPvwKSPupCznNFKsxF'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: 'document-text',
          label: 'Termos e Condições',
          color: Colors.textSecondary,
          onPress: () => openLink('https://mozhost.shop/#terms'),
        },
        {
          icon: 'shield-checkmark',
          label: 'Política de Privacidade',
          color: Colors.textSecondary,
          onPress: () => openLink('https://mozhost.shop/#privacy'),
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Account info card */}
      <View style={styles.accountCard}>
        <View style={styles.avatarSmall}>
          <Ionicons name="person" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountName}>{user?.username || 'Usuário'}</Text>
          <Text style={styles.accountEmail}>{user?.email || ''}</Text>
        </View>
        <View style={styles.planPill}>
          <Text style={styles.planPillText}>{user?.plan?.toUpperCase() || 'FREE'}</Text>
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, i < section.items.length - 1 && styles.menuItemBorder]}
                onPress={item.onPress}>
                <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* About */}
      <View style={styles.aboutSection}>
        <Text style={styles.aboutText}>MozHost v1.0.0</Text>
        <Text style={styles.aboutText}>© 2025 Eliobros Tech</Text>
        <Text style={styles.aboutText}>Maputo, Moçambique 🇲🇿</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  accountName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  accountEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  planPill: { backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planPillText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  menuSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  aboutSection: { alignItems: 'center', paddingVertical: 32, gap: 4 },
  aboutText: { fontSize: 13, color: Colors.textMuted },
});
