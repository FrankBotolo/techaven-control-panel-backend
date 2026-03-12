import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shippingAddresses } from '../../api/client';

export default function AddressFormScreen({ route }) {
  const nav = useNavigation();
  const edit = route.params?.id != null;
  const id = route.params?.id;
  const onSave = route.params?.onSave;

  const [full_name, setFullName] = useState(route.params?.full_name || '');
  const [phone, setPhone] = useState(route.params?.phone || '');
  const [address, setAddress] = useState(route.params?.address || '');
  const [city, setCity] = useState(route.params?.city || '');
  const [postal_code, setPostalCode] = useState(route.params?.postal_code || '265');
  const [country, setCountry] = useState(route.params?.country || 'Malawi');
  const [is_default, setIsDefault] = useState(!!route.params?.is_default);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!full_name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Error', 'Fill required fields');
      return;
    }
    setLoading(true);
    try {
      if (edit && id) {
        await shippingAddresses.update(id, { full_name, phone, address, city, postal_code, country, is_default });
        Alert.alert('Done', 'Address updated');
      } else {
        await shippingAddresses.create({ full_name, phone, address, city, postal_code, country, is_default });
        Alert.alert('Done', 'Address added');
      }
      onSave?.();
      nav.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>{edit ? 'Edit address' : 'New address'}</Text>
      <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#64748b" value={full_name} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Phone (+265...)" placeholderTextColor="#64748b" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Address" placeholderTextColor="#64748b" value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="City" placeholderTextColor="#64748b" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="Postal code" placeholderTextColor="#64748b" value={postal_code} onChangeText={setPostalCode} />
      <TextInput style={styles.input} placeholder="Country" placeholderTextColor="#64748b" value={country} onChangeText={setCountry} />
      <TouchableOpacity style={styles.button} onPress={save} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '...' : edit ? 'Update' : 'Add address'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, paddingBottom: 48 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
