import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { products } from '../../api/client';

export default function SearchScreen() {
  const nav = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim() || query.length < 3) return;
    setLoading(true);
    try {
      const res = await products.search({ q: query.trim() });
      setResults(res.data?.data || []);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TextInput
          style={styles.input}
          placeholder="Search products..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate('ProductDetail', { id: item.id })}
            activeOpacity={0.8}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.placeholder]} />
            )}
            <View style={styles.rowText}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.price}>MWK {item.price}</Text>
              {(item.category_name || item.shop_name) && (
                <Text style={styles.meta}>{[item.category_name, item.shop_name].filter(Boolean).join(' · ')}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.length >= 3 && !loading ? (
            <Text style={styles.empty}>No results for "{query}"</Text>
          ) : query.length > 0 && query.length < 3 ? (
            <Text style={styles.empty}>Type at least 3 characters</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  list: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 12 },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#334155' },
  placeholder: {},
  rowText: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { color: '#fff', fontSize: 16, fontWeight: '500' },
  price: { color: '#22c55e', fontWeight: '600', marginTop: 4 },
  meta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
});
