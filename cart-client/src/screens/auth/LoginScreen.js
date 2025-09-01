import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, Alert, Platform, Switch, StyleSheet, TouchableOpacity
} from 'react-native';
import { login } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const show = (t, m) => (Platform.OS === 'web' ? window.alert(`${t}\n${m}`) : Alert.alert(t, m));

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('demo@cart.app');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      const data = await login(email.trim(), password);
      await signIn(data, remember);
    } catch (e) {
      const status = e?.response?.status;
      const payload = e?.response?.data;

      // 👇 החלק הזה שחשוב להחזיר
      if (status === 403 && payload?.verifyRequired) {
        show(
          'Verification required',
          'Your email is not verified. Please enter the code sent to you.'
        );
        navigation.replace('VerifyEmail', { email: payload.email || email.trim() });
        return;
      }

      show('Login failed', payload?.error || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>Login</Text>

      {/* Email input */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        style={[styles.input, { color: theme.text.color }]}
      />

      {/* Password input */}
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        style={[styles.input, { color: theme.text.color }]}
      />

      {/* Remember Me toggle */}
      <View style={styles.rememberRow}>
        <Switch value={remember} onValueChange={setRemember} />
        <Text style={[styles.rememberText, theme.text]}>Remember Me</Text>
      </View>

      {/* Login button */}
      <Button title={loading ? '...' : 'Login'} onPress={onSubmit} disabled={loading} />

      <View style={{ height: 8 }} />

      {/* Register link */}
      <Button title="Don't have an account? Register" onPress={() => navigation.navigate('Register')} />

      {/* Forgot Password link */}
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={[styles.forgotText, theme.text]}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rememberText: { marginLeft: 8, fontSize: 16 },
  forgotText: { marginTop: 16, textAlign: 'center', fontSize: 14, textDecorationLine: 'underline' }
});
