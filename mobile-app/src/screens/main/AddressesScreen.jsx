import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { shippingAddresses } from '../../api/client';

export default function AddressesScreen() {
  const nav = useNavigation();
  const { isAuthenticated } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    shippingAddresses.getAll().then((r) => setList(r.data?.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [isAuthenticated]);

  const setDefault = async (id) => {
    try {
      await shippingAddresses.setDefault(id);
      load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed');
    }
  };

  const deleteAddr = (id) => {
    Alert.alert('Delete', 'Remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          shippingAddresses.delete(id).then(load).catch((e) => Alert.alert('Error', e.response?.data?.message || 'Failed')),
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Sign in to manage addresses</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shipping addresses</Text>
        <TouchableOpacity onPress={() => nav.navigate('AddressForm', { onSave: load })}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={list}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.address}>{item.address}, {item.city} {item.postal_code}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            <View style={styles.actions}>
              {!item.is_default && (
                <TouchableOpacity onPress={() => setDefault(item.id)}>
                  <Text style={styles.actionText}>Set default</Text>
                </TouchableOpacity>
              )}
              {item.is_default && <Text style={styles.defaultBadge}>Default</Text>}
              <TouchableOpacity onPress={() => deleteAddr(item.id)}>
                <Text style={[styles.actionText, styles.danger]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No addresses. Add one to checkout.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  addText: { color: '#22c55e', fontSize: 16 },
  list: { padding: 20, paddingBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  address: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  phone: { color: '#64748b', fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 16 },
  actionText: { color: '#22c55e', fontSize: 14 },
  danger: { color: '#f87171' },
  defaultBadge: { color: '#22c55e', fontSize: 12 },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
