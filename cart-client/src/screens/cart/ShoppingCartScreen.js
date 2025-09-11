import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCarts, deleteCart } from "../../api/carts";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRoute } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ---------- Cross-platform confirmation alert ---------- */
function showAlert(title, msg, onConfirm) {
  if (Platform.OS === "web") {
    const confirmed = window.confirm(`${title}\n${msg}`);
    if (confirmed) onConfirm();
  } else {
    Alert.alert(title, msg, [
      { text: "ביטול", style: "cancel" },
      { text: "אישור", onPress: onConfirm },
    ]);
  }
}

/* ---------- Main screen: list of user carts ---------- */
export default function ShoppingCartScreen({ navigation }) {
  const { token } = useAuth();
  const tokenValue = typeof token === "string" ? token : token?.token;
  const tabBarHeight = useBottomTabBarHeight();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { theme, darkMode } = useTheme();

  const [activeCart, setActiveCart] = useState(null); // currently active cart
  const [modalVisible, setModalVisible] = useState(false); // modal to choose active cart
  const [successMessage, setSuccessMessage] = useState(null); // feedback banner

  // Load active cart from storage on mount
  useEffect(() => {
    const loadActiveCart = async () => {
      try {
        const saved = await AsyncStorage.getItem("activeCartId");
        if (saved) setActiveCart({ _id: saved });
      } catch (err) {
        console.log("❌ Failed to load active cart", err);
      }
    };
    loadActiveCart();
  }, []);

  // Set active cart and persist it in AsyncStorage
  const selectActiveCart = async (cart) => {
    try {
      setActiveCart(cart);
      if (cart?._id) {
        await AsyncStorage.setItem("activeCartId", cart._id);
      } else {
        await AsyncStorage.removeItem("activeCartId");
      }
    } catch (err) {
      console.log("❌ Failed to save active cart", err);
    }
  };

  // Query: fetch all carts for current user
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["carts"],
    queryFn: () => listCarts(tokenValue),
    onSuccess: (res) => {
      // If new cart was just created → set it as active
      if (route.params?.newCartId) {
        const created = res?.personal?.find(
          (c) => c._id === route.params.newCartId
        );
        if (created) {
          selectActiveCart(created);
        }
        return;
      }

      // If no active cart selected → pick a default one
      if (!activeCart?._id) {
        const defaultCart =
          res?.personal?.[0] || res?.family?.[0] || res?.carts?.[0] || null;
        if (defaultCart) selectActiveCart(defaultCart);
      }
    },
  });

  // Mutation: delete cart
  const deleteMutation = useMutation({
    mutationFn: (cartId) => deleteCart(cartId, tokenValue),
    onSuccess: (_, cartId) => {
      queryClient.invalidateQueries(["carts"]);

      // If deleted cart was the active one → fallback to another
      if (activeCart?._id === cartId) {
        const allCarts = queryClient.getQueryData(["carts"]);
        const fallback =
          allCarts?.personal?.[0] ||
          allCarts?.family?.[0] ||
          allCarts?.carts?.[0] ||
          null;

        if (fallback) {
          selectActiveCart(fallback);
        } else {
          selectActiveCart(null);
        }
      }

      showTempMessage("!העגלה נמחקה בהצלחה");
    },
  });

  // Temporary banner message
  const showTempMessage = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
      navigation.setParams?.({ successMessage: null });
    }, 5000);
  };

  // Build unified list of carts (personal + family + fallback)
  const personalCarts = data?.personal || [];
  const familyCarts = data?.family || [];
  const fallbackCarts = data?.carts || [];
  const allCarts =
    personalCarts.length || familyCarts.length
      ? [...familyCarts, ...personalCarts]
      : fallbackCarts;

  // Resolve currently active cart object
  const resolvedActiveCart =
    allCarts.find((c) => c._id === activeCart?._id) || null;

  return (
    <View
      style={[
        styles.container,
        theme.container,
        { paddingBottom: tabBarHeight },
      ]}
    >
      {/* Active cart header */}
      <View
        style={[
          styles.activeCartBox,
          { backgroundColor: darkMode ? "#2a2a2a" : "#f0f0f0" },
        ]}
      >
        <Icon name="cart-outline" size={20} color="green" />
        <Text style={[styles.activeCartText, theme.text]}>
          {resolvedActiveCart
            ? `עגלה פעילה: ${resolvedActiveCart.name}`
            : "לא נבחרה עגלה פעילה"}
        </Text>
        <Pressable onPress={() => setModalVisible(true)}>
          <Text style={{ color: "#1E88E5", marginLeft: 10 }}>שנה</Text>
        </Pressable>
      </View>

      {/* Modal: choose active cart */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: darkMode ? "#1e1e1e" : "#fff" },
            ]}
          >
            <Text style={[styles.modalTitle, theme.text]}>בחר עגלה פעילה</Text>
            <FlatList
              data={allCarts}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    resolvedActiveCart?._id === item._id && {
                      borderColor: "green",
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    selectActiveCart(item);
                    setModalVisible(false);
                    showTempMessage("!העגלה הפעילה עודכנה");
                  }}
                >
                  <Text style={[theme.text, { fontSize: 16 }]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Pressable
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#fff" }}>סגור</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Success banner */}
      {(successMessage || route.params?.successMessage) && (
        <View
          style={[
            styles.successBox,
            { backgroundColor: darkMode ? "#264d36" : "#d4edda" },
          ]}
        >
          <Text
            style={[
              styles.successText,
              { color: darkMode ? "#c8f7d2" : "#155724" },
            ]}
          >
            {successMessage || route.params?.successMessage}
          </Text>
        </View>
      )}

      {/* Title row with add button */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, theme.text]}>העגלות שלי</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            navigation.navigate("CreateCart");
            showTempMessage("!נפתחה יצירת עגלה חדשה");
          }}
        >
          <Icon name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* List of carts */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="green" />
          <Text style={theme.text}>טוען עגלות...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: "red" }}>שגיאה בטעינת עגלות</Text>
          <Text style={theme.text}>
            {error?.response?.data?.error || error.message}
          </Text>
        </View>
      ) : (
        <FlatList
          data={allCarts}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const avatarUri = item.isFamily ? item.family?.avatar : item.avatar;
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: darkMode ? "#1e1e1e" : "#fff",
                    borderColor: darkMode ? "#444" : "#ddd",
                  },
                ]}
                onPress={() =>
                  navigation.navigate("CartDetails", {
                    cartId: item._id,
                    from: "carts",
                  })
                }
              >
                {/* Avatar on the right */}
                <View
                  style={[
                    styles.cardLeft,
                    { backgroundColor: darkMode ? "#333" : "#eee" },
                  ]}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <Icon
                      name="cart-outline"
                      size={28}
                      color={darkMode ? "#fff" : "#1E88E5"}
                    />
                  )}
                </View>

                {/* Cart content in the middle */}
                <View style={styles.cardContent}>
                  <Text style={[styles.cartName, theme.text]}>{item.name}</Text>
                  {item.isFamily && (
                    <Text
                      style={[
                        styles.familyLabel,
                        { color: darkMode ? "#aaa" : "#666" },
                      ]}
                    >
                      משפחה: {item.family?.name || ""}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.itemCount,
                      { color: darkMode ? "#888" : "#999" },
                    ]}
                  >
                    {item.items?.length || 0} פריטים
                  </Text>
                </View>

                {/* Edit/Delete actions on the left (only personal carts) */}
                {!item.isFamily && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate("CreateCart", { cartId: item._id });
                      }}
                      style={styles.iconButton}
                    >
                      <Icon
                        name="pencil"
                        size={20}
                        color={darkMode ? "#4dabf7" : "#1E88E5"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        showAlert(
                          "מחיקת עגלה",
                          "האם אתה בטוח שברצונך למחוק עגלה זו?",
                          () => deleteMutation.mutate(item._id)
                        )
                      }
                      style={styles.iconButton}
                    >
                      <Icon name="trash" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  successBox: { padding: 10, borderRadius: 6, marginBottom: 10 },
  successText: { fontWeight: "bold", textAlign: "center" },
  activeCartBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeCartText: { fontWeight: "bold", marginLeft: 8, flex: 1 },

  // Header row: title on right, add button on left
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: "green",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "bold" },

  // Cart card layout: avatar right, actions left
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  cardLeft: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: "100%", height: "100%", resizeMode: "cover" },
  cardContent: { flex: 1 },
  cartName: { fontSize: 16, fontWeight: "bold" },
  familyLabel: { fontSize: 14, marginTop: 2 },
  itemCount: { fontSize: 14, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center" },
  iconButton: { marginLeft: 10 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  modalItem: { padding: 12, borderRadius: 8, marginBottom: 8 },
  closeButton: {
    marginTop: 10,
    backgroundColor: "green",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
});
