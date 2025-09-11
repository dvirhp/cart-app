import React, { useMemo, useState, useEffect } from 'react';
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
  I18nManager
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, BASE_URL, deleteAccount } from '../../api/client';

/* --- Helper to format today's date (for validation) --- */
function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function AccountManagerScreen({ navigation }) {
  const { user, token, updateUser, signOut } = useAuth();
  const { theme } = useTheme();

  const [avatar, setAvatar] = useState(user?.avatar || null);

  // ✅ Sync header style with theme
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.container.backgroundColor },
      headerTintColor: theme.text.color,
      headerTitleStyle: { fontWeight: 'bold' },
      title: 'ניהול חשבון',
    });
  }, [navigation, theme]);

  /* --- Initialize profile fields from user --- */
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

  /* --- Avatar upload handler --- */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri);

      try {
        const formData = new FormData();

        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append('avatar', blob, 'avatar.jpg');
        } else {
          formData.append('avatar', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          });
        }

        const res = await fetch(`${BASE_URL}/api/v1/auth/upload-avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("❌ Non-JSON server response:", text);
          throw new Error("Invalid server response");
        }

        if (data?.user) {
          updateUser(data.user);
          setAvatar(data.user.avatar);
          Alert.alert('✅ הצלחה', 'תמונת הפרופיל עודכנה בהצלחה');
        } else {
          Alert.alert('שגיאה', data?.error || 'העלאה נכשלה');
        }
      } catch (err) {
        console.error('❌ Avatar upload failed:', err);
        Alert.alert('שגיאה', 'שגיאה בעדכון תמונת פרופיל');
      }
    }
  };

  /* --- Account deletion handler --- */
  const handleDelete = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו אינה ניתנת לביטול.'
      );
      if (!confirmed) return;

      try {
        const res = await deleteAccount(token);
        if (res?.success) {
          alert('✅ החשבון נמחק בהצלחה');
          await signOut();
        } else {
          alert('שגיאה: ' + (res?.error || 'מחיקה נכשלה'));
        }
      } catch (err) {
        console.error('❌ Delete error:', err);
        alert('שגיאת שרת בעת מחיקה');
      }
    } else {
      Alert.alert(
        'מחיקת חשבון',
        'האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו אינה ניתנת לביטול.',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'כן, מחק',
            style: 'destructive',
            onPress: async () => {
              try {
                const res = await deleteAccount(token);
                if (res?.success) {
                  Alert.alert('✅ נמחק', 'החשבון שלך נמחק בהצלחה');
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                } else {
                  Alert.alert('שגיאה', res?.error || 'מחיקה נכשלה');
                }
              } catch (err) {
                console.error('❌ Delete error:', err);
                Alert.alert('שגיאה', 'שגיאת שרת בעת מחיקה');
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

  /* --- Save profile changes --- */
  const handleSave = async () => {
    try {
      setLoading(true);

      if (fields.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate)) {
        Alert.alert('שגיאה', 'תאריך לא תקין. פורמט נדרש: YYYY-MM-DD');
        return;
      }

      const res = await updateProfile(token, fields);

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

      Alert.alert('✅ הצלחה', 'הפרופיל עודכן בהצלחה');
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (e) {
      console.error('❌ Update error:', e?.response?.data || e.message);
      Alert.alert('שגיאה', e?.response?.data?.error || 'עדכון נכשל');
    } finally {
      setLoading(false);
    }
  };

  /* --- Render profile field row --- */
  const renderField = (label, field, secure = false) => {
    if (field === 'birthDate') {
      return (
        <View style={styles.fieldRow} key={field}>
          <Text style={[styles.label, theme.text]}>{label}</Text>
          <View style={styles.inputWrapper}>
            <Text style={[styles.input, { color: editing[field] ? theme.text.color : '#999' }]}>
              {fields.birthDate || 'תאריך לידה (YYYY-MM-DD)'}
            </Text>
            <TouchableOpacity
              onPress={() => setEditing((prev) => ({ ...prev, [field]: !prev[field] }))}
              style={styles.editIcon} // ✅ edit button far left
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
                  direction: 'rtl',
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
            placeholder={`הכנס ${label}`}
            placeholderTextColor="#999"
            style={[
              styles.input,
              { 
                color: editing[field] ? theme.text.color : '#999',
                textAlign: 'right',
                direction: 'rtl' 
              },
            ]}
          />
          <TouchableOpacity
            onPress={() => setEditing((prev) => ({ ...prev, [field]: !prev[field] }))}
            style={styles.editIcon} // ✅ edit button far left
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
          <Text style={{ color: 'white', fontWeight: '600' }}>נשמר ✔</Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Avatar */}
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

        {/* Profile fields */}
        {renderField('שם פרטי', 'firstName')}
        {renderField('שם משפחה', 'lastName')}
        {renderField('אימייל', 'email')}
        {renderField('טלפון', 'phone')}
        {renderField('כתובת', 'address')}
        {renderField('תאריך לידה', 'birthDate')}

        {/* Save */}
        <View style={{ marginTop: 24, marginHorizontal: 24 }}>
          <Button
            title={loading ? 'שומר...' : 'שמור שינויים'}
            onPress={handleSave}
            disabled={loading || !isChanged()}
          />
        </View>

        {/* Change password */}
        <View style={{ marginTop: 12, marginHorizontal: 24 }}>
          <Button
            title="שנה סיסמה"
            onPress={() => navigation.navigate('ChangePassword')}
            color="#d9534f"
          />
        </View>

        {/* Delete account */}
        <View style={{ marginTop: 12, marginHorizontal: 24 }}>
          <Button
            title="מחק חשבון"
            onPress={handleDelete}
            color="#b22222"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* --- Styles --- */
const styles = StyleSheet.create({
  container: { flex: 1, direction: 'rtl' },
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
  label: { marginBottom: 6, fontSize: 14, textAlign: 'right' },
  inputWrapper: {
    flexDirection: 'row-reverse', // ✅ pencil moves to far left
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  input: { flex: 1, padding: 10 },
  editIcon: {
    marginLeft: 'auto', // ✅ ensures pencil is fully left
    paddingHorizontal: 6,
  },
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
