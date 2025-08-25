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
import { updateProfile } from '../../api/client';

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function AccountManagerScreen({ navigation }) {
  const { user, token } = useAuth();
  const { theme } = useTheme();

  const [avatar, setAvatar] = useState(user?.avatar || null);

  // נשתמש במחרוזת YYYY-MM-DD ולא באובייקט Date כדי למנוע קריסות ב-web
  const initial = useMemo(() => ({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
    address:   user?.address   || '',
    birthDate: user?.birthDate ? String(user.birthDate).split('T')[0] : '', // "YYYY-MM-DD"
  }), [user]);

  const [fields, setFields] = useState(initial);
  const [original, setOriginal] = useState(initial);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleChange = (field, value) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      // אם תרצה לשמור גם שרתית, נפתח endpoint להעלאת תמונה/URL
    }
  };

  const isChanged = () => {
    return (
      fields.firstName !== original.firstName ||
      fields.lastName  !== original.lastName  ||
      fields.email     !== original.email     ||
      fields.phone     !== original.phone     ||
      fields.address   !== original.address   ||
      (fields.birthDate || '') !== (original.birthDate || '')
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // ולידציה בסיסית לתאריך (אם מולא)
      if (fields.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate)) {
        Alert.alert('שגיאה', 'תאריך לא תקין. פורמט נדרש: YYYY-MM-DD');
        return;
      }

      const payload = { ...fields }; // birthDate כבר כמחרוזת נכונה

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
        setOriginal(updated);   // כדי שהכפתור יחזור להיות מנוטרל
        setEditing({});         // סגירת מצבי עריכה
      }
      updateUser(res.user); // 👈 יעדכן גם את AuthContext וגם את AsyncStorage

      // פידבק כפול: Alert וגם בנר קטן
      try { Alert.alert('✅ Success', 'Profile updated successfully'); } catch {}
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      // באג של "נשמר אבל אחרי Logout זה נעלם" קורה אם אתה קורא לנתיב לא נכון:
      // וודא שה-API ב-client מצביע על '/auth/me/update' ולא על '/users/me/update'
    } catch (e) {
      console.error('❌ Update error:', e?.response?.data || e.message);
      const msg =
        e?.response?.data?.error ||
        (Array.isArray(e?.response?.data?.errors) &&
          e.response.data.errors.map((err) => `${err.path}: ${err.msg}`).join('\n')) ||
        'Update failed';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, field, secure = false) => {
    if (field === 'birthDate') {
      return (
        <View style={styles.fieldRow} key={field}>
          <Text style={[styles.label, theme.text]}>{label}</Text>

          {/* שורה תצוגתית + עיפרון */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.input, { color: theme.text.color }]}>
              {fields.birthDate || 'YYYY-MM-DD'}
            </Text>
            <TouchableOpacity
              onPress={() => setEditing((prev) => ({ ...prev, [field]: !prev[field] }))}
            >
              <Icon name="pencil" size={20} color={theme.text.color} />
            </TouchableOpacity>
          </View>

          {/* עורך – רק כשבמצב עריכה */}
          {editing[field] && (
            Platform.OS === 'web' ? (
              // HTML5 date input (פותח תאריכון בדפדפן)
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

    // שדות רגילים
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
              {
                color: theme.text.color,
                backgroundColor: editing[field] ? '#fff1' : '#ccc1',
              },
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
      {/* בנר הצלחה קטן */}
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
