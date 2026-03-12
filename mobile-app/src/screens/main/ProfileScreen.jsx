import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Sign in to manage your account</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => signOut()}>
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menu = [
    { label: 'Edit profile', screen: 'EditProfile' },
    { label: 'Wallet', screen: 'Wallet' },
    { label: 'Shipping addresses', screen: 'Addresses' },
    { label: 'Notifications', screen: 'Notifications' },
    { label: 'Help & support', screen: 'Help' },
    { label: 'About', screen: 'About' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>{user.full_name || user.name || user.email}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.name}>{user.full_name || user.name || 'User'}</Text>
        {user.email ? <Text style={styles.meta}>{user.email}</Text> : null}
        {user.phone_number || user.phone ? (
          <Text style={styles.meta}>{user.phone_number || user.phone}</Text>
        ) : null}
      </View>
      {menu.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.menuItem}
          onPress={() => nav.navigate(item.screen)}
          activeOpacity={0.8}
        >
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[styles.button, styles.logout]} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingBottom: 48 },
  header: { padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginHorizontal: 16, marginBottom: 16 },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  meta: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  menuLabel: { color: '#fff', fontSize: 16 },
  menuArrow: { color: '#64748b', fontSize: 20 },
  button: { backgroundColor: '#22c55e', marginHorizontal: 16, marginTop: 24, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  logout: { backgroundColor: '#dc2626' },
});
