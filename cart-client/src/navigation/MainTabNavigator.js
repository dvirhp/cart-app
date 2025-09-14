import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../context/ThemeContext";

import CategoriesStack from "./stacks/CategoriesStack";
import FamiliesStack from "./stacks/FamiliesStack";
import CartStack from "./stacks/CartStack";
import SettingsStack from "./stacks/SettingsStack";

const Tab = createBottomTabNavigator();

/* Temporary Home screen (can be replaced later) */
function HomeScreen() {
  const { theme } = useTheme();
  return <View style={[styles.screen, theme.container]} />;
}

/* Floating green cart button */
function CartButton({ children, onPress }) {
  return (
    <TouchableOpacity
      style={{
        top: -15,
        justifyContent: "center",
        alignItems: "center",
      }}
      onPress={onPress}   // ✅ השתמש ב־props.onPress (ברירת המחדל של ה־tab)
      activeOpacity={0.8}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: "green",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 8,
        }}
      >
        {children}
      </View>
    </TouchableOpacity>
  );
}

export default function MainTabNavigator() {
  const { darkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 65,
          position: "absolute",
          backgroundColor: darkMode ? "#111" : "#fff",
          borderTopColor: darkMode ? "#333" : "#ddd",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: darkMode ? "#fff" : "#000",
        tabBarInactiveTintColor: darkMode ? "#888" : "#666",
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
          title: "",
        }}
      />

      <Tab.Screen
        name="Categories"
        component={CategoriesStack}
        options={{
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="grid-outline" size={size} color={color} />
          ),
          title: "",
        }}
      />

      <Tab.Screen
        name="ShoppingCart"
        component={CartStack}
        options={{
          tabBarButton: (props) => (
            <CartButton {...props}>
              <Icon name="cart-outline" size={26} color="#fff" />
            </CartButton>
          ),
          title: "",
        }}
      />

      <Tab.Screen
        name="Families"
        component={FamiliesStack}
        options={{
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
          title: "",
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="settings-outline" size={size} color={color} />
          ),
          title: "",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
