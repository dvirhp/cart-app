import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Keyboard,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const API_BASE = "http://localhost:3000/api/v1";

export default function FloatingSearchBar({ navigation }) {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  /* --- Handle product search with debounce and priority sorting --- */
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const r = await fetch(
          `${API_BASE}/products/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await r.json();

        const normalizedQuery = query.toLowerCase();

        // Sort results by relevance: exact match > startsWith > includes
        const sorted = (data || []).sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();

          if (aName === normalizedQuery && bName !== normalizedQuery) return -1;
          if (bName === normalizedQuery && aName !== normalizedQuery) return 1;

          if (aName.startsWith(normalizedQuery) && !bName.startsWith(normalizedQuery)) return -1;
          if (bName.startsWith(normalizedQuery) && !aName.startsWith(normalizedQuery)) return 1;

          if (aName.includes(normalizedQuery) && !bName.includes(normalizedQuery)) return -1;
          if (bName.includes(normalizedQuery) && !aName.includes(normalizedQuery)) return 1;

          return 0;
        });

        setResults(sorted);
      } catch (e) {
        console.error("Search failed", e);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const iconColor = darkMode ? "#fff" : "#333";

  // Navigate to the products screen with search results
  const handleSearchSubmit = () => {
    if (query.trim().length > 0 && results.length > 0) {
      navigation.navigate("Products", {
        categoryId: null, // Not required
        categoryName: `תוצאות חיפוש: ${query}`,
        searchResults: results, // Pass sorted results
      });
      setOpen(false);
    }
  };

  return (
    <>
      {/* Search icon / input toggle */}
      <View
        style={[
          styles.container,
          { backgroundColor: darkMode ? "#1e1e1e" : "#fff" },
        ]}
      >
        {!open ? (
          <TouchableOpacity onPress={() => setOpen(true)}>
            <Icon name="search-outline" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: darkMode ? "#1e1e1e" : "#fff" },
            ]}
          >
            <TextInput
              autoFocus
              placeholder="חפש מוצר..."
              placeholderTextColor={darkMode ? "#aaa" : "#666"}
              style={[styles.input, { color: darkMode ? "#fff" : "#000" }]}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearchSubmit} // Trigger search on Enter
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={() => {
                setOpen(false);
                setQuery("");
                setResults([]);
              }}
            >
              <Icon name="close" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search results dropdown */}
      {open && results.length > 0 && (
        <View style={styles.overlay}>
          <FlatList
            data={results}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.resultItem,
                  {
                    backgroundColor: darkMode
                      ? "rgba(44,44,44,0.9)"
                      : "rgba(255,255,255,0.9)",
                  },
                ]}
                onPress={() => {
                  setOpen(false);
                  setQuery("");
                  setResults([]);
                  navigation.navigate("ProductDetails", {
                    product: item,
                  });
                }}
              >
                <Image
                  source={{
                    uri: item.images?.[0] || "https://via.placeholder.com/80",
                  }}
                  style={styles.resultImage}
                />
                <Text
                  style={[
                    styles.resultText,
                    { color: darkMode ? "#fff" : "#000" },
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    left: 16,
    zIndex: 20,
    padding: 8,
    borderRadius: 20,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    width: 250,
  },
  input: { flex: 1, height: 36, fontSize: 14 },
  overlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 15,
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  resultImage: { width: 40, height: 40, borderRadius: 6, marginLeft: 8 },
  resultText: { fontSize: 14, flex: 1 },
});
