import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { wallet } from '../../api/client';

export default function WalletScreen() {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const [b, t] = await Promise.all([
        wallet.getBalance().then((r) => r.data?.data),
        wallet.getTransactions().then((r) => r.data?.data?.data ?? r.data?.data ?? []),
      ]);
      setBalance(b);
      setTransactions(Array.isArray(t) ? t : []);
    } catch (e) {
      setBalance(null);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Sign in to view wallet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>
            MWK {balance?.balance ?? '0.00'}
          </Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Recent transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#22c55e" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.txnRow}>
            <Text style={styles.txnDesc}>{item.description || item.type}</Text>
            <Text style={[styles.txnAmount, item.type === 'debit' && styles.txnDebit]}>
              {item.type === 'debit' ? '-' : '+'} MWK {item.amount}
            </Text>
            <Text style={styles.txnDate}>{item.created_at}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No transactions yet</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 56 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  balanceCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20 },
  balanceLabel: { color: '#94a3b8', fontSize: 14 },
  balanceValue: { color: '#22c55e', fontSize: 28, fontWeight: '700' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  list: { padding: 20, paddingBottom: 32 },
  txnRow: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  txnDesc: { color: '#fff', fontSize: 14 },
  txnAmount: { color: '#22c55e', fontWeight: '600', marginTop: 4 },
  txnDebit: { color: '#f87171' },
  txnDate: { color: '#64748b', fontSize: 12, marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', padding: 24 },
  placeholder: { color: '#94a3b8', textAlign: 'center', padding: 24 },
});
