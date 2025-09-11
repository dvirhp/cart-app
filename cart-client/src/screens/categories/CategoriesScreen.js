import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { CATEGORY_ICONS } from "../../constants/categoryIcons";
import FloatingSearchBar from "../../components/FloatingSearchBar";
import { useTheme } from "../../context/ThemeContext";

const API_BASE = "http://localhost:3000/api/v1";

/* ---------- Categories main screen ---------- */
export default function CategoriesScreen({ navigation }) {
  const { token } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, darkMode } = useTheme();

  // Fetch categories from API
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to fetch categories");
      return r.json();
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centerScreen, theme.container]}>
        <ActivityIndicator size="large" color={darkMode ? "#fff" : "#000"} />
        <Text style={[styles.loading, theme.text]}>טוען קטגוריות...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerScreen, theme.container]}>
        <Text style={[styles.error, { color: darkMode ? "orange" : "red" }]}>
          שגיאה בטעינת קטגוריות
        </Text>
      </View>
    );
  }

  // Only top-level categories (no parent)
  const topCategories = data.filter((c) => c.parent === null);

  return (
    <View style={[styles.container, theme.container]}>
      {/* Floating search bar pinned to top */}
      <View style={styles.topBar}>
        <FloatingSearchBar navigation={navigation} />
      </View>

      {/* Categories grid */}
      <FlatList
        style={[theme.container]}
        data={topCategories}
        numColumns={2}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 70, // leave space for search bar
          paddingBottom: tabBarHeight + 20,
        }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: darkMode ? "#1e1e1e" : "#fff",
                shadowOpacity: darkMode ? 0 : 0.1,
                borderWidth: darkMode ? 1 : 0,
                borderColor: darkMode ? "#333" : "transparent",
              },
            ]}
            onPress={() =>
              navigation.navigate("CategoryDetails", {
                category: item,
              })
            }
          >
            {/* Category icon */}
            <Icon
              name={CATEGORY_ICONS[item.name] || "albums-outline"}
              size={50}
              color={darkMode ? "#4dabf7" : "#4a90e2"}
              style={{ marginBottom: 10 }}
            />

            {/* Category name */}
            <Text style={[styles.name, theme.text]}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
  },
  loading: { textAlign: "center", marginTop: 12, fontSize: 16 },
  error: { textAlign: "center", marginTop: 12, fontSize: 16 },
  card: {
    flex: 1,
    margin: 8,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowRadius: 6,
    elevation: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
