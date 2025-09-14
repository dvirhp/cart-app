import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CategoriesScreen from "../../screens/categories/CategoriesScreen";
import CategoryDetailsScreen from "../../screens/categories/CategoryDetailsScreen";
import ProductsScreen from "../../screens/categories/ProductsScreen";
import ProductDetailsScreen from "../../screens/categories/ProductDetailsScreen";

const Stack = createNativeStackNavigator();

export default function CategoriesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CategoriesHome" component={CategoriesScreen} />
      <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    </Stack.Navigator>
  );
}
