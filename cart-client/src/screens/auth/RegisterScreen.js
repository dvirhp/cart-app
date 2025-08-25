import React, { useState } from 'react';
import { 
  View, Text, TextInput, Button, Alert, 
  Platform, StyleSheet, ScrollView, SafeAreaView 
} from 'react-native';
import { register } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const DatePicker = ({ date, setDate }) => {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={date.toISOString().split('T')[0]}
        onChange={(e) => setDate(new Date(e.target.value))}
        style={{
          padding: 12,
          borderRadius: 8,
          border: '1px solid #ccc',
          width: '100%',
          marginTop: 8,
          marginBottom: 12,
        }}
      />
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Button title="Select Birth Date" onPress={() => setShow(true)} />
      <Text style={{ marginTop: 8 }}>Selected: {date.toDateString()}</Text>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
    </View>
  );
};

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
  const [birthDate, setBirthDate] = useState(new Date());

  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  const { theme } = useTheme();

  const validate = () => {
    if (!firstName.trim()) return 'First name is required';
    if (!lastName.trim()) return 'Last name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Invalid email format';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (!/^[0-9]{9,15}$/.test(phone)) return 'Phone number must be digits (9–15)';
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

      const formattedDate = birthDate.toISOString().split('T')[0]; // ⬅️ תמיד פורמט YYYY-MM-DD

      const res = await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: formattedDate,
        phone: phone.trim(),
        address: address.trim(),
      });

      if (res?.verifyRequired) {
        showAlert('Almost there', 'A verification code has been sent to your email');
        navigation.replace('VerifyEmail', { email: email.trim() });
        return;
      }

      showAlert('Registered', 'You can now log in with your credentials');
      navigation.replace('Login');
    } catch (e) {
      // אם זה validation של השרת
      if (e?.response?.data?.errors) {
        const serverErrors = e.response.data.errors.map(err => `${err.path}: ${err.msg}`).join('\n');
        setInlineError(serverErrors);
        showAlert('Registration Error', serverErrors);
      } else {
        const serverError =
          e?.response?.data?.error ||
          e?.message ||
          'Registration failed';
        setInlineError(serverError);
        showAlert('Registration Error', serverError);
      }
      console.log('REGISTER → error', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, theme.container]}>
        <Text style={[styles.title, theme.text]}>Register</Text>

        {/* First name */}
        <Text style={[styles.label, theme.text]}>
          First Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color }]}
        />

        {/* Last name */}
        <Text style={[styles.label, theme.text]}>
          Last Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color }]}
        />

        {/* Email */}
        <Text style={[styles.label, theme.text]}>
          Email <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color }]}
        />

        {/* Password */}
        <Text style={[styles.label, theme.text]}>
          Password <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password (6+ characters)"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color }]}
        />

        {/* Phone */}
        <Text style={[styles.label, theme.text]}>
          Phone <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Phone number"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color }]}
        />

        {/* Address */}
        <Text style={[styles.label, theme.text]}>Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Address (optional)"
          placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
          style={[styles.input, { color: theme.text.color }]}
        />

        {/* Birthdate */}
        <Text style={[styles.label, theme.text]}>
          Birth Date <Text style={styles.required}>*</Text>
        </Text>
        <DatePicker date={birthDate} setDate={setBirthDate} />

        {/* Error */}
        {inlineError ? <Text style={{ color: 'red', marginBottom: 12 }}>{inlineError}</Text> : null}

        {/* Submit */}
        <Button title={loading ? '...' : 'Register'} onPress={onSubmit} disabled={loading} />

        <View style={{ height: 8 }} />

        {/* Link to login */}
        <Button title="Already have an account? Login" onPress={() => navigation.navigate('Login')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 14, marginBottom: 4 },
  required: { color: 'red' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
