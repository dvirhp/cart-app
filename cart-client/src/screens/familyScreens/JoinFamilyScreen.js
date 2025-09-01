import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { joinByCode } from '../../api/familyApi';
import { useAuth } from '../../context/AuthContext';

export default function JoinFamilyScreen({ navigation }) {
  const { theme } = useTheme();
  const { token } = useAuth();

  const [code, setCode] = useState('');
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  async function handleJoin() {
    setErr('');
    if (!code.trim()) {
      setErr('Please enter a join code.');
      return;
    }
    const res = await joinByCode(code.trim(), token);
    if (res.familyId) {
      // Clear the screen and show success
      setCode('');
      setSuccess(true);
    } else {
      setErr(res.error || 'Failed to join family.');
    }
  }

  if (success) {
    return (
      <View style={[styles.container, theme.container]}>
        <Text style={[styles.success, { color: '#2e7d32' }]}>Joined successfully</Text>
        <View style={{ height: 10 }} />
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>Join family</Text>
      <TextInput
        style={[styles.input, { color: theme.text.color, borderColor: '#ccc' }]}
        placeholder="Join code"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoFocus
      />
      <Button title="Join" onPress={handleJoin} />
      {err ? <Text style={[styles.error]}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'right' },
  success: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  error: { marginTop: 8, color: '#c62828', textAlign: 'center' },
});
