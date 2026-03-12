import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { user as userApi } from '../../api/client';

export default function EditProfileScreen() {
  const nav = useNavigation();
  const { user, updateUser } = useAuth();
  const [full_name, setFullName] = useState(user?.full_name || user?.name || '');
  const [phone_number, setPhoneNumber] = useState(user?.phone_number || user?.phone || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!full_name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setLoading(true);
    try {
      const res = await userApi.updateProfile({ full_name: full_name.trim(), phone_number: phone_number.trim() || undefined });
      if (res.data?.success && res.data?.data) {
        updateUser(res.data.data);
        Alert.alert('Done', 'Profile updated');
        nav.goBack();
      } else {
        Alert.alert('Error', res.data?.message || 'Update failed');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit profile</Text>
      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#64748b"
        value={full_name}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone (+265...)"
        placeholderTextColor="#64748b"
        value={phone_number}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <TouchableOpacity style={styles.button} onPress={save} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '...' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 56 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
