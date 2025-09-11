import React, { useState } from 'react';
import { 
  View, Text, TextInput, Button, Platform, Alert, StyleSheet 
} from 'react-native';
import { verifyEmail, resendCode } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Cross-platform alert helper
const show = (title, message) =>
  Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);

export default function VerifyEmailScreen({ route, navigation }) {
  const { email: initialEmail } = route.params || {};
  const { signIn } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle email verification
  const onVerify = async () => {
    if (!email.trim() || code.trim().length !== 6) {
      return show('שגיאה', 'אנא הזן אימייל וקוד בן 6 ספרות');
    }

    try {
      setLoading(true);
      const data = await verifyEmail(email.trim(), code.trim());

      // If server responds with token + user → update context and navigate to main app
      if (data?.token && data?.user) {
        await signIn(data);
      } else {
        show('שגיאה', 'האימות נכשל: תגובת שרת לא תקינה');
      }
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        (Array.isArray(e?.response?.data?.errors) &&
          e.response.data.errors.map(err => `${err.param}: ${err.msg}`).join('\n')) ||
        'האימות נכשל';
      show('שגיאה', msg);
      console.log('VERIFY ERROR:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle resend code
  const onResend = async () => {
    if (!email.trim()) return show('שגיאה', 'אנא הזן אימייל');

    try {
      await resendCode(email.trim());
      show('נשלח', 'קוד אימות חדש נשלח למייל שלך');
    } catch (e) {
      const msg = e?.response?.data?.error || 'שליחה נכשלה';
      show('שגיאה', msg);
      console.log('RESEND ERROR:', e?.response?.data || e.message);
    }
  };

  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>אימות מייל</Text>

      {/* Email input → LTR */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="אימייל"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        style={[
          styles.input,
          { color: theme.text.color, borderColor: '#ccc', textAlign: 'left', writingDirection: 'ltr' },
        ]}
      />

      {/* 6-digit verification code → LTR */}
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="קוד בן 6 ספרות"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        maxLength={6}
        style={[
          styles.input,
          { color: theme.text.color, borderColor: '#ccc', letterSpacing: 6, textAlign: 'left', writingDirection: 'ltr' },
        ]}
      />

      {/* Verify button */}
      <Button title={loading ? '...' : 'אמת'} onPress={onVerify} disabled={loading} />

      <View style={{ height: 8 }} />

      {/* Resend code button */}
      <Button title="שלח קוד מחדש" onPress={onResend} />

      <View style={{ height: 8 }} />

      {/* Back to login */}
      <Button title="חזרה למסך התחברות" onPress={() => navigation.replace('Login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12, direction: 'rtl' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
});
