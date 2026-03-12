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
  ScrollView,
} from 'react-native';
import { auth, setToken } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuth();
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [password_confirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!full_name.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    if (!email.trim() && !phone_number.trim()) {
      Alert.alert('Error', 'Email or phone number is required');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== password_confirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const body = {
        full_name: full_name.trim(),
        email: email.trim() || undefined,
        phone_number: phone_number.trim() || undefined,
        password,
        password_confirmation,
      };
      const res = await auth.register(body);
      const d = res.data;
      if (d?.success && d?.data?.access_token) {
        await setToken(d.data.access_token);
        signIn(d.data.user, d.data.access_token);
      } else if (d?.success && d?.data?.user && !d?.data?.access_token) {
        navigation.navigate('VerifyOtp', {
          identifier: d.data.user?.email || d.data.user?.phone_number || email || phone_number,
          flow: 'signup',
        });
      } else {
        Alert.alert('Error', d?.message || 'Registration failed');
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : e.message;
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#64748b" value={full_name} onChangeText={setFullName} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone (+265991234567)"
            placeholderTextColor="#64748b"
            value={phone_number}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6)"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#64748b"
            value={password_confirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? '...' : 'Register'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, paddingBottom: 48 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 },
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
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#22c55e', fontSize: 14 },
});
