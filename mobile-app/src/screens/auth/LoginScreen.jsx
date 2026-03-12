import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { auth, setToken } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [identifier, setIdentifier] = useState('');

  const handleLogin = async () => {
    if (!email.trim() && !identifier.trim()) {
      Alert.alert('Error', 'Enter email or phone number');
      return;
    }
    if (!useOtp && !password) {
      Alert.alert('Error', 'Enter password');
      return;
    }
    setLoading(true);
    try {
      if (useOtp) {
        const res = await auth.sendLoginOtp({ identifier: identifier || email });
        if (res.data?.success) {
          navigation.navigate('VerifyOtp', { identifier: identifier || email, flow: 'login' });
        } else {
          Alert.alert('Error', res.data?.message || 'Failed to send OTP');
        }
      } else {
        const res = await auth.login({ email: email || undefined, password });
        const d = res.data;
        if (d?.success && d?.data?.access_token) {
          await setToken(d.data.access_token);
          signIn(d.data.user, d.data.access_token);
        } else {
          Alert.alert('Error', d?.message || 'Login failed');
        }
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>TecHaven</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {useOtp ? (
          <TextInput
            style={styles.input}
            placeholder="Phone or email (+265991234567)"
            placeholderTextColor="#64748b"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? '...' : useOtp ? 'Send OTP' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setUseOtp((v) => !v)} style={styles.link}>
          <Text style={styles.linkText}>{useOtp ? 'Sign in with password instead' : 'Sign in with OTP instead'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
          <Text style={styles.linkText}>Create account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    marginBottom: 12,
    fontSize: 16,
  },
  button: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#22c55e', fontSize: 14 },
});
