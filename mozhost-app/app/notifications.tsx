// app/notifications.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Colors } from '@/constants/Colors';

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: Colors.success };
      case 'warning':
        return { name: 'warning', color: Colors.warning };
      case 'error':
        return { name: 'close-circle', color: Colors.error };
      default:
        return { name: 'information-circle', color: Colors.primary };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const renderItem = ({ item }: any) => {
    const icon = getIcon(item.type);
    const isUnread = !item.read_at;

    return (
      <TouchableOpacity
        onPress={() => markAsRead(item.id)}
        style={[styles.notificationItem, isUnread && styles.unread]}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{formatDate(item.created_at)}</Text>
        </View>

        <TouchableOpacity
          onPress={() => deleteNotification(item.id)}
          style={styles.deleteBtn}
        >
          <Ionicons name="close" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllBtn}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Nenhuma notificação</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginLeft: 12,
  },
  markAllBtn: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
  },
  unread: {
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 16,
  },
});
