import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { joinFamily } from "../../../api/familyApi";
import { useTheme } from "../../../context/ThemeContext"; // ✅ תמיכה ב־Dark Mode

function JoinFamilyPage({ token }) {
  const [code, setCode] = useState("");       // Family join code input
  const [message, setMessage] = useState(""); // Feedback message from the server
  const { theme } = useTheme();

  // Handle form submit to join a family
  async function handleJoin() {
    try {
      const res = await joinFamily(code, token);
      setMessage(res.message || res.error || "Request sent");
    } catch (err) {
      setMessage("Failed to join family");
    }
    setCode("");
  }

  return (
    <View style={[styles.container, theme.container]}>
      <Text style={[styles.title, theme.text]}>Join a Family</Text>

      <TextInput
        style={[styles.input, { color: theme.text.color, borderColor: "#ccc" }]}
        placeholder="Enter family code"
        placeholderTextColor={theme.text.color === "#fff" ? "#aaa" : "#555"}
        value={code}
        onChangeText={setCode}
      />

      <Button title="Join" onPress={handleJoin} />

      {message ? (
        <Text style={[styles.message, { color: "blue" }]}>{message}</Text>
      ) : null}
    </View>
  );
}

export default JoinFamilyPage;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  message: { marginTop: 12, fontSize: 16 },
});
