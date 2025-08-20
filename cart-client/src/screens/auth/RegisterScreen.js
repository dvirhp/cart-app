import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Platform } from 'react-native';
import { register } from '../../api/client';

// Small helper to show alerts both on web and native
const showAlert = (title, msg) => {
  if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
  else Alert.alert(title, msg);
};

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  // Very basic client-side validation
  const validate = () => {
    if (!displayName.trim()) return 'Display name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    return null;
  };

  const onSubmit = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      setInlineError(errorMsg);
      showAlert('Error', errorMsg);
      return;
    }
    setInlineError(null);

    try {
      setLoading(true);
      const res = await register(email.trim(), password, displayName.trim());

      // If the backend requires email verification, send user to Verify screen
      if (res?.verifyRequired) {
        showAlert('Almost there', 'A verification code has been sent to your email');
        navigation.replace('VerifyEmail', { email: email.trim() });
        return;
      }

      // Fallback: in case backend returns a token right away in the future
      showAlert('Registered', 'You can now log in with your credentials');
      navigation.replace('Login');
    } catch (e) {
      const serverError =
        e?.response?.data?.error ||
        e?.response?.data?.errors?.[0]?.msg ||
        e?.message ||
        'Registration failed';

      setInlineError(serverError);
      showAlert('Registration Error', serverError);
      console.log('REGISTER → error', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Register</Text>

      {/* Display name input */}
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display name"
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />

      {/* Email input */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />

      {/* Password input */}
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password (6+ characters)"
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />

      {/* Inline error message */}
      {inlineError ? <Text style={{ color: 'red' }}>{inlineError}</Text> : null}

      {/* Submit button */}
      <Button title={loading ? '...' : 'Register'} onPress={onSubmit} disabled={loading} />

      <View style={{ height: 8 }} />

      {/* Link to login */}
      <Button title="Already have an account? Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}
