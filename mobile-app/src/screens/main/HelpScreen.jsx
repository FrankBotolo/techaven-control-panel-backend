import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { help, support } from '../../api/client';

export default function HelpScreen() {
  const [topics, setTopics] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [supportInfo, setSupportInfo] = useState(null);

  useEffect(() => {
    help.getTopics().then((r) => setTopics(r.data?.data || [])).catch(() => {});
    help.getFaqs().then((r) => setFaqs(r.data?.data || [])).catch(() => {});
    support.getInfo().then((r) => setSupportInfo(r.data?.data)).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Help & Support</Text>
      {supportInfo && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>
          {supportInfo.email ? <Text style={styles.meta}>Email: {supportInfo.email}</Text> : null}
          {supportInfo.phone ? <Text style={styles.meta}>Phone: {supportInfo.phone}</Text> : null}
          {supportInfo.working_hours ? <Text style={styles.meta}>{supportInfo.working_hours}</Text> : null}
        </View>
      )}
      <Text style={styles.sectionTitle}>Help topics</Text>
      <FlatList
        data={topics}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowContent} numberOfLines={2}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={null}
      />
      <Text style={styles.sectionTitle}>FAQs</Text>
      <FlatList
        data={faqs}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.question}</Text>
            <Text style={styles.rowContent}>{item.answer}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 56 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  meta: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 12 },
  row: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  rowContent: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
});
