import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";

import SelectedItemsScreen from "../../screens/cart/SelectedItemsScreen";
import ShoppingCartScreen from "../../screens/cart/ShoppingCartScreen";
import CreateCartScreen from "../../screens/cart/CreateCartScreen";
import CartDetailsScreen from "../../screens/cart/CartDetailsScreen";
import ProductDetailsScreen from "../../screens/categories/ProductDetailsScreen";

const Stack = createNativeStackNavigator();

export default function CartStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="ShoppingCartScreen"   // ✅ העגלה הראשית כברירת מחדל
      screenOptions={{
        headerShown: false,
        contentStyle: theme.container,
      }}
    >
      <Stack.Screen
        name="ShoppingCartScreen"
        component={ShoppingCartScreen}
      />
      <Stack.Screen
        name="SelectedItems"
        component={SelectedItemsScreen}
      />
      <Stack.Screen
        name="CreateCart"
        component={CreateCartScreen}
      />
      <Stack.Screen
        name="CartDetails"
        component={CartDetailsScreen}
      />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
      />
    </Stack.Navigator>
  );
}
