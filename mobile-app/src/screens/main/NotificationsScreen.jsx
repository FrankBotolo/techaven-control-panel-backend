import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { notifications } from '../../api/client';

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuth();
  const [list, setList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const [res, countRes] = await Promise.all([
        notifications.getAll(),
        notifications.getUnreadCount(),
      ]);
      const data = res.data?.data?.data ?? res.data?.data ?? [];
      setList(Array.isArray(data) ? data : []);
      setUnreadCount(countRes.data?.data?.unread_count ?? 0);
    } catch (e) {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAuthenticated]);

  const markRead = async (id) => {
    try {
      await notifications.markRead(id);
      load();
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await notifications.markAllRead();
      load();
    } catch (e) {}
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Sign in to view notifications</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={list}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#22c55e" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.is_read && styles.cardUnread]}
            onPress={() => markRead(item.id)}
          >
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
            <Text style={styles.notifDate}>{item.created_at}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No notifications</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  markAll: { color: '#22c55e', fontSize: 14 },
  list: { padding: 20, paddingBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#22c55e' },
  notifTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  notifMessage: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  notifDate: { color: '#64748b', fontSize: 12, marginTop: 8 },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
