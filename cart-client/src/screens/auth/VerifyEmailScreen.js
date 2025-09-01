import React, { useState } from 'react';
import { View, Text, TextInput, Button, Platform, Alert, StyleSheet } from 'react-native';
import { verifyEmail, resendCode } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Helper function for cross-platform alerts
const show = (title, message) =>
  Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);

export default function VerifyEmailScreen({ route, navigation }) {
  const { email: initialEmail } = route.params || {};
  const { signIn } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    if (!email.trim() || code.trim().length !== 6) {
      return show('Error', 'Please enter an email and a 6-digit code');
    }

    try {
      setLoading(true);
      const data = await verifyEmail(email.trim(), code.trim());

      // אם השרת החזיר token + user → נעדכן את ההקשר ונעבור למסך הראשי
      if (data?.token && data?.user) {
        await signIn(data);
      } else {
        show('Error', 'Verification failed: Invalid response');
      }
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        (Array.isArray(e?.response?.data?.errors) &&
          e.response.data.errors.map(err => `${err.param}: ${err.msg}`).join('\n')) ||
        'Verification failed';
      show('Error', msg);
      console.log('VERIFY ERROR:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email.trim()) return show('Error', 'Please enter an email');

    try {
      await resendCode(email.trim());
      show('Sent', 'A new verification code has been sent to your email');
    } catch (e) {
      const msg = e?.response?.data?.error || 'Resend failed';
      show('Error', msg);
      console.log('RESEND ERROR:', e?.response?.data || e.message);
    }
  };

  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>Verify Email</Text>

      {/* Email input */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        style={[styles.input, { color: theme.text.color, borderColor: '#ccc' }]}
      />

      {/* 6-digit code input */}
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="6-digit code"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        maxLength={6}
        style={[styles.input, { color: theme.text.color, borderColor: '#ccc', letterSpacing: 6 }]} // 👈 ריווח בין ספרות
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
});
