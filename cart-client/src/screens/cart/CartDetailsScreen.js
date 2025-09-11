import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  ScrollView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAuth } from "../../context/AuthContext";
import {
  getCart,
  updateCartItem,
  deleteCartItem,
  listFamilyCarts,
} from "../../api/carts";
import { useTheme } from "../../context/ThemeContext";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

/* Confirm modal that works on both web and mobile */
function showConfirm(title, message, onConfirm) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    import("react-native").then(({ Alert }) =>
      Alert.alert(title, message, [
        { text: "ביטול", style: "cancel" },
        { text: "מחק", style: "destructive", onPress: onConfirm },
      ])
    );
  }
}

/* ---------- Item Row Component ---------- */
function CartItemRow({
  cartId,
  item,
  darkMode,
  theme,
  onUpdateQuantity,
  onDelete,
  onOpenProduct,
  multiSelectMode, 
  selectedItems,   
  toggleSelectItem,
}) {
  const isSelected = selectedItems.includes(item._id);
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity || 1);

  // Sync local state when item.quantity changes
  useEffect(() => {
    setQuantity(item.quantity || 1);
  }, [item.quantity]);

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          backgroundColor: darkMode ? "#1e1e1e" : "#fff",
          borderColor: darkMode ? "#444" : "#ddd",
          flexDirection: "row-reverse", // RTL layout
        },
      ]}
      onPress={() => onOpenProduct(item.product)}
      activeOpacity={0.8}
    >
      {/* Checkbox (appears only in multi-select mode) */}
      {multiSelectMode && (
        <TouchableOpacity
          style={styles.checkboxWrapper}
          onPress={() => toggleSelectItem(item._id)}
        >
          <Icon
            name={isSelected ? "checkbox" : "square-outline"}
            size={22}
            color={darkMode ? "#fff" : "#000"}
          />
        </TouchableOpacity>
      )}

      {/* Product image */}
      <View style={styles.rightSection}>
        <Image
          source={{
            uri: item.product?.images?.[0] || "https://via.placeholder.com/100",
          }}
          style={styles.productImage}
        />
      </View>

      {/* Product details (name + brand) */}
      <View style={styles.centerSection}>
        <Text style={[styles.productName, theme.text]} numberOfLines={2}>
          {item.product?.name}
        </Text>
        <Text
          style={[styles.productBrand, { color: darkMode ? "#aaa" : "#666" }]}
          numberOfLines={1}
        >
          {item.product?.brand}
        </Text>
      </View>

      {/* Quantity + actions */}
      <View style={styles.leftSection}>
        <View style={styles.quantityBox}>
          {editing ? (
            <View style={styles.quantityEditRow}>
              {/* Decrease quantity */}
              <TouchableOpacity
                style={[styles.qtyBtn, { borderColor: darkMode ? "#555" : "#ccc" }]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Text style={[styles.qtyText, theme.text]}>-</Text>
              </TouchableOpacity>

              {/* Current quantity */}
              <Text style={[styles.qtyValue, theme.text]}>{quantity}</Text>

              {/* Increase quantity */}
              <TouchableOpacity
                style={[styles.qtyBtn, { borderColor: darkMode ? "#555" : "#ccc" }]}
                onPress={() => setQuantity((q) => q + 1)}
              >
                <Text style={[styles.qtyText, theme.text]}>+</Text>
              </TouchableOpacity>

              {/* Save changes */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  onUpdateQuantity(item, quantity);
                  setEditing(false);
                }}
              >
                <Icon name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>

              {/* Cancel changes */}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setQuantity(item.quantity);
                  setEditing(false);
                }}
              >
                <Icon name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.qtyDisplayValue, theme.text]}>
              כמות: {item.quantity}
            </Text>
          )}
        </View>

        {/* Action buttons (edit + delete) */}
        {!editing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Icon name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(cartId, item._id)}
              style={styles.deleteBtn}
            >
              <Icon name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ---------- Main Screen ---------- */
