import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Platform } from 'react-native';
import { login } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const show = (t, m) => (Platform.OS === 'web' ? window.alert(`${t}\n${m}`) : Alert.alert(t, m));

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('demo@cart.app');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      const data = await login(email.trim(), password);
      await signIn(data);
    } catch (e) {
      const status = e?.response?.status;
      const payload = e?.response?.data;
      // If the email is not verified, the server returns 403 + verifyRequired
      if (status === 403 && payload?.verifyRequired) {
        show('Verification required', 'Your email is not verified. Please enter the code sent to you.');
        navigation.replace('VerifyEmail', { email: payload.email || email.trim() });
        return;
      }
      show('Login failed', payload?.error || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Login</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <Button title={loading ? '...' : 'Login'} onPress={onSubmit} disabled={loading} />
      <View style={{ height: 8 }} />
      <Button title="Don't have an account? Register" onPress={() => navigation.navigate('Register')} />
    </View>
  );
}
