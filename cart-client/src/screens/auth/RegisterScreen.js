import React, { useState } from 'react';
import { 
  View, Text, TextInput, Button, Alert, 
  Platform, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity
} from 'react-native';
import { register } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

/* ---------- Custom DatePicker ---------- */
const DatePicker = ({ date, setDate, theme }) => {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={date ? date.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          const value = e.target.value;
          if (value) setDate(new Date(value));
        }}
        style={{
          padding: 12,
          borderRadius: 8,
          border: '1px solid #ccc',
          width: '100%',
          marginTop: 8,
          marginBottom: 12,
          backgroundColor: theme.container.backgroundColor,
          color: theme.text.color,
          direction: 'rtl',
          textAlign: 'right',
        }}
      />
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Button title="בחר תאריך לידה" onPress={() => setShow(true)} />
      <Text style={{ marginTop: 8, color: theme.text.color }}>
        נבחר: {date instanceof Date ? date.toDateString() : 'לא נבחר תאריך'}
      </Text>

      {show && (
        <DateTimePicker
          value={date instanceof Date ? date : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShow(false);
            if (event.type === 'dismissed') return;
            if (!selectedDate) return;
            setDate(new Date(selectedDate));
          }}
        />
      )}
    </View>
  );
};

// Cross-platform alert helper
const showAlert = (title, msg) => {
  if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
  else Alert.alert(title, msg);
};

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('other'); 
  const [birthDate, setBirthDate] = useState(new Date());

  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  const { theme } = useTheme();

  const validate = () => {
    if (!firstName.trim()) return 'יש להזין שם פרטי';
    if (!lastName.trim()) return 'יש להזין שם משפחה';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'פורמט אימייל שגוי';
    if (password.length < 6) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    if (!/^[0-9]{9,15}$/.test(phone)) return 'מספר טלפון חייב להכיל 9–15 ספרות';
    return null;
  };

  const onSubmit = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      setInlineError(errorMsg);
      showAlert('שגיאה', errorMsg);
      return;
    }
    setInlineError(null);

    try {
      setLoading(true);
      const formattedDate = birthDate.toISOString().split('T')[0];

      const res = await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: formattedDate,
        phone: phone.trim(),
        address: address.trim(),
        gender,
      });

      if (res?.verifyRequired) {
        showAlert('כמעט סיימנו', 'נשלח אליך קוד אימות במייל');
        navigation.replace('VerifyEmail', { email: email.trim() });
        return;
      }

      showAlert('נרשמת בהצלחה', 'כעת תוכל להתחבר עם הפרטים שלך');
      navigation.replace('Login');
    } catch (e) {
      const serverError =
        e?.response?.data?.error ||
        e?.message ||
        'ההרשמה נכשלה';
      setInlineError(serverError);
      showAlert('שגיאת הרשמה', serverError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, theme.container]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Back button - top left, scrolls away when moving down */}
        <TouchableOpacity
          onPress={() => navigation.replace('Login')}
          style={{ marginBottom: 20, alignSelf: 'flex-start' }}
        >
          <Text style={[styles.backText, { color: theme.text.color }]}>
            חזרה ←
          </Text>
        </TouchableOpacity>

        <Text style={[styles.title, theme.text]}>הרשמה</Text>

        {/* First name */}
        <Text style={[styles.label, theme.text]}>
          שם פרטי <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="הכנס שם פרטי"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color, textAlign: 'right', writingDirection: 'rtl' }]}
        />

        {/* Last name */}
        <Text style={[styles.label, theme.text]}>
          שם משפחה <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="הכנס שם משפחה"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color, textAlign: 'right', writingDirection: 'rtl' }]}
        />

        {/* Gender */}
        <Text style={[styles.label, theme.text]}>מין</Text>
        {Platform.OS === 'web' ? (
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid #ccc',
              marginBottom: 12,
              width: '100%',
              backgroundColor: theme.container.backgroundColor,
              color: theme.text.color,
              direction: 'rtl',
              textAlign: 'right',
            }}
          >
            <option value="male">זכר</option>
            <option value="female">נקבה</option>
            <option value="other">אחר</option>
          </select>
        ) : (
          <View style={[styles.pickerWrapper, { backgroundColor: theme.container.backgroundColor }]}>
            <Picker
              selectedValue={gender}
              onValueChange={(value) => setGender(value)}
              style={[styles.picker, { color: theme.text.color }]}
              dropdownIconColor={theme.text.color}
            >
              <Picker.Item label="זכר" value="male" />
              <Picker.Item label="נקבה" value="female" />
              <Picker.Item label="אחר" value="other" />
            </Picker>
          </View>
        )}

        {/* Email */}
        <Text style={[styles.label, theme.text]}>
          אימייל <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="הכנס כתובת אימייל"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color, textAlign: 'right', writingDirection: 'rtl' }]}
        />

        {/* Password */}
        <Text style={[styles.label, theme.text]}>
          סיסמה <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="סיסמה (לפחות 6 תווים)"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color, textAlign: 'right', writingDirection: 'rtl' }]}
        />

        {/* Phone */}
        <Text style={[styles.label, theme.text]}>
          טלפון <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="מספר טלפון"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color, textAlign: 'right', writingDirection: 'rtl' }]}
        />

        {/* Address */}
        <Text style={[styles.label, theme.text]}>כתובת</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="כתובת (לא חובה)"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color, textAlign: 'right', writingDirection: 'rtl' }]}
        />

        {/* Birthdate */}
        <Text style={[styles.label, theme.text]}>
          תאריך לידה <Text style={styles.required}>*</Text>
        </Text>
        <DatePicker date={birthDate} setDate={setBirthDate} theme={theme} />

        {/* Inline error */}
        {inlineError ? <Text style={{ color: 'red', marginBottom: 12 }}>{inlineError}</Text> : null}

        {/* Submit */}
        <Button title={loading ? '...' : 'הרשמה'} onPress={onSubmit} disabled={loading} />

        <View style={{ height: 8 }} />

        {/* Link to login */}
        <Button
          title="כבר יש לך חשבון? התחבר"
          onPress={() => navigation.navigate('Login')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, direction: 'rtl' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  label: { fontSize: 14, marginBottom: 4, textAlign: 'right' },
  required: { color: 'red' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  backText: { fontSize: 18, fontWeight: '500', textAlign: 'left' }, // 👈 מיושר שמאלה
});
