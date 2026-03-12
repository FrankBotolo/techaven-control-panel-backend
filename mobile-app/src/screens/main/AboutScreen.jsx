import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { about } from '../../api/client';

export default function AboutScreen() {
  const [info, setInfo] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    about.getInfo().then((r) => setInfo(r.data?.data)).catch(() => {});
    about.getStats().then((r) => setStats(r.data?.data)).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>{info?.app_name || 'TecHaven'}</Text>
      {info?.version && <Text style={styles.version}>Version {info.version}</Text>}
      {info?.description && <Text style={styles.desc}>{info.description}</Text>}
      {info?.about && <Text style={styles.about}>{info.about}</Text>}
      {stats && (
        <View style={styles.stats}>
          <Text style={styles.statsTitle}>At a glance</Text>
          <Text style={styles.stat}>Vendors: {stats.total_vendors ?? 0}</Text>
          <Text style={styles.stat}>Products: {stats.total_products ?? 0}</Text>
          <Text style={styles.stat}>Customers: {stats.total_customers ?? 0}</Text>
          <Text style={styles.stat}>Orders: {stats.total_orders ?? 0}</Text>
        </View>
      )}
      {info?.contact_email && (
        <Text style={styles.contact}>Contact: {info.contact_email}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 4 },
  version: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  desc: { color: '#94a3b8', fontSize: 16, marginBottom: 12 },
  about: { color: '#94a3b8', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  stats: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 24 },
  statsTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  stat: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  contact: { color: '#22c55e', fontSize: 14 },
});
