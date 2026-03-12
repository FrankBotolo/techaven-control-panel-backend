import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { categories, products } from '../../api/client';

export default function CategoriesScreen() {
  const nav = useNavigation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await categories.getAll();
      setList(res.data?.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSubtitle}>Browse by category</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#22c55e" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('CategoryProducts', { categoryId: item.id, categoryName: item.name })}
            activeOpacity={0.8}
          >
            <Text style={styles.icon}>{item.icon || '📦'}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.count}>{item.products_count ?? 0} products</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No categories</Text> : null}
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
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 28, marginRight: 16 },
  name: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  count: { color: '#94a3b8', fontSize: 14 },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
});
