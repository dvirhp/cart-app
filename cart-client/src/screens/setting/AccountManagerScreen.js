import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Button,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, api, BASE_URL } from '../../api/client';
import { deleteAccount } from '../../api/client';


function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function AccountManagerScreen({ navigation }) {
  const { user, token, updateUser, signOut  } = useAuth();
  const { theme } = useTheme();

  const [avatar, setAvatar] = useState(user?.avatar || null);

  const initial = useMemo(() => ({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
    address:   user?.address   || '',
    birthDate: user?.birthDate ? String(user.birthDate).split('T')[0] : '',
  }), [user]);

  const [fields, setFields] = useState(initial);
  const [original, setOriginal] = useState(initial);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleChange = (field, value) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ מתוקן – שליחת FormData עם קובץ
  const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (!result.canceled) {
    const uri = result.assets[0].uri;
    setAvatar(uri); // ✅ show preview immediately

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // 🖥️ Web: convert URI to Blob
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('avatar', blob, 'avatar.jpg');
      } else {
        // 📱 Mobile: send object with uri + type + name
        formData.append('avatar', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });
      }

      const res = await fetch(`${BASE_URL}/api/v1/auth/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // ❗ no Content-Type
        body: formData,
      });

      const text = await res.text(); // debug in case response is not JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("❌ Server returned non-JSON:", text);
        throw new Error("Invalid server response");
      }

      if (data?.user) {
        updateUser(data.user); // עדכון ה-context
        setAvatar(data.user.avatar); // שמירת ה-URL שהתקבל מהשרת
        Alert.alert('✅ Success', 'Profile picture updated');
      } else {
        Alert.alert('Error', data?.error || 'Upload failed');
      }
    } catch (err) {
      console.error('❌ Avatar upload failed:', err);
      Alert.alert('Error', 'Failed to update profile picture');
    }
  }
};

const handleDelete = async () => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      console.log("🔑 Token before delete request:", token);

      const res = await deleteAccount(token);
      if (res?.success) {
        alert('✅ Deleted: Your account has been deleted');
        await signOut();

      } else {
        alert('Error: ' + (res?.error || 'Failed to delete account'));
      }
    } catch (err) {
      console.error('❌ Delete error:', err);
      alert('Server error while deleting account');
    }
  } else {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log("🔑 Token before delete request:", token);

              const res = await deleteAccount(token);
              if (res?.success) {
                Alert.alert('✅ Deleted', 'Your account has been deleted');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else {
                Alert.alert('Error', res?.error || 'Failed to delete account');
              }
            } catch (err) {
              console.error('❌ Delete error:', err);
              Alert.alert('Error', 'Server error while deleting account');
            }
          },
        },
      ]
    );
  }
};



  const isChanged = () =>
    fields.firstName !== original.firstName ||
    fields.lastName  !== original.lastName  ||
    fields.email     !== original.email     ||
    fields.phone     !== original.phone     ||
    fields.address   !== original.address   ||
    (fields.birthDate || '') !== (original.birthDate || '');

  const handleSave = async () => {
    try {
      setLoading(true);

      if (fields.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate)) {
        Alert.alert('שגיאה', 'תאריך לא תקין. פורמט נדרש: YYYY-MM-DD');
        return;
      }

      const payload = { ...fields };
      const res = await updateProfile(token, payload);

      if (res?.user) {
        const updated = {
          firstName: res.user.firstName || '',
          lastName:  res.user.lastName  || '',
          email:     res.user.email     || '',
          phone:     res.user.phone     || '',
          address:   res.user.address   || '',
          birthDate: res.user.birthDate ? String(res.user.birthDate).split('T')[0] : '',
        };
        setFields(updated);
        setOriginal(updated);
        setEditing({});
      }
      updateUser(res.user);

      Alert.alert('✅ Success', 'Profile updated successfully');
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (e) {
      console.error('❌ Update error:', e?.response?.data || e.message);
      Alert.alert('Error', e?.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, field, secure = false) => {
    if (field === 'birthDate') {
      return (
        <View style={styles.fieldRow} key={field}>
          <Text style={[styles.label, theme.text]}>{label}</Text>
          <View style={styles.inputWrapper}>
            <Text style={[styles.input, { color: editing[field] ? theme.text.color : '#999' }]}>
              {fields.birthDate || 'YYYY-MM-DD'}
            </Text>
            <TouchableOpacity
              onPress={() => setEditing((prev) => ({ ...prev, [field]: !prev[field] }))}
            >
              <Icon name="pencil" size={20} color={theme.text.color} />
            </TouchableOpacity>
          </View>

          {editing[field] && (
            Platform.OS === 'web' ? (
              <input
                type="date"
                value={fields.birthDate || ''}
                max={todayStr()}
                onChange={(e) => handleChange('birthDate', e.target.value || '')}
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderStyle: 'solid',
                  borderRadius: 8,
                  color: '#111',
                  backgroundColor: 'white',
                }}
              />
            ) : (
              <DateTimePicker
                value={fields.birthDate ? new Date(fields.birthDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const y = selectedDate.getFullYear();
                    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const d = String(selectedDate.getDate()).padStart(2, '0');
                    handleChange('birthDate', `${y}-${m}-${d}`);
                  }
                }}
              />
            )
          )}
        </View>
      );
    }

    return (
      <View style={styles.fieldRow} key={field}>
        <Text style={[styles.label, theme.text]}>{label}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value={fields[field]}
            onChangeText={(v) => handleChange(field, v)}
            editable={!!editing[field]}
            secureTextEntry={secure}
            style={[
              styles.input,
              { color: editing[field] ? theme.text.color : '#999' },
            ]}
          />
          <TouchableOpacity
            onPress={() => setEditing((prev) => ({ ...prev, [field]: !prev[field] }))}
          >
            <Icon name="pencil" size={20} color={theme.text.color} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      {showSaved && (
        <View style={styles.savedBanner}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Saved ✔</Text>
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color={theme.text.color} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={{ position: 'relative' }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="person-outline" size={60} color="#666" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Icon name="camera-outline" size={18} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {renderField('First Name', 'firstName')}
        {renderField('Last Name', 'lastName')}
        {renderField('Email', 'email')}
        {renderField('Phone', 'phone')}
        {renderField('Address', 'address')}
        {renderField('Birth Date', 'birthDate')}

        <View style={{ marginTop: 24, marginHorizontal: 24 }}>
          <Button
            title={loading ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={loading || !isChanged()}
          />
        </View>

        <View style={{ marginTop: 12, marginHorizontal: 24 }}>
          <Button
            title="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
            color="#d9534f"
          />
        </View>
        <View style={{ marginTop: 12, marginHorizontal: 24 }}>
  <Button
    title="Delete Account"
    onPress={handleDelete}
    color="#b22222"
  />
</View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { padding: 16, alignSelf: 'flex-start' },
  profileSection: { alignItems: 'center', marginVertical: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ddd' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 6,
  },
  fieldRow: { marginBottom: 16, paddingHorizontal: 24 },
  label: { marginBottom: 6, fontSize: 14 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  input: { flex: 1, padding: 10 },
  savedBanner: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 50,
  },
});
