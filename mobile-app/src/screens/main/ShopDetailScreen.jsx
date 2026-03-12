import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, FlatList, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { shops, products as productsApi } from '../../api/client';

export default function ShopDetailScreen() {
  const route = useRoute();
  const nav = useNavigation();
  const { id } = route.params || {};
  const [shop, setShop] = useState(null);
  const [productList, setProductList] = useState([]);

  useEffect(() => {
    if (id) {
      shops.getById(id).then((r) => setShop(r.data?.data)).catch(() => setShop(null));
      shops.getProducts(id).then((r) => {
        const d = r.data?.data?.data ?? r.data?.data ?? [];
        setProductList(Array.isArray(d) ? d : []);
      }).catch(() => setProductList([]));
    }
  }, [id]);

  if (!id || !shop) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {shop.logo ? (
        <Image source={{ uri: shop.logo }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.placeholderImg]} />
      )}
      <Text style={styles.name}>{shop.name}</Text>
      {shop.description ? <Text style={styles.description}>{shop.description}</Text> : null}
      {shop.location ? <Text style={styles.meta}>{shop.location}</Text> : null}
      <Text style={styles.sectionTitle}>Products</Text>
      <FlatList
        data={productList}
        keyExtractor={(i) => String(i.id)}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productRow}
            onPress={() => nav.navigate('ProductDetail', { id: item.id })}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.placeholderImg]} />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productPrice}>MWK {item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No products</Text>}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 12, margin: 20, backgroundColor: '#1e293b' },
  placeholderImg: {},
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginHorizontal: 20, marginBottom: 8 },
  description: { color: '#94a3b8', marginHorizontal: 20, marginBottom: 8 },
  meta: { color: '#64748b', marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginHorizontal: 20, marginBottom: 12 },
  productRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: '#1e293b', borderRadius: 12, padding: 12 },
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#334155' },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { color: '#fff', fontSize: 16 },
  productPrice: { color: '#22c55e', fontWeight: '600', marginTop: 4 },
  empty: { color: '#64748b', padding: 20 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
