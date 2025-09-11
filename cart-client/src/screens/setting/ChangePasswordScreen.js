import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  I18nManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../api/client';

// ✅ Password change screen with inline errors in Hebrew
// ✅ "הסיסמה הנוכחית שגויה" מוצג מתחת לשדה סיסמה קודמת

export default function ChangePasswordScreen({ navigation }) {
  const { token } = useAuth();
  const { theme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

/* --- Handle form submission --- */
const handleSubmit = async () => {
  let newErrors = {};

  if (!currentPassword) newErrors.currentPassword = 'יש להזין סיסמה קודמת';
  if (!newPassword) newErrors.newPassword = 'יש להזין סיסמה חדשה';
  if (!confirmPassword) newErrors.confirmPassword = 'יש להזין אימות סיסמה חדשה';
  if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    newErrors.confirmPassword = 'הסיסמאות אינן תואמות';
  }
  if (newPassword && newPassword.length < 6) {
    newErrors.newPassword = 'הסיסמה חייבת להכיל לפחות 6 תווים';
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  try {
    setLoading(true);
    setErrors({});

    const res = await changePassword(token, {
      currentPassword,
      newPassword,
    });

    // ✅ טיפול בשגיאות מהשרת
    if (res?.error) {
      if (res.error.includes('הסיסמה הנוכחית')) {
        setErrors({ currentPassword: 'הסיסמה הקודמת שהוזנה אינה נכונה' });
      } else {
        setErrors({ general: res.error });
      }
    } else if (res?.success) {
      navigation.goBack();
    } else {
      setErrors({ general: 'עדכון הסיסמה נכשל' });
    }
  } catch (e) {
    console.error('❌ Change password error:', e);
    setErrors({ general: 'אירעה תקלה, נסה שוב מאוחר יותר' });
  } finally {
    setLoading(false);
  }
};


  /* --- Render field with label and inline error --- */
  const renderField = (label, field, value, setValue) => (
    <View style={styles.fieldRow} key={field}>
      <Text style={[styles.label, theme.text]}>
        {label} {errors[field] && <Text style={{ color: 'red' }}>*</Text>}
      </Text>
      <View style={styles.inputWrapper}>
        <Icon
          name="lock-closed-outline"
          size={20}
          color={theme.text.color}
          style={styles.icon}
        />
        <TextInput
          value={value}
          onChangeText={(v) => {
            setValue(v);
            setErrors((prev) => ({ ...prev, [field]: null }));
          }}
          secureTextEntry
          style={[
            styles.input,
            {
              color: theme.text.color,
              textAlign: 'right',
              direction: I18nManager.isRTL ? 'rtl' : 'ltr',
              borderColor: errors[field] ? 'red' : '#aaa',
            },
          ]}
        />
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={[styles.title, theme.text]}>שינוי סיסמה</Text>

        {/* Fields */}
        {renderField('סיסמה קודמת', 'currentPassword', currentPassword, setCurrentPassword)}
        {renderField('סיסמה חדשה', 'newPassword', newPassword, setNewPassword)}
        {renderField('אימות סיסמה חדשה', 'confirmPassword', confirmPassword, setConfirmPassword)}

        {/* Global error */}
        {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

        {/* Submit button */}
        <View style={{ marginTop: 24 }}>
          <Button
            title={loading ? 'מעדכן...' : 'שמור סיסמה חדשה'}
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* --- Styles --- */
const styles = StyleSheet.create({
  container: { flex: 1, direction: 'rtl' },
  scrollContent: { padding: 24, paddingBottom: 100 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 20,
  },
  fieldRow: { marginBottom: 20 },
  label: { fontSize: 14, textAlign: 'right', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  input: { flex: 1, padding: 10 },
  icon: { marginLeft: 8 },
  errorText: { color: 'red', fontSize: 12, marginTop: 4, textAlign: 'right' },
});