export default function CartDetailsScreen({ navigation }) {
  const route = useRoute();
  const { cartId, familyId, from } = route.params || {};
  const { token } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();
  const { theme, darkMode } = useTheme();

  // Local state for scanning receipts
  const [scanStatus, setScanStatus] = useState(null); // "loading" | "success" | "error"
  const [scanResult, setScanResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const abortRef = useRef(null);

  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch cart details
  const { data: cart, isLoading, isError, error } = useQuery({
    queryKey: ["cart", cartId || familyId],
    queryFn: async () => {
      if (cartId) {
        return await getCart(cartId, token);
      } else if (familyId) {
        const res = await listFamilyCarts(familyId, token);
        return res.carts?.[0] || { items: [], name: "עגלה משפחתית" };
      }
      throw new Error("חסר cartId או familyId");
    },
  });

  /* Toggle all items in multi-select */
  const toggleSelectAll = () => {
    if (selectedItems.length === cart.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.items.map((i) => i._id));
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Mutation for updating item quantity
  const updateMutation = useMutation({
    mutationFn: ({ cartId, itemId, quantity }) =>
      updateCartItem(cartId, itemId, quantity, token),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(["cart", cartId || familyId], updatedCart);
      queryClient.invalidateQueries(["carts"]);
    },
  });

  // Mutation for deleting item
  const deleteProductMutation = useMutation({
    mutationFn: ({ cartId, itemId }) => deleteCartItem(cartId, itemId, token),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(["cart", cartId || familyId], updatedCart);
      queryClient.invalidateQueries(["carts"]);
    },
  });

  // Handle quantity update
  const handleUpdateQuantity = (item, newQuantity) => {
    if (!newQuantity || isNaN(newQuantity) || newQuantity < 1) {
      Platform.OS === "web"
        ? window.alert("כמות חייבת להיות לפחות 1")
        : import("react-native").then(({ Alert }) =>
            Alert.alert("שגיאה", "הכמות חייבת להיות לפחות 1")
          );
      return;
    }
    updateMutation.mutate({
      cartId: cart._id,
      itemId: item._id,
      quantity: newQuantity,
    });
  };

  // Handle item deletion with confirmation
  const handleDeleteProduct = (cartId, itemId) => {
    showConfirm(
      "מחיקת מוצר",
      "האם אתה בטוח שברצונך למחוק את המוצר מהעגלה?",
      () => deleteProductMutation.mutate({ cartId, itemId })
    );
  };

  // --- Upload receipt flow ---
  const handleUploadReceipt = async () => {
    try {
      let formData;

      if (Platform.OS === "web") {
        // File picker for web
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";

        fileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          formData = new FormData();
          formData.append("receipt", file);

          await sendForm(formData);
        };

        fileInput.click();
      } else {
        // Native image picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
        });

        if (result.canceled) return;

        const imageUri = result.assets[0].uri;
        formData = new FormData();
        formData.append("receipt", {
          uri: imageUri,
          name: "receipt.jpg",
          type: "image/jpeg",
        });

        await sendForm(formData);
      }
    } catch (err) {
      console.error("Upload receipt error:", err);
      setScanStatus("error");
    }
  };

  // Send form to backend
  async function sendForm(formData) {
    try {
      setScanStatus("loading");
      setShowModal(false);
      setScanResult(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const { data } = await axios.post(
        `http://localhost:3000/api/v1/receipts/scan/${cart._id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        }
      );

      setScanResult(data);
      setScanStatus("success");
      setShowModal(true);
      queryClient.invalidateQueries(["cart", cartId || familyId]);
    } catch (err) {
      if (axios.isCancel(err)) {
        setScanStatus("error");
      } else {
        console.error("Upload receipt error:", err);
        setScanStatus("error");
      }
    } finally {
      abortRef.current = null;
    }
  }

  // Cancel upload if user navigates away
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        setScanStatus("error");
      }
    };
  }, []);

  /* --- PDF Export --- */
  const handleExportPDF = async () => {
    try {
      const now = new Date().toLocaleString("he-IL");
      const rows = cart.items
        .map(
          (item) =>
            `<tr><td>${item.product?.name}</td><td>${item.quantity}</td></tr>`
        )
        .join("");

      // Create HTML container for PDF
      const container = document.createElement("div");
      container.innerHTML = `
        <div dir="rtl" style="font-family: sans-serif; text-align: right; padding:20px;">
          <h2>🛒 רשימת הקניות שלי - ${cart?.name || ""}</h2>
          <p>${now}</p>
          <table border="1" style="width:100%; border-collapse: collapse; text-align:right;">
            <thead>
              <tr style="background:#f0f0f0;">
                <th>שם מוצר</th>
                <th>כמות</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      document.body.removeChild(container);

      const pdf = new jsPDF("p", "pt", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      if (Platform.OS === "web") {
        pdf.save("רשימת-קניות.pdf"); // file name now Hebrew
      } else {
        const pdfBase64 = pdf.output("datauristring");
        Linking.openURL(pdfBase64);
      }
    } catch (err) {
      console.error("PDF export error:", err);
    }
  };

  /* --- Share via WhatsApp --- */
  const handleShareWhatsApp = () => {
    const header = `🛒 רשימת הקניות שלי - ${cart?.name || ""}\n`;
    const items = cart.items
      .map((item) => `${item.product?.name} — ${item.quantity} יחידות`)
      .join("\n");
    const message = `${header}\n${items}`;

    if (Platform.OS === "web") {
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    } else {
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      Linking.openURL(url).catch(() => {
        import("react-native").then(({ Alert }) =>
          Alert.alert("שגיאה", "וואטסאפ לא מותקן במכשיר")
        );
      });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, theme.container]}>
        <ActivityIndicator size="large" color="green" />
        <Text style={theme.text}>טוען את העגלה...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, theme.container]}>
        <Text style={{ color: "red" }}>
          נכשל בטעינת העגלה: {error?.response?.data?.error || error.message}
        </Text>
      </View>
    );
  }

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
        onPress={() => {
          navigation.navigate("ShoppingCart", {
            screen: "ShoppingCartScreen",
          });
        }}
      >
        <Icon name="arrow-back" size={24} color={theme.text.color} />
      </TouchableOpacity>

      {/* Status banner */}
      {scanStatus === "loading" && (
        <View style={[styles.banner, styles.bannerSuccess]}>
          <Text style={styles.bannerText}>
            📷 מתבצע זיהוי קבלה בעזרת AI... זה עלול להימשך מספר שניות
          </Text>
        </View>
      )}
      {scanStatus === "error" && (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>❌ הפעולה נעצרה</Text>
        </View>
      )}

      {/* Top right buttons */}
      <View style={styles.topRightButtons}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleExportPDF}>
          <Icon name="document-text-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShareWhatsApp}>
          <Icon name="logo-whatsapp" size={20} color="#fff" />
          <Text style={styles.btnText}>וואטסאפ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleUploadReceipt}>
          <Icon name="camera-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>קבלה</Text>
        </TouchableOpacity>
      </View>

      {/* Cart header */}
      <View style={styles.header}>
        <View
          style={[
            styles.cartAvatarWrapper,
            { backgroundColor: darkMode ? "#333" : "#eee" },
          ]}
        >
          {cart?.avatar ? (
            <Image source={{ uri: cart.avatar }} style={styles.cartAvatar} />
          ) : (
            <Icon
              name="cart-outline"
              size={40}
              color={darkMode ? "#fff" : "#1E88E5"}
            />
          )}
        </View>
        <Text style={[styles.title, theme.text]}>{cart?.name}</Text>
      </View>

      {/* Multi-select row */}
      <View style={styles.multiSelectRow}>
        {!multiSelectMode ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMultiSelectMode(true)}
          >
            <Icon name="checkbox-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>בחירה מרובה</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                const selectedObjects = cart.items.filter((i) =>
                  selectedItems.includes(i._id)
                );
                navigation.navigate("SelectedItems", {
                  selectedItems: selectedObjects,
                  cartId: cart._id,
                });
                setMultiSelectMode(false);
                setSelectedItems([]);
              }}
            >
              <Icon name="share-social-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>שתף</Text>
            </TouchableOpacity>

            {/* Select all toggle */}
            <TouchableOpacity
              style={styles.selectAllBox}
              onPress={toggleSelectAll}
            >
              <Icon
                name={
                  selectedItems.length === cart.items.length
                    ? "checkbox"
                    : "square-outline"
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.btnText}>סמן הכל</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Product list */}
      <FlatList
        data={cart?.items || []}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <CartItemRow
            cartId={cart._id}
            item={item}
            darkMode={darkMode}
            theme={theme}
            onUpdateQuantity={handleUpdateQuantity}
            onDelete={handleDeleteProduct}
            onOpenProduct={(product) => {
              if (!multiSelectMode) {
                navigation.navigate("ProductDetails", {
                  product,
                  from: "cartDetails",
                  cartId: cart._id,
                  originalFrom: from,
                });
              } else {
                toggleSelectItem(item._id);
              }
            }}
            multiSelectMode={multiSelectMode}
            selectedItems={selectedItems}
            toggleSelectItem={toggleSelectItem}
          />
        )}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal with scan results */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.container]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, theme.text]}>
                📷 תוצאות סריקת הקבלה
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="close" size={22} color={darkMode ? "#fff" : "#000"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={[styles.sectionTitle, theme.text]}>✅ מוצרים שזוהו</Text>
              {scanResult?.recognized?.length > 0 ? (
                scanResult.recognized.map((p, idx) => (
                  <Text key={`r-${idx}`} style={theme.text}>
                    {p.name} — {p.quantity} יח' | {p.price}₪{" "}
                    {p.barcode ? `| ברקוד: ${p.barcode}` : ""}
                  </Text>
                ))
              ) : (
                <Text style={theme.text}>לא זוהו מוצרים</Text>
              )}

              <Text style={[styles.sectionTitle, theme.text]}>🗑️ הוסר מהעגלה</Text>
              {scanResult?.remaining?.length > 0 ? (
                scanResult.remaining.map((p, idx) => (
                  <Text key={`rem-${idx}`} style={theme.text}>
                    {p.product?.name} — {p.quantity} יחידות
                  </Text>
                ))
              ) : (
                <Text style={theme.text}>לא הוסרו פריטים</Text>
              )}

              <Text style={[styles.sectionTitle, theme.text]}>❓ לא נמצאו התאמות</Text>
              {scanResult?.notFound?.length > 0 ? (
                scanResult.notFound.map((p, idx) => (
                  <Text key={`nf-${idx}`} style={theme.text}>
                    {p.name} — {p.quantity} יח'
                  </Text>
                ))
              ) : (
                <Text style={theme.text}>כל הפריטים תואמים</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn]}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 12 },
  header: { alignItems: "center", marginBottom: 20 },

  // Checkbox wrapper with spacing
  checkboxWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  cartAvatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  cartAvatar: { width: "100%", height: "100%", resizeMode: "cover" },
  title: { fontSize: 22, fontWeight: "bold" },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 10,
    elevation: 2,
    minHeight: 80,
  },
  leftSection: { width: 100, justifyContent: "center", alignItems: "flex-start" },
  quantityBox: { marginBottom: 8, minHeight: 20 },
  qtyDisplayValue: { fontSize: 16, fontWeight: "bold", textAlign: "left" },
  quantityEditRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  qtyBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 2,
    minWidth: 24,
    alignItems: "center",
  },
  qtyText: { fontSize: 14, fontWeight: "bold" },
  qtyValue: {
    fontSize: 14,
    marginHorizontal: 4,
    minWidth: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  actionButtons: { flexDirection: "row", alignItems: "center" },
  editBtn: {
    backgroundColor: "#4a90e2",
    padding: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  saveBtn: { backgroundColor: "green", padding: 4, borderRadius: 4, marginLeft: 4 },
  cancelBtn: { backgroundColor: "#ff9500", padding: 4, borderRadius: 4, marginLeft: 2 },
  deleteBtn: { backgroundColor: "red", padding: 6, borderRadius: 6 },
  centerSection: { flex: 1, paddingHorizontal: 12, justifyContent: "center" },
  productName: { fontSize: 16, fontWeight: "bold", marginBottom: 4, textAlign: "right" },
  productBrand: { fontSize: 14, textAlign: "right" },

  rightSection: { width: 60, alignItems: "center" },
  productImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 8, 
    resizeMode: "cover",
    marginLeft: 6, 
  },

  multiSelectRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  selectAllBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a90e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topRightButtons: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    zIndex: 10,
  },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a90e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  btnText: { color: "#fff", marginLeft: 4, fontSize: 14 },

  banner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  bannerSuccess: { backgroundColor: "green" },
  bannerError: { backgroundColor: "red" },
  bannerText: { color: "#fff", fontWeight: "bold", textAlign: "center" },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  sectionTitle: { marginTop: 12, fontWeight: "bold", fontSize: 16 },
  closeBtn: {
    marginTop: 20,
    backgroundColor: "#4a90e2",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
