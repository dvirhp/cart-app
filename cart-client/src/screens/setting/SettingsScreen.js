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

  // Local avatar state for immediate preview
  const [avatar, setAvatar] = useState(user?.avatar || null);

  // Sync avatar state with context whenever user.avatar changes
  useEffect(() => {
    setAvatar(user?.avatar || null);
  }, [user?.avatar]);

  /* ---------- Handle avatar change (upload to server) ---------- */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri); // Show preview immediately

      try {
        const formData = new FormData();

        if (Platform.OS === 'web') {
          // Web: convert URI to Blob
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append('avatar', blob, 'avatar.jpg');
        } else {
          // Mobile: pass file object
          formData.append('avatar', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          });
        }

        // Upload to API
        const res = await fetch(`${BASE_URL}/api/v1/auth/upload-avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }, // Do not set Content-Type manually
          body: formData,
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("❌ Server returned non-JSON:", text);
          throw new Error("Invalid server response");
        }

        if (data?.user) {
          updateUser(data.user); // Update auth context
          Alert.alert('✅ Success', 'Profile picture updated');
        } else {
          console.error("❌ Upload error:", data);
          Alert.alert('Error', data?.error || 'Upload failed');
        }
      } catch (err) {
        console.error("❌ Avatar upload failed:", err);
        Alert.alert('Error', 'Failed to update profile picture');
      }
    }
  };

  /* ---------- Reusable menu item component ---------- */
  const MenuItem = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Icon name={icon} size={22} color={theme.text.color} style={{ marginRight: 12 }} />
      <Text style={[styles.menuText, theme.text]}>{label}</Text>
    </TouchableOpacity>
  );

  /* ---------- Render UI ---------- */
  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile section with avatar + display name */}
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
            {user?.displayName || 'My Name'}
          </Text>
        </View>

        {/* Navigation menu items */}
        <View style={styles.menu}>
          <MenuItem 
            icon="person-outline" 
            label="Account Manager" 
            onPress={() => navigation.navigate('AccountManager')}
          />
          <MenuItem 
            icon="notifications-outline" 
            label="Notifications" 
            onPress={() => navigation.navigate('Notifications')} 
          />
          <MenuItem 
            icon="help-circle-outline" 
            label="Help" 
            onPress={() => navigation.navigate('Help')} 
          />
          <MenuItem 
            icon="information-circle-outline" 
            label="About" 
            onPress={() => navigation.navigate('About')} 
          />
        </View>

        {/* System options */}
        <View style={styles.systemOptions}>
          {/* Dark mode toggle */}
          <View style={styles.switchRow}>
            <Text style={[styles.menuText, theme.text]}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={toggleDarkMode} />
          </View>

          {/* Other system-related actions */}
          <MenuItem icon="accessibility-outline" label="Accessibility" onPress={() => {}} />
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
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
  userName: { marginTop: 12, fontSize: 18, fontWeight: 'bold' },
  menu: { marginTop: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: { fontSize: 16 },
  systemOptions: { marginTop: 24 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
