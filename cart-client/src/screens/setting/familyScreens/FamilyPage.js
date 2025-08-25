import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";
import { sendInvite, getFamily } from "../../../api/familyApi";
import { useTheme } from "../../../context/ThemeContext";

function FamilyPage({ familyId, token }) {
  const [family, setFamily] = useState(null);     // Holds the family data
  const [email, setEmail] = useState("");         // Email input for invitation
  const [message, setMessage] = useState("");     // Success or error message
  const { theme } = useTheme();

  // Load family info when component mounts or props change
  useEffect(() => {
    async function loadFamily() {
      try {
        const data = await getFamily(familyId, token);
        setFamily(data);
      } catch (err) {
        setMessage("Failed to load family data");
      }
    }
    loadFamily();
  }, [familyId, token]);

  // Handle invitation
  async function handleInvite() {
    try {
      const res = await sendInvite(familyId, email, token);
      setMessage(res.message || res.error || "Invite sent");
    } catch (err) {
      setMessage("Failed to send invite");
    }
    setEmail("");
  }

  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>My Family</Text>

      {family ? (
        <View>
          <Text style={[styles.subtitle, theme.text]}>{family.name}</Text>
          <FlatList
            data={family.members}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <Text style={[styles.member, theme.text]}>{item.email}</Text>
            )}
          />
        </View>
      ) : (
        <Text style={theme.text}>Loading...</Text>
      )}

      <TextInput
        style={[styles.input, { color: theme.text.color, borderColor: "#ccc" }]}
        placeholder="Enter email to invite"
        placeholderTextColor={theme.text.color === "#fff" ? "#aaa" : "#555"}
        value={email}
        onChangeText={setEmail}
      />

      <Button title="Send Invite" onPress={handleInvite} />

      {message ? (
        <Text style={[styles.message, { color: "blue" }]}>{message}</Text>
      ) : null}
    </View>
  );
}

export default FamilyPage;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  subtitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  member: { fontSize: 16, marginVertical: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  message: { marginTop: 12, fontSize: 16 },
});
