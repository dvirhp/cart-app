import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Platform,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { forgotPassword, resetPassword } from '../../api/client';

// Helper to show alerts cross-platform
const show = (t, m) =>
  Platform.OS === 'web' ? window.alert(`${t}\n${m}`) : Alert.alert(t, m);

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();

  // Steps: 1 = request reset by email, 2 = enter code + new password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  async function requestReset() {
    if (!email) return show('שגיאה', 'אנא הזן כתובת אימייל');

    try {
      const res = await forgotPassword(email);
      if (res.ok) {
        show('הצלחה', 'אם המייל קיים במערכת נשלח קוד איפוס (בדוק את השרת)');
        setStep(2);
      } else {
        show('שגיאה', res.error || 'הבקשה נכשלה');
      }
    } catch (err) {
      show('שגיאה', err.message || 'הבקשה נכשלה');
    }
  }

  async function handleResetPassword() {
    if (!inputCode || !newPassword || !confirm)
      return show('שגיאה', 'יש למלא את כל השדות');
    if (newPassword !== confirm) return show('שגיאה', 'הסיסמאות אינן תואמות');

    try {
      const res = await resetPassword(email, inputCode, newPassword);
      if (res.ok) {
        show('הצלחה', 'הסיסמה עודכנה בהצלחה!');
        navigation.replace('Login');
      } else {
        show('שגיאה', res.error || 'האיפוס נכשל');
      }
    } catch (err) {
      show('שגיאה', err.message || 'האיפוס נכשל');
    }
  }

  return (
    <View style={[styles.container, theme.container]}>
      {/* Back button on the LEFT for Hebrew apps */}
      <TouchableOpacity
        onPress={() => navigation.replace('Login')}
        style={styles.backButton}
      >
        <Text style={[styles.backText, { color: theme.text.color }]}>
          חזרה ←
        </Text>
      </TouchableOpacity>

      {step === 1 ? (
        <>
          <Text style={[styles.title, theme.text]}>שכחתי סיסמה</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="הכנס את כתובת האימייל שלך"
            placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
            style={[styles.input, { color: theme.text.color }]}
            textAlign={I18nManager.isRTL ? 'right' : 'left'}
          />
          <Button title="שלח קוד איפוס" onPress={requestReset} />
        </>
      ) : (
        <>
          <Text style={[styles.title, theme.text]}>הזן קוד איפוס</Text>
          <TextInput
            value={inputCode}
            onChangeText={setInputCode}
            keyboardType="numeric"
            placeholder="קוד אימות"
            placeholderTextColor="#999"
            style={[styles.input, { color: theme.text.color }]}
            textAlign={I18nManager.isRTL ? 'right' : 'left'}
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="סיסמה חדשה"
            placeholderTextColor="#999"
            style={[styles.input, { color: theme.text.color }]}
            textAlign={I18nManager.isRTL ? 'right' : 'left'}
          />
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="אישור סיסמה חדשה"
            placeholderTextColor="#999"
            style={[styles.input, { color: theme.text.color }]}
            textAlign={I18nManager.isRTL ? 'right' : 'left'}
          />
          <Button title="אפס סיסמה" onPress={handleResetPassword} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, direction: 'rtl' },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  backButton: { position: 'absolute', top: 40, left: 20 }, // Left side for Hebrew UX
  backText: { fontSize: 18, fontWeight: '500' },
});
