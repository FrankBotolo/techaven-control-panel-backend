import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { products } from '../../api/client';

export default function ProductDetailScreen() {
  const route = useRoute();
  const nav = useNavigation();
  const { id, categoryId } = route.params || {};
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      products.getById(id).then((r) => setProduct(r.data?.data)).catch(() => setProduct(null));
    } else {
      setLoading(false);
    }
  }, [id]);

  if (!id) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Select a product</Text>
      </View>
    );
  }

  if (!product && !loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Product not found</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Loading...</Text>
      </View>
    );
  }

  const addToCart = () => {
    nav.navigate('CartCheckout', { productId: product.id, quantity: 1, price: product.price });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {product.image ? (
        <Image source={{ uri: product.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholderImg]} />
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>MWK {product.price}</Text>
          {product.original_price && (
            <Text style={styles.originalPrice}>MWK {product.original_price}</Text>
          )}
        </View>
        {product.description ? (
          <Text style={styles.description}>{product.description}</Text>
        ) : null}
        {product.shop && (
          <TouchableOpacity onPress={() => nav.navigate('ShopDetail', { id: product.shop.id })}>
            <Text style={styles.shopLink}>Sold by: {product.shop.name}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.button} onPress={addToCart}>
          <Text style={styles.buttonText}>Add to cart / Checkout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingBottom: 32 },
  image: { width: '100%', height: 300, backgroundColor: '#1e293b' },
  placeholderImg: {},
  body: { padding: 20 },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  price: { color: '#22c55e', fontSize: 20, fontWeight: '700' },
  originalPrice: { color: '#64748b', fontSize: 16, textDecorationLine: 'line-through' },
  description: { color: '#94a3b8', fontSize: 16, lineHeight: 24, marginBottom: 16 },
  shopLink: { color: '#22c55e', fontSize: 14, marginBottom: 24 },
  button: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
