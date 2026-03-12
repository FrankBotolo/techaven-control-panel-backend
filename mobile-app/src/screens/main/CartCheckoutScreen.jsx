import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { orders, paymentMethods, shippingAddresses } from '../../api/client';

export default function CartCheckoutScreen() {
  const route = useRoute();
  const nav = useNavigation();
  const { isAuthenticated } = useAuth();
  const { productId, quantity = 1, price } = route.params || {};
  const [paymentMethodsList, setPaymentMethodsList] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    paymentMethods.getAll().then((r) => setPaymentMethodsList(r.data?.data || [])).catch(() => {});
    if (isAuthenticated) {
      shippingAddresses.getAll().then((r) => {
        const list = r.data?.data || [];
        setAddresses(list);
        const defaultAddr = list.find((a) => a.is_default) || list[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const placeOrder = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in to place an order');
      return;
    }
    if (!productId || !price) {
      Alert.alert('Error', 'Missing product info');
      return;
    }
    const addr = addresses.find((a) => a.id === selectedAddressId) || addresses[0];
    if (!addr) {
      Alert.alert('Error', 'Add a shipping address first');
      nav.navigate('Addresses');
      return;
    }
    setLoading(true);
    try {
      const res = await orders.create({
        items: [{ product_id: productId, quantity: quantity || 1, price: String(price) }],
        shipping_address: addr.address,
        shipping_city: addr.city,
        shipping_phone: addr.phone,
        payment_method: paymentMethod || 'cash_on_delivery',
        notes: notes.trim() || undefined,
      });
      const d = res.data;
      if (d?.success && d?.data?.order) {
        Alert.alert('Success', d?.message || 'Order placed', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      } else {
        Alert.alert('Error', d?.message || 'Failed to place order');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Sign in to checkout</Text>
      </View>
    );
  }

  const total = (parseFloat(price) || 0) * (quantity || 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Checkout</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Shipping address</Text>
        {addresses.length === 0 ? (
          <TouchableOpacity style={styles.linkBtn} onPress={() => nav.navigate('Addresses')}>
            <Text style={styles.linkText}>Add shipping address</Text>
          </TouchableOpacity>
        ) : (
          addresses.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.addressRow, selectedAddressId === a.id && styles.addressRowSelected]}
              onPress={() => setSelectedAddressId(a.id)}
            >
              <Text style={styles.addressText}>{a.address}, {a.city}</Text>
              <Text style={styles.addressPhone}>{a.phone}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Payment</Text>
        {paymentMethodsList.map((pm) => (
          <TouchableOpacity
            key={pm.id}
            style={[styles.paymentRow, paymentMethod === pm.code && styles.paymentRowSelected]}
            onPress={() => setPaymentMethod(pm.code)}
          >
            <Text style={styles.paymentText}>{pm.name}</Text>
          </TouchableOpacity>
        ))}
        {paymentMethodsList.length === 0 && (
          <Text style={styles.meta}>Cash on delivery (default)</Text>
        )}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Order notes (optional)"
        placeholderTextColor="#64748b"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>MWK {total.toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={placeOrder} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Placing...' : 'Place order'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, paddingBottom: 48 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 14, marginBottom: 12 },
  addressRow: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  addressRowSelected: { borderColor: '#22c55e' },
  addressText: { color: '#fff', fontSize: 14 },
  addressPhone: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  paymentRow: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  paymentRowSelected: { borderColor: '#22c55e' },
  paymentText: { color: '#fff' },
  linkBtn: { padding: 12 },
  linkText: { color: '#22c55e' },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 16, minHeight: 80 },
  meta: { color: '#64748b', fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  totalLabel: { color: '#94a3b8', fontSize: 16 },
  totalValue: { color: '#22c55e', fontSize: 20, fontWeight: '700' },
  button: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
