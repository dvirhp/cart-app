import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProductsByCategory } from "../../api/products";
import { addItemToCart, getCart } from "../../api/carts"; 
import { useAuth } from "../../context/AuthContext";
import { useActiveCart } from "../../context/ActiveCartContext";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import FloatingSearchBar from "../../components/FloatingSearchBar";
import { useTheme } from "../../context/ThemeContext";

/* ---------- Product Card Component ---------- */
function ProductCard({ item, onAddToCart }) {
  const [quantity, setQuantity] = useState(1); // Local state for quantity
  const { theme, darkMode } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: darkMode ? "#1e1e1e" : "#fff",
          borderColor: darkMode ? "#333" : "transparent",
          borderWidth: darkMode ? 1 : 0,
          shadowOpacity: darkMode ? 0 : 0.1,
        },
      ]}
    >
      {/* Product image */}
      <Image
        source={{ uri: item.images?.[0] || "https://via.placeholder.com/150" }}
        style={[styles.image, { backgroundColor: darkMode ? "#333" : "#eee" }]}
      />

      {/* Product name */}
      <Text style={[styles.name, theme.text]} numberOfLines={2}>
        {item.name}
      </Text>

      {/* Product brand */}
      <Text
        style={[
          styles.brand,
          { color: darkMode ? "#aaa" : "gray", textAlign: "center" },
        ]}
      >
        {item.brand || "מותג לא ידוע"}
      </Text>

      {/* Quantity selector + Add to cart */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.qtyBtn, { backgroundColor: darkMode ? "#333" : "#eee" }]}
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
        >
          <Text style={[styles.qtyText, theme.text]}>-</Text>
        </TouchableOpacity>

        <Text style={[styles.qty, theme.text]}>{quantity}</Text>

        <TouchableOpacity
          style={[styles.qtyBtn, { backgroundColor: darkMode ? "#333" : "#eee" }]}
          onPress={() => setQuantity((q) => q + 1)}
        >
          <Text style={[styles.qtyText, theme.text]}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onAddToCart(item, quantity)}
        >
          <Text style={styles.addText}>הוסף לסל</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------- Products Screen ---------- */
export default function ProductsScreen({ route, navigation }) {
  const {
    categoryId,
    categoryName,
    includeChildren = false,
    searchResults,
  } = route.params || {};

  const { token } = useAuth();
  const { activeCart, loadingCart, changeActiveCart } = useActiveCart();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, darkMode } = useTheme();
  const queryClient = useQueryClient();

  const [successMsg, setSuccessMsg] = useState(false); // Success banner state

  // Mutation: add product to active cart
  const addMutation = useMutation({
    mutationFn: ({ cartId, productId, quantity }) =>
      addItemToCart(cartId, productId, quantity, token),
    onSuccess: async () => {
      // Refresh active cart after adding
      if (activeCart?._id) {
        try {
          const updated = await getCart(activeCart._id, token);
          if (updated) changeActiveCart(updated);
        } catch (e) {
          console.log("❌ Failed to refresh active cart", e);
        }
      }
      queryClient.invalidateQueries(["carts"]);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    },
    onError: (err) => {
      console.error("❌ Failed to add item:", err);
    },
  });

  // Handler: add to cart with checks
  const handleAddToCart = async (product, quantity) => {
    if (loadingCart) {
      Alert.alert("טוען", "אנא המתן לטעינת העגלה");
      return;
    }
    if (!activeCart?._id) {
      navigation.navigate("ShoppingCart", { screen: "CreateCart" });
      return;
    }
    addMutation.mutate({
      cartId: activeCart._id,
      productId: product._id,
      quantity,
    });
  };

  // Fetch products by category / children / search results
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", categoryId, includeChildren],
    queryFn: async () => {
      if (searchResults) return searchResults;
      if (includeChildren) {
        const r = await fetch(
          `http://localhost:3000/api/v1/products/by-category/${categoryId}/all`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const res = await r.json();
        return res.products || [];
      } else {
        return listProductsByCategory(categoryId, token);
      }
    },
    enabled: !searchResults,
    initialData: searchResults || undefined,
  });

  /* ---------- Loading states ---------- */
  if (loadingCart) {
    return (
      <View style={[styles.centerScreen, theme.container]}>
        <ActivityIndicator size="large" color={darkMode ? "#fff" : "#000"} />
        <Text style={theme.text}>טוען עגלה...</Text>
      </View>
    );
  }
  if (isLoading) {
    return (
      <View style={[styles.centerScreen, theme.container]}>
        <ActivityIndicator size="large" color={darkMode ? "#fff" : "#000"} />
        <Text style={[styles.loading, theme.text]}>טוען מוצרים...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.centerScreen, theme.container]}>
        <Text style={[styles.error, theme.text]}>שגיאה בטעינת המוצרים</Text>
      </View>
    );
  }
  if (!data || data.length === 0) {
    return (
      <View style={[styles.centerScreen, theme.container]}>
        <Text style={[styles.empty, theme.text]}>אין מוצרים להצגה</Text>
      </View>
    );
  }

  /* ---------- Main content ---------- */
  return (
    <View style={[styles.container, theme.container]}>
      {/* Success banner */}
      {successMsg && (
        <View
          style={[
            styles.successBanner,
            { backgroundColor: darkMode ? "#264d36" : "#d4edda" },
          ]}
        >
          <Text
            style={[styles.successText, { color: darkMode ? "#c8f7d2" : "#155724" }]}
          >
            ✅ נוסף בהצלחה!
          </Text>
        </View>
      )}

      {/* Top toolbar with search + back */}
      <Animated.View style={styles.topBar}>
        <FloatingSearchBar navigation={navigation} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={theme.text.color} />
          <Text style={[styles.headerTitle, theme.text]}>
            {categoryName || "תוצאות חיפוש"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Grid of products */}
      <Animated.FlatList
        style={[theme.container]}
        data={data}
        keyExtractor={(item) =>
          item._id ||
          item.id ||
          item.productId ||
          item.product?._id ||
          String(Math.random()) // fallback if missing ID
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ flex: 0.48 }}
            onPress={() => navigation.navigate("ProductDetails", { product: item })}
          >
            <ProductCard item={item} onAddToCart={handleAddToCart} />
          </TouchableOpacity>
        )}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{
          paddingTop: 90,
          paddingBottom: tabBarHeight + 40,
          flexGrow: 1, // ✅ ensures full height even if few items
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
  loading: { textAlign: "center", marginTop: 20, fontSize: 16 },
  error: { textAlign: "center", marginTop: 20, fontSize: 16 },
  empty: { textAlign: "center", marginTop: 20, fontSize: 16 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingHorizontal: 10,
  },
  backBtn: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  headerTitle: { marginLeft: 6, fontSize: 16, fontWeight: "600" },
  card: {
    flex: 0.48,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowRadius: 6,
    elevation: 3,
  },
  image: { width: 100, height: 100, borderRadius: 8, marginBottom: 8 },
  name: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  brand: { fontSize: 12, marginBottom: 8 },
  actions: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  qtyBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qtyText: { fontSize: 16, fontWeight: "bold" },
  qty: { marginHorizontal: 8, fontSize: 14 },
  addBtn: {
    marginLeft: 10,
    backgroundColor: "#4a90e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addText: { color: "#fff", fontWeight: "bold" },
});
