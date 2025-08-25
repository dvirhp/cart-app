import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Image, Switch, SafeAreaView, ScrollView 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [avatar, setAvatar] = useState(null);
  const { darkMode, toggleDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Pick new image from gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  // Helper component for menu item
  const MenuItem = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Icon name={icon} size={22} color={theme.text.color} style={{ marginRight: 12 }} />
      <Text style={[styles.menuText, theme.text]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile section */}
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

        {/* Menu options */}
        <View style={styles.menu}>
          <MenuItem 
            icon="person-outline" 
            label="Account Manager" 
            onPress={() => navigation.navigate('AccountManager')} // ✅ שינוי לשם החדש
          />
          <MenuItem icon="people-outline" label="Family" onPress={() => navigation.navigate('Family')} />
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
          <MenuItem icon="help-circle-outline" label="Help" onPress={() => navigation.navigate('Help')} />
          <MenuItem icon="information-circle-outline" label="About" onPress={() => navigation.navigate('About')} />
        </View>

        {/* System options */}
        <View style={styles.systemOptions}>
          <View style={styles.switchRow}>
            <Text style={[styles.menuText, theme.text]}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={toggleDarkMode} />
          </View>
          <MenuItem icon="accessibility-outline" label="Accessibility" onPress={() => {}} />
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
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
