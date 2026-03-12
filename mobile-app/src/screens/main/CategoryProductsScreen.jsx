import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { products } from '../../api/client';

export default function CategoryProductsScreen() {
  const route = useRoute();
  const nav = useNavigation();
  const { categoryId, categoryName } = route.params || {};
  const [list, setList] = useState([]);

  useEffect(() => {
    if (categoryId) {
      products.getByCategory(categoryId).then((r) => {
        const d = r.data?.data?.data ?? r.data?.data ?? [];
        setList(Array.isArray(d) ? d : []);
      }).catch(() => setList([]));
    }
  }, [categoryId]);

  if (!categoryId) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Select a category</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{categoryName || 'Products'}</Text>
      <FlatList
        data={list}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('ProductDetail', { id: item.id })}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholderImg]} />
            )}
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.price}>MWK {item.price}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No products in this category</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', padding: 20, paddingTop: 56 },
  list: { padding: 16, paddingBottom: 32 },
  row: { marginBottom: 12, gap: 12, paddingHorizontal: 4 },
  card: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden', maxWidth: '48%' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#334155' },
  placeholderImg: {},
  name: { padding: 8, color: '#fff', fontSize: 14 },
  price: { padding: 8, color: '#22c55e', fontWeight: '600' },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
