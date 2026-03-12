import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList } from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to TecHaven',
    description: 'Discover and buy top-quality electronics from verified vendors across Malawi',
  },
  {
    id: '2',
    title: 'Shop with Confidence',
    description: 'All our vendors are verified. Browse thousands of products with secure payments',
  },
  {
    id: '3',
    title: 'Secure Payments',
    description: 'Multiple payment options: Airtel Money, TNM Mpamba, Bank Transfer, or Cash on Delivery',
  },
  {
    id: '4',
    title: 'Fast Delivery',
    description: 'Get your orders delivered quickly and safely to your doorstep',
  },
];

export default function OnboardingScreen({ onFinish }) {
  const [index, setIndex] = useState(0);
  const flatRef = React.useRef(null);

  const onNext = () => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={onNext}>
          <Text style={styles.buttonText}>{index === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  slide: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 16 },
  description: { fontSize: 16, color: '#94a3b8', lineHeight: 24 },
  footer: { padding: 24, paddingBottom: 48 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#22c55e', width: 24 },
  button: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
