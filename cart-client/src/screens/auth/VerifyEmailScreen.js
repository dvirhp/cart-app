import React, { useState } from 'react';
import { View, Text, TextInput, Button, Platform, Alert } from 'react-native';
import { verifyEmail, resendCode } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Helper function for cross-platform alerts
const show = (title, message) =>
  Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);

export default function VerifyEmailScreen({ route, navigation }) {
  const { email: initialEmail } = route.params || {};
  const { signIn } = useAuth();

  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    // Basic validation
    if (!email || code.length !== 6) {
      return show('Error', 'Please enter an email and a 6-digit code');
    }

    try {
      setLoading(true);
      // Verify code with backend
      const data = await verifyEmail(email.trim(), code.trim());
      // Backend should return token + user → sign-in
      await signIn(data);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Verification failed';
      show('Error', msg);
      console.log('VERIFY ERROR:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email) return show('Error', 'Please enter an email');

    try {
      await resendCode(email.trim());
      show('Sent', 'A new verification code has been sent to your email');
    } catch (e) {
      show('Error', e?.response?.data?.error || 'Resend failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Verify Email</Text>

      {/* Email input */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />

      {/* 6-digit code input */}
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="6-digit code"
        maxLength={6}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />

      {/* Verify button */}
      <Button title={loading ? '...' : 'Verify'} onPress={onVerify} disabled={loading} />

      <View style={{ height: 8 }} />

      {/* Resend code */}
      <Button title="Resend Code" onPress={onResend} />

      <View style={{ height: 8 }} />

      {/* Back to login */}
      <Button title="Back to Login" onPress={() => navigation.replace('Login')} />
    </View>
  );
}
