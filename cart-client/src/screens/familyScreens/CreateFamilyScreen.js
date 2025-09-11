import React, { useState } from 'react';
import { 
  View, Text, TextInput, Button, StyleSheet, 
  Image, TouchableOpacity, Alert, Platform 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function CreateFamilyScreen({ navigation }) {
  const { theme, darkMode } = useTheme(); // Use theme and darkMode from context
  const { token } = useAuth(); // Get auth token from context
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState(null); // Local preview URI for mobile/web
  const [fileObj, setFileObj] = useState(null); // File object for web uploads
  const [err, setErr] = useState('');

  // --- Image picker (mobile only) ---
  const pickImage = async () => {
    if (Platform.OS === 'web') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setFileObj(null);
    }
  };

  // --- Mutation for creating a new family ---
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Family name is required.");

      const formData = new FormData();
      formData.append('name', name.trim());
      if (description.trim()) formData.append('description', description.trim());

      // Handle image upload differently for Web vs Mobile
      if (Platform.OS === 'web' && fileObj) {
        formData.append('avatar', fileObj);
      } else if (avatar && Platform.OS !== 'web') {
        formData.append('avatar', {
          uri: avatar,
          type: 'image/jpeg',
          name: 'family.jpg',
        });
      }

      const res = await axios.post(`${BASE_URL}/api/v1/families`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return res.data;
    },
    onSuccess: (data) => {
      if (data.family) {
        // Reset form state after successful creation
        setName('');
        setDescription('');
        setAvatar(null);
        setFileObj(null);

        // Refresh families & carts lists
        queryClient.invalidateQueries(['families']);
        queryClient.invalidateQueries(['carts']);

        Alert.alert("הצלחה", "המשפחה נוצרה בהצלחה");
        navigation.goBack();
      }
    },
    onError: (e) => {
      console.error("❌ Create family failed:", e.response?.data || e.message);
      Alert.alert("שגיאה", e.response?.data?.error || e.message);
    },
  });

  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>צור משפחה</Text>

      {/* Family avatar picker */}
      <View style={styles.imageWrapper}>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web') {
              document.getElementById('avatarInput').click();
            } else {
              pickImage();
            }
          }}
          activeOpacity={0.8}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.image} />
          ) : (
            <View style={[styles.image, { justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="people-outline" size={36} color="#666" />
            </View>
          )}
          <View style={styles.cameraIconWrapper}>
            <Icon name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Hidden file input for Web */}
        {Platform.OS === 'web' && (
          <input
            id="avatarInput"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setFileObj(file);
                setAvatar(URL.createObjectURL(file));
              }
            }}
          />
        )}
      </View>

      {/* Family name input */}
      <TextInput
        style={[
          styles.input, 
          { color: theme.text.color, borderColor: '#ccc', textAlign: "right" } // RTL alignment
        ]}
        placeholder="שם משפחה (חובה)"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        value={name}
        onChangeText={setName}
      />

      {/* Family description input */}
      <TextInput
        style={[
          styles.textArea, 
          { color: theme.text.color, borderColor: '#ccc', textAlign: "right" } // RTL alignment
        ]}
        placeholder="תיאור המשפחה (אופציונלי)"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Button
        title={createMutation.isLoading ? "יוצר..." : "צור"}
        onPress={() => createMutation.mutate()}
        disabled={createMutation.isLoading}
      />

      {err ? <Text style={styles.error}>{err}</Text> : null}

      {/* Back button placed at the bottom-left */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={22} color="#fff" />
        <Text style={styles.backText}>חזור</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 12 
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  imageWrapper: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
  },
  cameraIconWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4caf50',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  error: { marginTop: 8, color: '#c62828', textAlign: 'center' },
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4caf50",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 6,
  },
});
