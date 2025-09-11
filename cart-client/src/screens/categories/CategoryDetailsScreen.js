import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import FloatingSearchBar from "../../components/FloatingSearchBar";
import { useTheme } from "../../context/ThemeContext";

/* ---------- Category details screen ---------- */
export default function CategoryDetailsScreen({ route, navigation }) {
  const { category } = route.params;
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, darkMode } = useTheme();

  // Animated value to track scroll position
  const scrollY = useRef(new Animated.Value(0)).current;

  // Interpolation: move top bar up/down based on scroll
  const topBarTranslate = scrollY.interpolate({
    inputRange: [0, 50], // scroll distance
    outputRange: [0, -80], // top bar hides upward
    extrapolate: "clamp",
  });

  // Render each subcategory with optional children
  const renderSubCategory = ({ item }) => (
    <View style={styles.block}>
      {/* Subcategory card */}
      <TouchableOpacity
        style={[
          styles.subCard,
          { backgroundColor: darkMode ? "#2a2a2a" : "#E3F2FD" },
        ]}
        onPress={() => {
          if (item.children && item.children.length > 0) {
            navigation.navigate("Products", {
              categoryId: item._id,
              categoryName: item.name,
              includeChildren: true,
            });
          } else {
            navigation.navigate("Products", {
              categoryId: item._id,
              categoryName: item.name,
            });
          }
        }}
      >
        <Icon
          name={item.icon || "list-outline"}
          size={24}
          color={darkMode ? "#4dabf7" : "#1E88E5"}
        />
        <Text
          style={[
            styles.subCategory,
            { color: darkMode ? "#90caf9" : "#1565C0" },
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>

      {/* Child categories list */}
      {item.children?.map((child) => (
        <TouchableOpacity
          key={child._id}
          style={[
            styles.childCard,
            { backgroundColor: darkMode ? "#333" : "#F1F1F1" },
          ]}
          onPress={() =>
            navigation.navigate("Products", {
              categoryId: child._id,
              categoryName: child.name,
            })
          }
        >
          <Text style={[styles.child, { color: darkMode ? "#bbb" : "#555" }]}>
            {child.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, theme.container]}>
      {/* Animated top bar with search + back button */}
      <Animated.View
        style={[
          styles.topBar,
          {
            transform: [{ translateY: topBarTranslate }],
          },
        ]}
      >
        <FloatingSearchBar navigation={navigation} />

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color={theme.text.color} />
          <Text style={[styles.headerTitle, theme.text]}>{category.name}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Subcategories list */}
      <Animated.FlatList
        data={category.children || []}
        keyExtractor={(item) => item._id}
        renderItem={renderSubCategory}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 90, // leave space for topBar
          paddingBottom: tabBarHeight + 20,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    backgroundColor: "transparent",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  headerTitle: {
    marginLeft: 6,
    fontSize: 18,
    fontWeight: "bold",
  },
  block: { marginBottom: 16, paddingHorizontal: 16 },
  subCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  subCategory: { fontSize: 18, fontWeight: "600", marginRight: 8 },
  childCard: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 36,
  },
  child: { fontSize: 15, textAlign: "right" },
});
