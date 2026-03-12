import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { orders } from '../../api/client';

export default function OrderDetailScreen() {
  const route = useRoute();
  const { id } = route.params || {};
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (id) {
      orders.getById(id).then((r) => setOrder(r.data?.data)).catch(() => setOrder(null));
    }
  }, [id]);

  if (!id || !order) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Loading...</Text>
      </View>
    );
  }

  const addr = order.shipping_address && typeof order.shipping_address === 'object' ? order.shipping_address : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.orderNumber}>{order.order_number || `#${order.id}`}</Text>
      <Text style={styles.status}>{order.status}</Text>
      <Text style={styles.amount}>MWK {order.total_amount}</Text>
      {order.items && order.items.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product_name} x{item.quantity}</Text>
              <Text style={styles.itemPrice}>MWK {item.subtotal}</Text>
            </View>
          ))}
        </>
      )}
      {addr && (
        <>
          <Text style={styles.sectionTitle}>Shipping</Text>
          <Text style={styles.addr}>{addr.full_name}, {addr.phone}</Text>
          <Text style={styles.addr}>{addr.address}, {addr.city}</Text>
        </>
      )}
      <Text style={styles.date}>Placed: {order.created_at}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  orderNumber: { color: '#fff', fontSize: 20, fontWeight: '700' },
  status: { color: '#22c55e', fontSize: 14, marginTop: 4, textTransform: 'capitalize' },
  amount: { color: '#94a3b8', fontSize: 18, marginTop: 8 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#1e293b', borderRadius: 8, marginBottom: 8 },
  itemName: { color: '#fff', flex: 1 },
  itemPrice: { color: '#22c55e' },
  addr: { color: '#94a3b8', fontSize: 14 },
  date: { color: '#64748b', fontSize: 12, marginTop: 24 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
