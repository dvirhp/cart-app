import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { listFamilies } from '../../api/familyApi';

export default function FamiliesHomeScreen({ navigation }) {
  const { token } = useAuth();
  const { theme, mode } = useTheme(); // Added `mode` for light/dark detection
  const insets = useSafeAreaInsets();
  const [families, setFamilies] = useState([]);

  // ---------------- LOAD FAMILIES ----------------
  async function load() {
    try {
      const res = await listFamilies(token);
      console.log("📥 Families from API:", res.families);
      setFamilies(res.families || []);
    } catch (err) {
      console.error('❌ Failed to load families:', err);
      Alert.alert('Error', 'Failed to load families');
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [token])
  );

  // ---------------- RENDER SINGLE FAMILY ----------------
  const renderFamily = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.familyCard,
        theme.container,
        { borderColor: mode === 'dark' ? '#fff' : '#ccc' } // Border color based on theme
      ]}
      onPress={() => navigation.navigate('FamilyDetails', { familyId: item._id })}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.familyAvatar} />
      ) : (
        <View style={styles.familyAvatarPlaceholder}>
          <Icon name="people-outline" size={20} color="#666" />
        </View>
      )}
      <Text style={[styles.familyName, theme.text]}>{item.name}</Text>
    </TouchableOpacity>
  );

  // ---------------- RENDER SCREEN ----------------
  return (
    <View style={[styles.container, theme.container]}>
      {/* Action tiles */}
      <View style={styles.tilesRow}>
        <TouchableOpacity
          style={[
            styles.tile,
            theme.container,
            { borderColor: mode === 'dark' ? '#fff' : '#ccc' } // Border color based on theme
          ]}
          onPress={() => navigation.navigate('CreateFamily')}
        >
          <Text style={theme.text}>Create family</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tile,
            theme.container,
            { borderColor: mode === 'dark' ? '#fff' : '#ccc' }
          ]}
          onPress={() => navigation.navigate('JoinFamily')}
        >
          <Text style={theme.text}>Join family</Text>
        </TouchableOpacity>
      </View>

      {/* Family list */}
      <Text style={[styles.title, theme.text]}>My families</Text>
      <FlatList
        data={families}
        keyExtractor={(f) => f._id}
        renderItem={renderFamily}
        ListEmptyComponent={<Text style={theme.text}>No families yet</Text>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  tilesRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },

  tile: {
    flex: 1,
    marginHorizontal: 4,
    height: 120,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, // Border around tile
  },

  title: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginVertical: 10 
  },

  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1, // Border around card
  },

  familyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },

  familyAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  familyName: { 
    fontSize: 16, 
    fontWeight: '500' 
  },
});
