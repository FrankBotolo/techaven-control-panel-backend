import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { auth, setToken } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function VerifyOtpScreen({ route, navigation }) {
  const { identifier, flow = 'login' } = route.params || {};
  const { signIn } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim() || otp.length !== 4) {
      Alert.alert('Error', 'Enter the 4-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.verifyOtp({ identifier: identifier || '', otp: otp.trim() });
      const d = res.data;
      if (d?.success && d?.data?.access_token) {
        await setToken(d.data.access_token);
        signIn(d.data.user, d.data.access_token);
      } else if (d?.success && d?.data?.user) {
        await setToken(d.data.access_token);
        signIn(d.data.user, d.data.access_token);
      } else {
        Alert.alert('Error', d?.message || 'Verification failed');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await auth.resendOtp({ identifier: identifier || '' });
      Alert.alert('Done', 'OTP resent');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to resend');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>We sent a code to {identifier}</Text>
        <TextInput
          style={styles.input}
          placeholder="1234"
          placeholderTextColor="#64748b"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={4}
        />
        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? '...' : 'Verify'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleResend} style={styles.link}>
          <Text style={styles.linkText}>Resend OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    marginBottom: 16,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#22c55e', fontSize: 14 },
});
