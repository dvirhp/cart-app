import React, { useState } from 'react';
import {
  View, Text, Button, FlatList, StyleSheet,
  TouchableOpacity, Image, TextInput, Platform, Alert, ScrollView
} from 'react-native';
import { 
  getFamily, 
  deleteFamily, 
  leaveFamily, 
  updateFamilyDescription, 
  updateFamilyAvatar,
  removeMember
} from '../../api/familyApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* --- Cross-platform alert helper (Web uses confirm, Mobile uses Alert) --- */
function showAlert(title, msg, buttons) {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${msg}`);
    if (confirmed) {
      const destructive = buttons?.find(b => b.style === 'destructive');
      if (destructive?.onPress) destructive.onPress();
    } else {
      const cancelBtn = buttons?.find(b => b.style === 'cancel');
      if (cancelBtn?.onPress) cancelBtn.onPress();
    }
  } else {
    Alert.alert(title, msg, buttons);
  }
}

export default function FamilyDetailsScreen({ route, navigation }) {
  const { familyId } = route.params;
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();

  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);

  // --- Load family data with React Query ---
  const { data: family, refetch } = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => getFamily(familyId, token),
    onSuccess: (res) => {
      setDescription(res.description || '');
    }
  });

  const isOwner = family && String(family.owner) === String(user.id);
  const owner = family?.members?.find(m => m.role === 'owner');

  // --- Mutation: update family avatar ---
  const avatarMutation = useMutation({
    mutationFn: async (file) => updateFamilyAvatar(familyId, file, token),
    onSuccess: () => {
      showAlert('הצלחה', 'התמונה עודכנה בהצלחה');
      queryClient.invalidateQueries(['families']);
      queryClient.invalidateQueries(['carts']);
      refetch();
    },
    onError: (err) => showAlert('שגיאה', err.message),
  });

  async function changeAvatar() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) avatarMutation.mutate(file);
      };
      input.click();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const file = {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      };
      avatarMutation.mutate(file);
    }
  }

  // --- Mutation: update family description ---
  const descMutation = useMutation({
    mutationFn: () => updateFamilyDescription(familyId, description, token),
    onSuccess: () => {
      showAlert('הצלחה', 'התיאור עודכן בהצלחה');
      queryClient.invalidateQueries(['families']);
      refetch();
    },
    onError: (err) => showAlert('שגיאה', err.message),
  });

  // --- Delete family (owner only) ---
  async function onDeleteFamily() {
    showAlert('מחיקת משפחה', 'האם אתה בטוח שברצונך למחוק את המשפחה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          const r = await deleteFamily(familyId, token);
          if (r.message) {
            showAlert('נמחק', 'המשפחה הוסרה בהצלחה');
            queryClient.invalidateQueries(['families']);
            queryClient.invalidateQueries(['carts']);
            navigation.goBack();
          } else {
            showAlert('שגיאה', r.error || 'מחיקת המשפחה נכשלה');
          }
        }
      }
    ]);
  }

  // --- Leave family (for non-owners) ---
  async function onLeaveFamily() {
    showAlert('עזיבת משפחה', 'האם אתה בטוח שברצונך לעזוב את המשפחה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'צא',
        style: 'destructive',
        onPress: async () => {
          const r = await leaveFamily(familyId, token);
          if (r.message) {
            showAlert('יצאת', 'עזבת את המשפחה');
            queryClient.invalidateQueries(['families']);
            queryClient.invalidateQueries(['carts']);
            navigation.goBack();
          } else {
            showAlert('שגיאה', r.error || 'הפעולה נכשלה');
          }
        }
      }
    ]);
  }

  // --- Remove member (owner only) ---
  async function onRemoveMember(userId) {
    showAlert('הסרת משתמש', 'האם אתה בטוח שברצונך להסיר את המשתמש?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר',
        style: 'destructive',
        onPress: async () => {
          const res = await removeMember(familyId, userId, token);
          if (res.message) {
            showAlert('הוסר', 'המשתמש הוסר בהצלחה');
            refetch();
            queryClient.invalidateQueries(['families']);
          } else {
            showAlert('שגיאה', res.error || 'הסרת המשתמש נכשלה');
          }
        }
      }
    ]);
  }

  if (!family) {
    return (
      <View style={[styles.container, theme.container]}>
        <Text style={theme.text}>טוען...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, theme.container]}
      contentContainerStyle={{ paddingBottom: 80 + tabBarHeight }}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Family avatar and name */}
      <View style={[styles.header, theme.container]}>
        <TouchableOpacity onPress={changeAvatar} activeOpacity={0.8} disabled={avatarMutation.isLoading}>
          {family.avatar ? (
            <Image source={{ uri: family.avatar }} style={styles.avatar} />
          ) : (
            <View className="avatarPlaceholder">
              <Icon name="people-outline" size={40} color="#666" />
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Icon name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.familyName, theme.text, { textAlign: "right" }]}>
          {family.name}
        </Text>

        {owner && (
          <View style={styles.adminRow}>
            {owner.avatar ? (
              <Image source={{ uri: owner.avatar }} style={styles.memberAvatar} />
            ) : (
              <View style={styles.memberAvatarPlaceholder}>
                <Icon name="person" size={16} color="#666" />
              </View>
            )}
            <Text style={[styles.adminText, theme.text]}>
              מנהל: {owner.email}
            </Text>
          </View>
        )}
      </View>

      {/* Description section */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, theme.container]}>
          <Text style={[styles.sectionTitle, theme.text]}>תיאור</Text>
          {!editingDescription && (
            <TouchableOpacity onPress={() => setEditingDescription(true)}>
              <Icon name="pencil" size={18} color={theme.text.color} />
            </TouchableOpacity>
          )}
        </View>
        {!editingDescription ? (
          <Text style={[styles.descriptionText, theme.text, { textAlign: "right" }]}>
            {description || "אין עדיין תיאור"}
          </Text>
        ) : (
          <>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.descriptionInput, { color: theme.text.color, textAlign: "right" }]}
              placeholder="הכנס תיאור למשפחה..."
              placeholderTextColor="#999"
              multiline
            />
            <Button title="שמור" onPress={() => { descMutation.mutate(); setEditingDescription(false); }} />
          </>
        )}
      </View>

      {/* Join code section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, theme.text]}>קוד הצטרפות</Text>
        <Text style={[styles.descriptionText, theme.text, { textAlign: "right" }]}>
          {family.joinCode}
        </Text>
      </View>

      {/* Members section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, theme.text]}>חברים</Text>
        <FlatList
          data={family.members}
          keyExtractor={(m) => m._id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
              ) : (
                <View style={styles.memberAvatarPlaceholder}>
                  <Icon name="person" size={16} color="#666" />
                </View>
              )}
              <Text style={[styles.memberName, theme.text, { textAlign: "right" }]}>
                {item.email} {item.role === 'owner' ? '(מנהל)' : ''}
              </Text>
              {isOwner && item.role !== 'owner' && (
                <TouchableOpacity onPress={() => onRemoveMember(item._id)} style={{ marginLeft: 'auto' }}>
                  <Icon name="trash" size={20} color="#d9534f" />
                </TouchableOpacity>
              )}
            </View>
          )}
          scrollEnabled={false}
        />
      </View>

      {/* Family cart section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, theme.text]}>עגלת המשפחה</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => {
            if (family.carts?.length > 0) {
              navigation.navigate("ShoppingCart", {
                screen: "CartDetails",
                params: { cartId: family.carts[0]._id, from: "families" }
              });
            } else {
              navigation.navigate("ShoppingCart", {
                screen: "CartDetails",
                params: { familyId, from: "families" }
              });
            }
          }}
        >
          <Icon name="cart-outline" size={20} color="#fff" />
          <Text style={styles.cartButtonText}>עבור לעגלת המשפחה</Text>
        </TouchableOpacity>
      </View>

      {/* Owner / Member actions */}
      <View style={styles.actions}>
        {isOwner ? (
          <Button title="מחק משפחה" color="#d9534f" onPress={onDeleteFamily} />
        ) : (
          <Button title="צא מהמשפחה" color="#d953f" onPress={onLeaveFamily} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ddd' },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center'
  },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#4caf50', borderRadius: 20,
    padding: 6, borderWidth: 2, borderColor: '#fff'
  },
  familyName: { fontSize: 22, fontWeight: 'bold' },
  adminRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 6 },
  adminText: { fontSize: 14, marginRight: 6, textAlign: "right" },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '600', textAlign: "right" },
  descriptionText: { fontSize: 15, lineHeight: 20 },
  descriptionInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, minHeight: 60 },
  memberRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 6 },
  memberName: { fontSize: 16, marginRight: 8 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', marginLeft: 8 },
  memberAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  cartButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "green",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  cartButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  actions: { marginTop: 24 },
});
