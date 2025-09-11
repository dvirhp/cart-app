import React, { useState, useEffect, useRef } from "react";
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
import Icon from "react-native-vector-icons/Ionicons";
import FloatingSearchBar from "../../components/FloatingSearchBar";
import { fetchPricesByName } from "../../api/client";
import { addItemToCart, getCart } from "../../api/carts"; // ✅ includes getCart for refreshing active cart
import { useTheme } from "../../context/ThemeContext";
import { useActiveCart } from "../../context/ActiveCartContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext"; // ✅ get token for requests

/* ---------- Product details screen ---------- */
export default function ProductDetailsScreen({ route, navigation }) {
  const { theme, darkMode } = useTheme();
  const { activeCart, loadingCart, changeActiveCart } = useActiveCart(); // ✅ keep track of current active cart
  const { token } = useAuth();
  const { product } = route.params || {};

  const [prices, setPrices] = useState([]);          // state for price comparison results
  const [quantity, setQuantity] = useState(1);       // selected quantity
  const [successMsg, setSuccessMsg] = useState(false); // success banner visibility

  const queryClient = useQueryClient();

  // Animated top bar hide on scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const topBarTranslate = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -100],
    extrapolate: "clamp",
  });

  // Mutation: add product to cart
  const addMutation = useMutation({
    mutationFn: ({ cartId, productId, quantity }) =>
      addItemToCart(cartId, productId, quantity, token),
    onSuccess: async () => {
      // Refresh active cart after adding
      if (activeCart?._id) {
        try {
          const updated = await getCart(activeCart._id, token);
          if (updated) {
            changeActiveCart(updated);
          }
        } catch (e) {
          console.log("❌ Failed to refresh active cart", e);
        }
      }
      // Invalidate cached carts and show success
      queryClient.invalidateQueries(["carts"]);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    },
    onError: (err) => {
      console.error("❌ Failed to add item:", err);
    },
  });

  // Handler: add product to active cart
  const handleAddToCart = async (product, quantity) => {
    if (loadingCart) {
      Alert.alert("טוען", "אנא המתן לטעינת העגלה");
      return;
    }

    // If no active cart exists, redirect to create
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

  // Fetch prices from API by product name
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        if (!product?.name) return;
        const serverPrices = await fetchPricesByName(product.name);

        // Keep lowest price per chain
        const uniquePrices = serverPrices.reduce((acc, curr) => {
          const existing = acc.find((p) => p.chain === curr.chain);
          if (!existing || curr.price < existing.price) {
            acc = acc.filter((p) => p.chain !== curr.chain);
            acc.push(curr);
          }
          return acc;
        }, []);
        setPrices(uniquePrices);
      } catch (err) {
        console.error("❌ Failed to fetch prices:", err);
      }
    };
    fetchPrices();
  }, [product?.name]);

  if (!product) {
    return (
      <View style={[styles.loading, theme.container]}>
        <Text style={theme.text}>טוען מוצר...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, theme.container]}>
      {/* Success banner after add to cart */}
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

      {/* Animated top bar with search + back */}
      <Animated.View
        style={[styles.topBar, { transform: [{ translateY: topBarTranslate }] }]}
      >
        <FloatingSearchBar navigation={navigation} />
        <TouchableOpacity
          onPress={() => {
            if (route.params?.from === "cartDetails") {
              navigation.navigate("CartDetails", {
                cartId: route.params?.cartId,
                from: route.params?.originalFrom,
              });
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color={theme.text.color} />
          <Text style={[styles.backText, theme.text]}>חזרה</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 200 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Product image */}
        <Image
          source={{ uri: product.images?.[0] || "https://via.placeholder.com/300" }}
          style={[styles.image, { backgroundColor: darkMode ? "#333" : "#eee" }]}
        />

        {/* Product info fields */}
        <View style={styles.field}>
          <Text style={[styles.label, theme.text]}>שם:</Text>
          <Text style={[styles.value, theme.text]}>{product.name}</Text>
        </View>

        {product.brand?.length > 1 && (
          <View style={styles.field}>
            <Text style={[styles.label, theme.text]}>מותג:</Text>
            <Text style={[styles.value, theme.text]}>{product.brand}</Text>
          </View>
        )}

        {product.description?.length > 1 && (
          <View style={styles.field}>
            <Text style={[styles.label, theme.text]}>תיאור:</Text>
            <Text style={[styles.value, theme.text]}>{product.description}</Text>
          </View>
        )}

        {product.barcode?.length > 1 && (
          <View style={styles.field}>
            <Text style={[styles.label, theme.text]}>ברקוד:</Text>
            <Text style={[styles.value, theme.text]}>{product.barcode}</Text>
          </View>
        )}

        {/* Price comparison section */}
        <View
          style={[
            styles.pricesBox,
            {
              backgroundColor: darkMode ? "#1e1e1e" : "#fff",
              borderColor: darkMode ? "#333" : "transparent",
              borderWidth: darkMode ? 1 : 0,
              shadowOpacity: darkMode ? 0 : 0.05,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, theme.text]}>השוואת מחירים:</Text>
          {prices.length === 0 ? (
            <Text style={[styles.value, theme.text]}>לא נמצאו מחירים</Text>
          ) : (
            prices.map((p) => (
              <View key={p._id} style={styles.priceRow}>
                <Text style={[styles.chain, theme.text]}>
                  {p.chain || "רשת לא ידועה"}
                  {p.storeName ? ` (${p.storeName})` : ""}
                </Text>
                <Text
                  style={[
                    styles.price,
                    { color: darkMode ? "#4dabf7" : "#4a90e2" },
                  ]}
                >
                  ₪{p.price.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

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
            onPress={() => handleAddToCart(product, quantity)}
          >
            <Text style={styles.addText}>הוסף לסל</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 40,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  backText: { marginLeft: 6, fontSize: 16, fontWeight: "600" },
  image: { width: "100%", height: 250, borderRadius: 12, marginBottom: 20 },
  field: { marginBottom: 12, paddingHorizontal: 12 },
  label: { fontSize: 14, fontWeight: "600" },
  value: { fontSize: 14, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  pricesBox: {
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowRadius: 5,
    elevation: 2,
  },
  priceRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  chain: { flex: 1, fontWeight: "600" },
  price: { fontSize: 14, fontWeight: "bold" },
  actions: { flexDirection: "row", alignItems: "center", marginTop: 20, paddingHorizontal: 12 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  qtyText: { fontSize: 18, fontWeight: "bold" },
  qty: { marginHorizontal: 12, fontSize: 16 },
  addBtn: {
    marginLeft: 10,
    backgroundColor: "#4a90e2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addText: { color: "#fff", fontWeight: "bold" },
});
