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
import axios from 'axios';

export default function CreateFamilyScreen({ navigation }) {
  const { theme } = useTheme();
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState(null); // preview uri
  const [fileObj, setFileObj] = useState(null); // real File (for web)
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  /* ---------------- PICK IMAGE (mobile) ---------------- */
  const pickImage = async () => {
    if (Platform.OS === 'web') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      setFileObj(null); 
    }
  };

  /* ---------------- HANDLE CREATE ---------------- */
  const handleCreate = async () => {
    setErr('');
    if (!name.trim()) {
      setErr('Family name is required.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (description.trim()) formData.append('description', description.trim());

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

      if (res.data.family) {
        setName('');
        setDescription('');
        setAvatar(null);
        setFileObj(null);
        setSuccess(true);
      } else {
        setErr(res.data.error || 'Failed to create family.');
      }
    } catch (e) {
      console.error('❌ Create family failed:', e.response?.data || e.message);
      Alert.alert('Error', e.response?.data?.error || 'Failed to create family');
    }
  };

  if (success) {
    return (
      <View style={[styles.container, theme.container]}>
        <Text style={[styles.success, { color: '#2e7d32' }]}>
          Created successfully
        </Text>
        <View style={{ height: 10 }} />
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>Create family</Text>

      {/* Family avatar with camera overlay */}
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

        {/* hidden input for web */}
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

      <TextInput
        style={[styles.input, { color: theme.text.color, borderColor: '#ccc' }]}
        placeholder="Family name (required)"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={[styles.textArea, { color: theme.text.color, borderColor: '#ccc' }]}
        placeholder="Family description (optional)"
        placeholderTextColor={theme.text.color === '#fff' ? '#aaa' : '#555'}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Button title="Create" onPress={handleCreate} />
      {err ? <Text style={styles.error}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'left' },
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
  success: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  error: { marginTop: 8, color: '#c62828', textAlign: 'center' },
});
