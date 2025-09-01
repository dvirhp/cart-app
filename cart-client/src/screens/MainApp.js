import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

// ---- Settings related screens ----
import SettingsScreen from './setting/SettingsScreen';
import AccountManagerScreen from './setting/AccountManagerScreen';
import NotificationsScreen from './setting/NotificationsScreen';
import HelpScreen from './setting/HelpScreen';
import AboutScreen from './setting/AboutScreen';
import ChangePasswordScreen from './setting/ChangePasswordScreen';

// ---- Family navigation stack ----
import FamilyStack from '../navigation/FamilyStack';

const Tab = createBottomTabNavigator();
const AccountStack = createNativeStackNavigator();

/* ---------- Dummy placeholder tabs ---------- */
function HomeScreen() {
  const { theme } = useTheme();
  return <View style={[styles.screen, theme.container]} />;
}

function CategoriesScreen() {
  const { theme } = useTheme();
  return <View style={[styles.screen, theme.container]} />;
}

function CartScreen() {
  const { theme } = useTheme();
  return <View style={[styles.screen, theme.container]} />;
}

/* ---------- Nested stack for Settings section ---------- */
function AccountNavigator() {
  const { theme } = useTheme();

  return (
    <AccountStack.Navigator
      initialRouteName="SettingsHome"
      screenOptions={{
        headerShown: false,            // hide headers for internal stack
        contentStyle: theme.container, // respect current theme
      }}
    >
      <AccountStack.Screen name="SettingsHome" component={SettingsScreen} />
      <AccountStack.Screen name="AccountManager" component={AccountManagerScreen} />
      <AccountStack.Screen name="Notifications" component={NotificationsScreen} />
      <AccountStack.Screen name="Help" component={HelpScreen} />
      <AccountStack.Screen name="About" component={AboutScreen} />
      <AccountStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
    </AccountStack.Navigator>
  );
}

/* ---------- Main bottom tab navigation ---------- */
export default function MainApp() {
  const { darkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // no header on tab screens
        tabBarStyle: {
          height: 65,
          position: 'absolute',
          backgroundColor: darkMode ? '#222' : '#fff',
        },
        tabBarActiveTintColor: darkMode ? '#fff' : '#000',
        tabBarInactiveTintColor: darkMode ? '#aaa' : '#666',
      }}
    >
      {/* Left 1: Home */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Left 2: Categories */}
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Center: Cart – styled as a floating green button */}
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.cartButton, focused && styles.cartButtonFocused]}>
              <Icon name="cart-outline" size={24} color="#fff" />
            </View>
          ),
        }}
      />

      {/* Right 1: Families (instead of Search) */}
      <Tab.Screen
        name="Families"
        component={FamilyStack}
        options={{
          title: 'Families',
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Right 2: Settings */}
      <Tab.Screen
        name="Settings"
        component={AccountNavigator}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  screen: { flex: 1 }, // empty placeholder screen
  cartButton: {
    backgroundColor: 'green',
    borderRadius: 35,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartButtonFocused: {
    transform: [{ scale: 1.05 }], // enlarge slightly when focused
  },
});
