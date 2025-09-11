import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Icon from "react-native-vector-icons/Ionicons";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useQuery } from "@tanstack/react-query";
import { listCarts, addItemToCart, deleteCartItem } from "../../api/carts";

/* ---------- Single row for each selected item ---------- */
function SelectedItemRow({ item, darkMode, theme }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: darkMode ? "#1e1e1e" : "#fff" },
      ]}
    >
      <Image
        source={{
          uri: item.product?.images?.[0] || "https://via.placeholder.com/100",
        }}
        style={styles.image}
      />
      <Text style={[styles.name, theme.text]} numberOfLines={2}>
        {item.product?.name}
      </Text>
      <Text style={[styles.qty, theme.text]}>כמות: {item.quantity}</Text>
    </View>
  );
}

/* ---------- Main screen: Selected items manager ---------- */
export default function SelectedItemsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedItems = [], cartId, from } = route.params || {};
  const { token } = useAuth();
  const { theme, darkMode } = useTheme();

  // Local UI states
  const [showCartList, setShowCartList] = useState(false); // modal for choosing target cart
  const [showMoveChoice, setShowMoveChoice] = useState(false); // modal for choosing move type
  const [moveWithDelete, setMoveWithDelete] = useState(false); // track whether to delete after move

  // Load all carts (personal, family, shared) except the current one
  const { data: allCarts = [] } = useQuery({
    queryKey: ["allCarts"],
    queryFn: async () => {
      const res = await listCarts(token);
      const all = [
        ...(res.personal || []),
        ...(res.family || []),
        ...(res.shared || []),
      ];
      return all.filter((c) => c._id !== cartId);
    },
  });

  // Export selected items to PDF (web = save, mobile = open in viewer)
  const handleExportPDF = async () => {
    try {
      const now = new Date().toLocaleString("he-IL");
      const rows = selectedItems
        .map(
          (item) =>
            `<tr><td>${item.product?.name}</td><td>${item.quantity}</td></tr>`
        )
        .join("");

      const container = document.createElement("div");
      container.innerHTML = `
        <div dir="rtl" style="font-family: sans-serif; text-align: right; padding:20px;">
          <h2>🛒 פריטים שנבחרו</h2>
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
        pdf.save("selected-items.pdf");
      } else {
        const pdfBase64 = pdf.output("datauristring");
        Linking.openURL(pdfBase64);
      }
    } catch (err) {
      console.error("❌ PDF export error:", err);
    }
  };

  // Share selected items through WhatsApp (web or mobile)
  const handleShareWhatsApp = () => {
    const header = `🛒 פריטים שנבחרו\n`;
    const items = selectedItems
      .map((i) => `${i.product?.name} — ${i.quantity} יחידות`)
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

  // Move items to another cart (optionally delete from current)
  const handleMoveItems = async (targetCartId) => {
    try {
      for (const item of selectedItems) {
        await addItemToCart(
          targetCartId,
          item.product._id,
          item.quantity,
          token
        );
      }

      if (moveWithDelete) {
        for (const item of selectedItems) {
          await deleteCartItem(cartId, item._id, token);
        }
      }

      setShowCartList(false);
      navigation.navigate("CartDetails", { cartId: targetCartId, from });
    } catch (err) {
      console.error("❌ Move items error:", err);
    }
  };

  return (
    <View style={[styles.container, theme.container]}>
      {/* Top actions bar with back & actions */}
      <View
        style={[
          styles.topActionsBar,
          {
            backgroundColor: darkMode
              ? "rgba(30,30,30,0.8)"
              : "rgba(255,255,255,0.9)",
          },
        ]}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
        >
          <Icon name="arrow-back" size={22} color={theme.text.color} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, theme.text]}>פריטים שנבחרו</Text>

        {/* Action buttons: WhatsApp, PDF, Move */}
        <View style={styles.actionsGroup}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShareWhatsApp}>
            <Icon name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.btnText}>וואטסאפ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleExportPDF}>
            <Icon name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowMoveChoice(true)}
          >
            <Icon name="swap-horizontal-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>העבר לעגלה</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Products grid */}
      <FlatList
        data={selectedItems}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <SelectedItemRow item={item} darkMode={darkMode} theme={theme} />
        )}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal: choose move type */}
      <Modal visible={showMoveChoice} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.container]}>
            <Text style={[styles.modalTitle, theme.text]}>
              העברה לעגלה אחרת
            </Text>
            <TouchableOpacity
              style={styles.cartOption}
              onPress={() => {
                setMoveWithDelete(false);
                setShowMoveChoice(false);
                setShowCartList(true);
              }}
            >
              <Text style={theme.text}>רק העברה</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cartOption}
              onPress={() => {
                setMoveWithDelete(true);
                setShowMoveChoice(false);
                setShowCartList(true);
              }}
            >
              <Text style={theme.text}>העבר ומחק מהעגלה הנוכחית</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowMoveChoice(false)}
            >
              <Text style={styles.closeBtnText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: choose target cart */}
      <Modal visible={showCartList} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.container]}>
            <Text style={[styles.modalTitle, theme.text]}>בחר עגלה</Text>
            <FlatList
              data={allCarts}
              keyExtractor={(c) => c._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cartOption}
                  onPress={() => handleMoveItems(item._id)}
                >
                  <Text style={theme.text}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowCartList(false)}
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
  container: { flex: 1 },
  topActionsBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.6)", // semi-transparent overlay
    zIndex: 20,
  },
  headerBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  actionsGroup: { flexDirection: "row", alignItems: "center" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a90e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  btnText: { color: "#fff", marginLeft: 6, fontWeight: "bold" },
  card: {
    flex: 0.48,
    marginBottom: 12,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  image: { width: 100, height: 100, borderRadius: 8, marginBottom: 6 },
  name: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  qty: { fontSize: 12 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  cartOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "center",
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: "#4a90e2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "bold" },
});
