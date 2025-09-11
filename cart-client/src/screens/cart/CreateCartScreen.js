import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/Ionicons";
import { createCart, getCart, updateCart } from "../../api/carts";
import { useAuth } from "../../context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { useActiveCart } from "../../context/ActiveCartContext";

export default function CreateOrEditCartScreen({ navigation, route }) {
  const { cartId } = route.params || {};
  const isEditMode = Boolean(cartId);

  const { token } = useAuth();
  const tokenValue = typeof token === "string" ? token : token?.token;
  const queryClient = useQueryClient();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, darkMode } = useTheme();
  const { changeActiveCart } = useActiveCart();

  // Local state for cart form
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [fileObj, setFileObj] = useState(null);

  // If editing an existing cart → load its data
  const { data: existing } = useQuery({
    queryKey: ["cart", cartId],
    queryFn: () => getCart(cartId, tokenValue),
    enabled: isEditMode,
  });

  // Sync form values when entering or changing cartId
  useFocusEffect(
    React.useCallback(() => {
      if (isEditMode && existing) {
        setName(existing.name || "");
        setAvatar(existing.avatar || null);
        setFileObj(null);
      } else {
        setName("");
        setAvatar(null);
        setFileObj(null);
      }
    }, [isEditMode, existing, route?.params?.cartId])
  );

  // Pick image for cart avatar (works for both web & native)
  async function pickImage() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          setFileObj(file);
          setAvatar(URL.createObjectURL(file));
        }
      };
      input.click();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setFileObj(null);
    }
  }

  // Mutation for create/update cart
  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name.trim());

      if (Platform.OS === "web" && fileObj) {
        formData.append("avatar", fileObj);
      } else if (avatar && Platform.OS !== "web") {
        formData.append("avatar", {
          uri: avatar,
          type: "image/jpeg",
          name: "cart.jpg",
        });
      }

      if (isEditMode) {
        return await updateCart(cartId, formData, tokenValue, true);
      } else {
        return await createCart(formData, tokenValue, true);
      }
    },

    onSuccess: async (res) => {
      queryClient.invalidateQueries(["carts"]);

      const msg = isEditMode ? "העגלה עודכנה בהצלחה!" : "עגלה נוצרה בהצלחה!";

      // If new cart created → set it as active cart
      if (!isEditMode && res?._id) {
        await changeActiveCart({ _id: res._id });
      }

      navigation.navigate("ShoppingCart", {
        screen: "ShoppingCartScreen",
        params: {
          successMessage: msg,
          newCartId: !isEditMode ? res._id : undefined,
        },
      });
    },

    onError: (err) => {
      Alert.alert("שגיאה", err.response?.data?.error || err.message);
    },
  });

  return (
    <View
      style={[
        styles.container,
        theme.container,
        { paddingBottom: tabBarHeight + 20 },
      ]}
    >
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={theme.text.color} />
      </TouchableOpacity>

      {/* Screen title */}
      <Text style={[styles.title, theme.text]}>
        {isEditMode ? "ערוך עגלה" : "צור עגלה"}
      </Text>

      {/* Cart name input */}
      <Text style={[styles.label, theme.text]}>שם עגלה:</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: darkMode ? "#555" : "#ccc",
            backgroundColor: darkMode ? "#222" : "#fff",
            color: theme.text.color,
          },
        ]}
        value={name}
        onChangeText={setName}
        placeholder="הכנס שם לעגלה"
        placeholderTextColor={darkMode ? "#888" : "#999"}
      />

      {/* Avatar picker */}
      <TouchableOpacity
        onPress={pickImage}
        style={[
          styles.imagePicker,
          { backgroundColor: darkMode ? "#333" : "#eee" },
        ]}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <Icon name="camera" size={40} color={darkMode ? "#aaa" : "#666"} />
        )}
      </TouchableOpacity>

      {/* Save button */}
      <Button
        title={
          mutation.isLoading
            ? "שומר..."
            : isEditMode
            ? "שמור"
            : "צור"
        }
        onPress={() => {
          if (!name.trim()) {
            Alert.alert("שגיאה", "חובה להזין שם לעגלה");
            return;
          }
          mutation.mutate();
        }}
        disabled={mutation.isLoading}
        color={darkMode ? "#4CAF50" : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 16,
  },
  imagePicker: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", resizeMode: "cover" },
});
