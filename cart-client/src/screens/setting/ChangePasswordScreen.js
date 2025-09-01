import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../api/client';

export default function ChangePasswordScreen({ navigation }) {
  const { token } = useAuth();
  const { theme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /* ---------- Handle form submission ---------- */
  const handleSubmit = async () => {
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Alert.alert('Error', 'All fields are required');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Error', 'New passwords do not match');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters');
    }

    try {
      setLoading(true);

      // Call API to change password
      const res = await changePassword(token, {
        currentPassword,
        newPassword,
      });

      if (res?.success) {
        Alert.alert('✅ Success', 'Password updated successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.error || 'Failed to change password');
      }
    } catch (e) {
      console.error('❌ Change password error:', e);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Render a single password field ---------- */
  const renderField = (label, value, setValue, placeholder) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.label, theme.text]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        secureTextEntry
        placeholder={placeholder}
        placeholderTextColor={theme.text.color === '#fff' ? '#888' : '#555'}
        style={[
          styles.input,
          {
            color: value ? theme.text.color : '#999', // Default to grey if empty
          },
        ]}
      />
    </View>
  );

  /* ---------- Render UI ---------- */
  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      {/* Back navigation */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={theme.text.color} />
      </TouchableOpacity>

      {/* Form fields */}
      <View style={{ padding: 24 }}>
        {renderField('Current Password', currentPassword, setCurrentPassword, 'Enter current password')}
        {renderField('New Password', newPassword, setNewPassword, 'Enter new password')}
        {renderField('Confirm New Password', confirmPassword, setConfirmPassword, 'Confirm new password')}

        {/* Submit button */}
        <View style={{ marginTop: 24 }}>
          <Button
            title={loading ? 'Updating...' : 'Save New Password'}
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { padding: 16, alignSelf: 'flex-start' },
  fieldRow: { marginBottom: 16 },
  label: { marginBottom: 6, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    borderColor: '#aaa',
  },
});
