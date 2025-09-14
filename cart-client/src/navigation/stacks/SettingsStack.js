import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";

import SettingsScreen from "../../screens/setting/SettingsScreen";
import AccountManagerScreen from "../../screens/setting/AccountManagerScreen";
import NotificationsScreen from "../../screens/setting/NotificationsScreen";
import HelpScreen from "../../screens/setting/HelpScreen";
import AboutScreen from "../../screens/setting/AboutScreen";
import ChangePasswordScreen from "../../screens/setting/ChangePasswordScreen";

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  const { theme, darkMode } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: darkMode ? "#111" : "#fff" },
        headerTintColor: theme.text.color,
        contentStyle: theme.container,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AccountManager"
        component={AccountManagerScreen}
        options={{ headerLargeTitle: true, headerTitle: "" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerLargeTitle: true, headerTitle: "" }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ headerLargeTitle: true, headerTitle: "" }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerLargeTitle: true, headerTitle: "" }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerLargeTitle: true, headerTitle: "" }}
      />
    </Stack.Navigator>
  );
}
