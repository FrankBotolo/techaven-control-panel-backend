import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { products, banners, categories } from '../../api/client';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function HomeScreen() {
  const nav = useNavigation();
  const [featured, setFeatured] = useState([]);
  const [hotSales, setHotSales] = useState([]);
  const [bannerList, setBannerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [f, h, b] = await Promise.all([
        products.getFeatured().then((r) => r.data?.data || []),
        products.getHotSales().then((r) => r.data?.data || []),
        banners.getAll().then((r) => r.data?.data || []),
      ]);
      setFeatured(Array.isArray(f) ? f : []);
      setHotSales(Array.isArray(h) ? h : []);
      setBannerList(Array.isArray(b) ? b : []);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => nav.navigate('ProductDetail', { id: item.id })}
      activeOpacity={0.8}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]} />
      )}
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>MWK {item.price}</Text>
      {item.original_price && (
        <Text style={styles.originalPrice}>MWK {item.original_price}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TecHaven</Text>
        <Text style={styles.headerSubtitle}>Electronics marketplace</Text>
      </View>

      {bannerList.length > 0 && (
        <FlatList
          horizontal
          data={bannerList}
          keyExtractor={(i) => String(i.id)}
          showsHorizontalScrollIndicator={false}
          style={styles.bannerList}
          contentContainerStyle={styles.bannerContent}
          renderItem={({ item }) =>
            item.image ? (
              <Image source={{ uri: item.image }} style={styles.bannerImage} />
            ) : (
              <View style={[styles.bannerImage, styles.placeholderImage]} />
            )
          }
        />
      )}

      <Text style={styles.sectionTitle}>Featured</Text>
      <FlatList
        data={featured}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={renderProduct}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No featured products</Text> : null}
      />

      {hotSales.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Hot sales</Text>
          <FlatList
            horizontal
            data={hotSales}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderProduct}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  bannerList: { maxHeight: 160, marginVertical: 16 },
  bannerContent: { paddingHorizontal: 16, gap: 12 },
  bannerImage: { width: width - 32, height: 160, borderRadius: 12, marginRight: 16, backgroundColor: '#1e293b' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginHorizontal: 16, marginBottom: 12 },
  row: { paddingHorizontal: 16, marginBottom: 12, gap: 12 },
  productCard: { width: CARD_WIDTH, backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden', marginRight: 12 },
  productImage: { width: '100%', height: CARD_WIDTH, backgroundColor: '#334155' },
  placeholderImage: { backgroundColor: '#334155' },
  productName: { padding: 8, color: '#fff', fontSize: 14 },
  productPrice: { paddingHorizontal: 8, paddingBottom: 8, color: '#22c55e', fontWeight: '600' },
  originalPrice: { paddingHorizontal: 8, paddingBottom: 4, color: '#64748b', fontSize: 12, textDecorationLine: 'line-through' },
  horizontalList: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
});
