import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { orders as ordersApi } from '../../api/client';

export default function OrdersScreen() {
  const nav = useNavigation();
  const { isAuthenticated } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await ordersApi.getAll();
      const data = res.data?.data?.data ?? res.data?.data ?? [];
      setList(Array.isArray(data) ? data : []);
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

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Orders</Text>
          <Text style={styles.headerSubtitle}>Sign in to view your orders</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerSubtitle}>Your order history</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#22c55e" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('OrderDetail', { id: item.id })}
            activeOpacity={0.8}
          >
            <Text style={styles.orderNumber}>{item.order_number || `#${item.id}`}</Text>
            <Text style={styles.status}>{item.status}</Text>
            <Text style={styles.amount}>MWK {item.total_amount}</Text>
            {item.shipping_address && typeof item.shipping_address === 'object' && (
              <Text style={styles.address} numberOfLines={1}>
                {item.shipping_address.address || item.shipping_address.city}
              </Text>
            )}
            <Text style={styles.date}>{item.created_at}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No orders yet</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  orderNumber: { color: '#fff', fontSize: 16, fontWeight: '600' },
  status: { color: '#22c55e', fontSize: 14, marginTop: 4, textTransform: 'capitalize' },
  amount: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  address: { color: '#64748b', fontSize: 12, marginTop: 4 },
  date: { color: '#64748b', fontSize: 12, marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
});
