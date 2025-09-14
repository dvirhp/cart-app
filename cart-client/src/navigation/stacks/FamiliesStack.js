import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";

import FamiliesHomeScreen from "../../screens/familyScreens/FamiliesHomeScreen";
import FamilyDetailsScreen from "../../screens/familyScreens/FamilyDetailsScreen";
import CreateFamilyScreen from "../../screens/familyScreens/CreateFamilyScreen";
import JoinFamilyScreen from "../../screens/familyScreens/JoinFamilyScreen";

const Stack = createNativeStackNavigator();

export default function FamiliesStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.container.backgroundColor },
        headerTintColor: theme.text.color,
        headerTitleStyle: { color: theme.text.color, textAlign: "right" },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="FamiliesHome"
        component={FamiliesHomeScreen}
        options={{ title: "משפחות", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="CreateFamily"
        component={CreateFamilyScreen}
        options={{ title: "דף משפחות" }}
      />
      <Stack.Screen
        name="JoinFamily"
        component={JoinFamilyScreen}
        options={{ title: "דף משפחות" }}
      />
      <Stack.Screen
        name="FamilyDetails"
        component={FamilyDetailsScreen}
        options={{ title: "דף משפחות" }}
      />
    </Stack.Navigator>
  );
}
