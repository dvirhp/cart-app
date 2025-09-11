import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { joinByCode } from '../../api/familyApi';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';

/* --- Screen for joining a family by code --- */
export default function JoinFamilyScreen({ navigation }) {
  const { theme } = useTheme();
  const { token } = useAuth();

  const [code, setCode] = useState('');
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  // --- Handle join family request ---
  async function handleJoin() {
    setErr('');
    if (!code.trim()) {
      setErr('אנא הזן קוד הצטרפות.');
      return;
    }

    const res = await joinByCode(code.trim(), token);

    if (res.familyId) {
      // Reset form and show success state
      setCode('');
      setSuccess(true);
    } else {
      setErr(res.error || 'הצטרפות למשפחה נכשלה.');
    }
  }

  // --- Success state after joining ---
  if (success) {
    return (
      <View style={[styles.container, theme.container]}>
        <Text style={[styles.success, { color: '#2e7d32' }]}>
          הצטרפת בהצלחה 🎉
        </Text>

        {/* Back button at bottom-left */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={22} color="#fff" />
          <Text style={styles.backText}>חזור</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Join family form ---
  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>הצטרפות למשפחה</Text>

      {/* Join code input (RTL alignment + Hebrew placeholder) */}
      <TextInput
        style={[
          styles.input, 
          { color: theme.text.color, borderColor: '#ccc', textAlign: 'right' }
        ]}
        placeholder="קוד הצטרפות"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoFocus
      />

      {/* Submit button */}
      <Button title="הצטרף" onPress={handleJoin} />

      {/* Error message */}
      {err ? <Text style={styles.error}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 12, 
    textAlign: 'right' // ensure RTL alignment
  },
  success: { 
    fontSize: 18, 
    fontWeight: '700', 
    textAlign: 'center' 
  },
  error: { 
    marginTop: 8, 
    color: '#c62828', 
    textAlign: 'center' 
  },
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4caf50",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 6,
  },
});
