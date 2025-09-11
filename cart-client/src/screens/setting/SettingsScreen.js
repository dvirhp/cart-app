import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Image, Switch, SafeAreaView, ScrollView, Alert, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../../api/client';

export default function SettingsScreen({ navigation }) {
  const { user, token, updateUser, signOut } = useAuth(); 
  const { darkMode, toggleDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [avatar, setAvatar] = useState(user?.avatar || null);

  // Sync avatar preview with context
  useEffect(() => {
    setAvatar(user?.avatar || null);
  }, [user?.avatar]);

  // Update header with theme and Hebrew title
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.container.backgroundColor },
      headerTintColor: theme.text.color,
      headerTitleStyle: { fontWeight: 'bold' },
      title: 'הגדרות',
    });
  }, [navigation, theme]);

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
          console.error("❌ Non-JSON response:", text);
          throw new Error("Invalid server response");
        }

        if (data?.user) {
          updateUser(data.user);
          Alert.alert('✅ הצלחה', 'תמונת הפרופיל עודכנה בהצלחה');
        } else {
          console.error("❌ Upload error:", data);
          Alert.alert('שגיאה', data?.error || 'העלאה נכשלה');
        }
      } catch (err) {
        console.error("❌ Avatar upload failed:", err);
        Alert.alert('שגיאה', 'שגיאה בעדכון תמונת פרופיל');
      }
    }
  };

  // Reusable menu item (RTL: icon right, label left)
  const MenuItem = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Icon name={icon} size={22} color={theme.text.color} style={{ marginLeft: 12 }} />
      <Text style={[styles.menuText, theme.text, { flex: 1 }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={{ position: 'relative' }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="person-outline" size={48} color="#666" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Icon name="camera-outline" size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.userName, theme.text]}>
            {user?.displayName || 'שם משתמש'}
          </Text>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <MenuItem icon="person-outline" label="ניהול חשבון" onPress={() => navigation.navigate('AccountManager')} />
          <MenuItem icon="notifications-outline" label="התראות" onPress={() => navigation.navigate('Notifications')} />
          <MenuItem icon="help-circle-outline" label="עזרה" onPress={() => navigation.navigate('Help')} />
          <MenuItem icon="information-circle-outline" label="אודות" onPress={() => navigation.navigate('About')} />
        </View>

        {/* System options */}
        <View style={styles.systemOptions}>
          <View style={styles.switchRow}>
            {/* Dark mode toggle row — icon right, text center, switch left */}
            <Icon name="moon-outline" size={22} color={theme.text.color} style={{ marginLeft: 8 }} />
            <Text style={[styles.menuText, theme.text, { flex: 1 }]}>מצב כהה</Text>
            <Switch 
              value={darkMode} 
              onValueChange={toggleDarkMode} 
              style={styles.darkModeSwitch} 
            />
          </View>
          <MenuItem icon="accessibility-outline" label="נגישות" onPress={() => {}} />
          <MenuItem icon="log-out-outline" label="התנתק" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles — keep all rows uniform, switch aligned left
const styles = StyleSheet.create({
  container: { flex: 1 },
  profileSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ddd' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 4,
  },
  userName: { marginTop: 12, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  menu: { marginTop: 16 },
  menuItem: {
    flexDirection: 'row-reverse',   // RTL layout
    alignItems: 'center',           // vertical center
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: { fontSize: 16, textAlign: 'right' },
  systemOptions: { marginTop: 24 },
  switchRow: {
    flexDirection: 'row-reverse',   // icon right → text → switch left
    alignItems: 'center',
    paddingVertical: 14,            // same height as menuItem
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  darkModeSwitch: {
    marginLeft: 'auto',             // force switch to far left
    transform: [{ scale: 0.9 }],    // optional shrink for consistent row height
  },
});
