import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

import SettingsScreen from './setting/SettingsScreen';
import FamilyPage from './setting/familyScreens/FamilyPage';
import JoinFamilyPage from './setting/familyScreens/JoinFamilyPage';
import AccountManagerScreen from './setting/AccountManagerScreen';
import NotificationsScreen from './setting/NotificationsScreen';
import HelpScreen from './setting/HelpScreen';
import AboutScreen from './setting/AboutScreen';

// ---- navigators ----
const Tab = createBottomTabNavigator();
const AccountStack = createNativeStackNavigator();

// ---- dummy tabs ----
function HomeScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.screen, theme.container]}>
      <Text style={[styles.title, theme.text]}>🏠 Welcome Home!</Text>
    </View>
  );
}

function CategoriesScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.screen, theme.container]}>
      <Text style={theme.text}>Categories Page</Text>
    </View>
  );
}

function SearchScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.screen, theme.container]}>
      <Text style={theme.text}>Search Page</Text>
    </View>
  );
}

function CartScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.screen, theme.container]}>
      <Text style={theme.text}>Cart Page</Text>
    </View>
  );
}

// ---- Settings stack (nested) ----
function AccountNavigator() {
  const { theme } = useTheme();

  return (
    <AccountStack.Navigator
      initialRouteName="SettingsHome"
      screenOptions={{
        headerShown: false,
        // שומר על רקע אחיד (דארק/לייט) בכל מסכי ה‑stack
        contentStyle: theme.container,
      }}
    >
      <AccountStack.Screen name="SettingsHome" component={SettingsScreen} />
      <AccountStack.Screen name="AccountManager" component={AccountManagerScreen} />
      <AccountStack.Screen name="Family" component={FamilyPage} />
      <AccountStack.Screen name="JoinFamily" component={JoinFamilyPage} />
      <AccountStack.Screen name="Notifications" component={NotificationsScreen} />
      <AccountStack.Screen name="Help" component={HelpScreen} />
      <AccountStack.Screen name="About" component={AboutScreen} />
    </AccountStack.Navigator>
  );
}

// ---- Main bottom tabs ----
export default function MainApp() {
  const { darkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 65,
          position: 'absolute',
          backgroundColor: darkMode ? '#222' : '#fff',
        },
        tabBarActiveTintColor: darkMode ? '#fff' : '#000',
        tabBarInactiveTintColor: darkMode ? '#aaa' : '#666',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="home-outline" size={22} color={color} />,
        }}
      />

      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="grid-outline" size={22} color={color} />,
        }}
      />

      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={styles.cartButton}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Cart</Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="search-outline" size={22} color={color} />,
        }}
      />

      <Tab.Screen
        name="Settings"
        component={AccountNavigator}
        options={{
          tabBarIcon: ({ color }) => <Icon name="settings-outline" size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ---- styles ----
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  cartButton: {
    backgroundColor: 'green',
    borderRadius: 35,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 25,
  },
});
