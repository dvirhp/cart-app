import React, { useEffect, useState } from 'react';
import {
  View, Text, Button, FlatList, StyleSheet,
  TouchableOpacity, Image, TextInput, Platform, Alert, Linking
} from 'react-native';
import { 
  getFamily, 
  deleteFamily, 
  leaveFamily, 
  updateFamilyDescription, 
  updateFamilyAvatar,
  getFamilyCart,
  removeMember
} from '../../api/familyApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

/* ---------- Cross-platform Alert ---------- */
function showAlert(title, msg, buttons) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${msg}`);
    if (buttons && buttons.find(b => b.onPress)) {
      buttons.find(b => b.onPress).onPress();
    }
  } else {
    Alert.alert(title, msg, buttons);
  }
}

export default function FamilyDetailsScreen({ route, navigation }) {
  const { familyId } = route.params;
  const { token, user } = useAuth();
  const { theme } = useTheme();

  const [family, setFamily] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cart, setCart] = useState([]);

  async function load() {
    const res = await getFamily(familyId, token);
    if (res.error) { showAlert('Error', res.error); return; }
    setFamily(res);
    setDescription(res.description || '');
    setIsOwner(String(res.owner) === String(user.id));
  }

  async function loadCart() {
    const res = await getFamilyCart(familyId, token);
    if (!res.error) setCart(res.items || []);
  }

  useEffect(() => { 
    load(); 
    loadCart();
  }, [familyId, token]);

  // === Avatar update ===
  async function changeAvatar() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            setLoading(true);
            const res = await updateFamilyAvatar(familyId, file, token); 
            if (res.error) {
              showAlert('Error', res.error);
            } else {
              showAlert('Success', 'Family avatar updated');
              await load();
            }
          } catch (err) {
            showAlert('Error', err.message);
          } finally {
            setLoading(false);
          }
        }
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
      try {
        setLoading(true);
        const file = {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'avatar.jpg'
        };
        const res = await updateFamilyAvatar(familyId, file, token);
        if (res.error) {
          showAlert('Error', res.error);
        } else {
          showAlert('Success', 'Family avatar updated');
          await load();
        }
      } catch (err) {
        showAlert('Error', err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  async function saveDescription() {
    try {
      setLoading(true);
      const res = await updateFamilyDescription(familyId, description, token);
      if (res.error) {
        showAlert('Error', res.error);
      } else {
        showAlert('Success', 'Description updated');
        await load();
      }
    } catch (err) {
      showAlert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteFamily() {
    showAlert('Delete Family', 'Are you sure? This action is permanent.', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const r = await deleteFamily(familyId, token);
          if (r.message) { 
            showAlert('Deleted', 'Family was removed'); 
            navigation.goBack(); 
          } else {
            showAlert('Error', r.error || 'Failed to delete family');
          }
        }
      }
    ]);
  }

  async function onLeaveFamily() {
    const r = await leaveFamily(familyId, token);
    if (r.message) { 
      showAlert('Left', 'You left the family'); 
      navigation.goBack(); 
    }
    else showAlert('Error', r.error || 'Failed to leave family');
  }

  async function onRemoveMember(userId) {
    showAlert('Remove Member', 'Are you sure you want to remove this member?', [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const res = await removeMember(familyId, userId, token);
        if (res.message) {
          showAlert('Removed', 'Member removed successfully');
          await load();
        } else {
          showAlert('Error', res.error || 'Failed to remove member');
        }
      }}
    ]);
  }

  // === Share helpers ===
  function inviteMessage(code) {
    return `You were invited to join the family "${family.name}" in the app!\nJoin code: ${code}\nOpen the app and enter the code to join.`;
  }
  function shareWhatsApp(code) {
    const text = encodeURIComponent(inviteMessage(code));
    const url = `whatsapp://send?text=${text}`;
    Linking.openURL(url).catch(() => showAlert('Error', 'WhatsApp not available.'));
  }
  function shareEmail(code) {
    const subject = encodeURIComponent('Cart – Family Invitation');
    const body = encodeURIComponent(inviteMessage(code));
    const url = `mailto:?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => showAlert('Error', 'Email not available.'));
  }
  async function copyCode(code) {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!family) {
    return (
      <View style={[styles.container, theme.container]}>
        <Text style={theme.text}>Loading…</Text>
      </View>
    );
  }

  const owner = family.members.find(m => m.role === 'owner');

  return (
    <View style={[styles.container, theme.container]}>
      {/* Avatar */}
<View style={[styles.header, theme.container]}>
        <TouchableOpacity onPress={changeAvatar} activeOpacity={0.8} disabled={loading}>
          {family.avatar ? (
            <Image source={{ uri: family.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="people-outline" size={40} color="#666" />
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Icon name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.familyName, theme.text]}>{family.name}</Text>
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
              Admin: {owner.email}
            </Text>
          </View>
        )}
      </View>

      {/* Join code & Invite */}
      <View style={styles.section}>
<View style={[styles.sectionHeader, theme.container]}>
          <Text style={[styles.sectionTitle, theme.text]}>Join Code</Text>
          <TouchableOpacity onPress={() => copyCode(family.joinCode)}>
            <Icon name="copy-outline" size={20} color={theme.text.color} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.codeText, theme.text]} selectable>
          {family.joinCode}
        </Text>
        {copied && <Text style={styles.copiedText}>Copied!</Text>}

        <View style={styles.shareRow}>
          <Button title="Share on WhatsApp" onPress={() => shareWhatsApp(family.joinCode)} />
          <View style={{ width: 8 }} />
          <Button title="Share by Email" onPress={() => shareEmail(family.joinCode)} />
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
<View style={[styles.sectionHeader, theme.container]}>
          <Text style={[styles.sectionTitle, theme.text]}>Description</Text>
          {!editingDescription && (
            <TouchableOpacity onPress={() => setEditingDescription(true)}>
              <Icon name="pencil" size={18} color={theme.text.color} />
            </TouchableOpacity>
          )}
        </View>

        {!editingDescription ? (
          <Text style={[styles.descriptionText, theme.text]}>
            {description || "No description yet"}
          </Text>
        ) : (
          <>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.descriptionInput, { color: theme.text.color }]}
              placeholder="Enter family description..."
              placeholderTextColor="#999"
              multiline
            />
            <View style={styles.editButtons}>
              <Button
                title="Save"
                onPress={async () => {
                  await saveDescription();
                  setEditingDescription(false);
                }}
              />
              <View style={{ width: 8 }} />
              <Button
                title="Cancel"
                color="#aaa"
                onPress={() => {
                  setEditingDescription(false);
                  setDescription(family.description || "");
                }}
              />
            </View>
          </>
        )}
      </View>

      {/* Members */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, theme.text]}>Members</Text>
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
              <Text style={[styles.memberName, theme.text]}>
                {item.email} {item.role === 'owner' ? '(Admin)' : ''}
              </Text>
              {isOwner && item.role !== 'owner' && (
                <TouchableOpacity onPress={() => onRemoveMember(item._id)} style={{ marginLeft: 'auto' }}>
                  <Icon name="trash" size={20} color="#d9534f" />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>

      {/* Shopping Cart */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, theme.text]}>Shopping Cart</Text>
        {cart.length === 0 ? (
          <Text style={theme.text}>Cart is empty</Text>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(item, index) => String(index)}
            renderItem={({ item }) => (
              <View style={styles.cartRow}>
                <Text style={[styles.cartItem, theme.text]}>
                  {item.name} (x{item.qty})
                </Text>
                {item.notes ? (
                  <Text style={[styles.cartNotes, theme.text]}>{item.notes}</Text>
                ) : null}
              </View>
            )}
          />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isOwner ? (
          <>
            <Button title="Delete Family" color="#d9534f" onPress={onDeleteFamily} />
            <View style={{ height: 12 }} />
            <Button title="Leave Family" color="#aaa" disabled />
          </>
        ) : (
          <>
            <Button title="Delete Family" color="#aaa" disabled />
            <View style={{ height: 12 }} />
            <Button title="Leave Family" color="#d9534f" onPress={onLeaveFamily} />
          </>
        )}
      </View>
    </View>
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
    position: 'absolute',
    bottom: 0, right: 0,
    backgroundColor: '#4caf50',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff'
  },
  familyName: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  adminRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  adminText: { fontSize: 14, marginLeft: 6 },
  section: { marginBottom: 20 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 6 
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  codeText: { fontSize: 20, textAlign: 'center', letterSpacing: 2, marginVertical: 6 },
  copiedText: { textAlign: 'center', color: 'green', marginBottom: 6 },
  shareRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  descriptionText: { fontSize: 15, lineHeight: 20, paddingVertical: 4 },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
    marginBottom: 8,
    textAlignVertical: 'top'
  },
  editButtons: { flexDirection: 'row', marginTop: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  memberName: { fontSize: 16, marginLeft: 8 },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ddd'
  },
  memberAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center'
  },
  cartRow: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  cartItem: { fontSize: 16, fontWeight: '500' },
  cartNotes: { fontSize: 14, fontStyle: 'italic', color: '#555' },
  actions: { marginTop: 24 }
});
