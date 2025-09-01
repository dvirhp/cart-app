import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { forgotPassword, resetPassword } from '../../api/client';

const show = (t, m) =>
  Platform.OS === 'web' ? window.alert(`${t}\n${m}`) : Alert.alert(t, m);

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();

  const [step, setStep] = useState(1); // 1=enter email, 2=enter code+new password
  const [email, setEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  async function requestReset() {
    if (!email) return show('Error', 'Please enter your email');

    try {
      const res = await forgotPassword(email);
      if (res.ok) {
        show('Success', 'If this email exists, a reset code was sent (check server console)');
        setStep(2);
      } else {
        show('Error', res.error || 'Request failed');
      }
    } catch (err) {
      show('Error', err.message || 'Request failed');
    }
  }

  async function handleResetPassword() {
    if (!inputCode || !newPassword || !confirm)
      return show('Error', 'All fields are required');
    if (newPassword !== confirm)
      return show('Error', 'Passwords do not match');

    try {
      const res = await resetPassword(email, inputCode, newPassword);
      if (res.ok) {
        show('Success', 'Password updated successfully!');
        navigation.replace('Login');
      } else {
        show('Error', res.error || 'Failed to reset password');
      }
    } catch (err) {
      show('Error', err.message || 'Request failed');
    }
  }

  return (
    <View style={[styles.container, theme.container]}>
      {step === 1 ? (
        <>
          <Text style={[styles.title, theme.text]}>Forgot Password</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter your email"
            placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
            style={[styles.input, { color: theme.text.color }]}
          />
          <Button title="Send Reset Code" onPress={requestReset} />
        </>
      ) : (
        <>
          <Text style={[styles.title, theme.text]}>Enter Reset Code</Text>
          <TextInput
            value={inputCode}
            onChangeText={setInputCode}
            keyboardType="numeric"
            placeholder="Enter code"
            placeholderTextColor="#999"
            style={[styles.input, { color: theme.text.color }]}
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="New Password"
            placeholderTextColor="#999"
            style={[styles.input, { color: theme.text.color }]}
          />
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="Confirm New Password"
            placeholderTextColor="#999"
            style={[styles.input, { color: theme.text.color }]}
          />
          <Button title="Reset Password" onPress={handleResetPassword} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
