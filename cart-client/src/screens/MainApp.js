import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

import SettingsScreen from './setting/SettingsScreen';
import AccountManagerScreen from './setting/AccountManagerScreen';
import NotificationsScreen from './setting/NotificationsScreen';
import HelpScreen from './setting/HelpScreen';
import AboutScreen from './setting/AboutScreen';
import ChangePasswordScreen from './setting/ChangePasswordScreen';
import SelectedItemsScreen from './cart/SelectedItemsScreen';

import FamilyStack from '../navigation/FamilyStack';
import CategoriesStack from '../navigation/CategoriesStack';

import ShoppingCartScreen from './cart/ShoppingCartScreen';
import CreateOrEditCartScreen from './cart/CreateCartScreen';
import CartDetailsScreen from './cart/CartDetailsScreen';
import ProductDetailsScreen from './categories/ProductDetailsScreen';

const Tab = createBottomTabNavigator();
const AccountStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const FamilyNav = createNativeStackNavigator();
const CategoriesNav = createNativeStackNavigator();

function HomeScreen() {
  const { theme } = useTheme();
  return <View style={[styles.screen, theme.container]} />;
}

function AccountNavigator() {
  const { theme, darkMode } = useTheme();

  return (
    <AccountStack.Navigator
      initialRouteName="SettingsHome"
      screenOptions={{
        headerStyle: { backgroundColor: darkMode ? '#111' : '#fff' },
        headerTintColor: theme.text.color,
        contentStyle: theme.container,
        headerBackTitleVisible: false,
      }}
    >
      <AccountStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <AccountStack.Screen
        name="AccountManager"
        component={AccountManagerScreen}
        options={{
          headerLargeTitle: true,
          headerTitle: "",
        }}
      />
      <AccountStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerLargeTitle: true,
          headerTitle: "",
        }}
      />
      <AccountStack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          headerLargeTitle: true,
          headerTitle: "",
        }}
      />
      <AccountStack.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerLargeTitle: true,
          headerTitle: "",
        }}
      />
      <AccountStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          headerLargeTitle: true,
          headerTitle: "",
        }}
      />
    </AccountStack.Navigator>
  );
}

function FamiliesNavigator() {
  const { theme } = useTheme();

  return (
    <FamilyNav.Navigator
      initialRouteName="FamiliesHome"
      screenOptions={{
        headerShown: false,
        contentStyle: theme.container,
      }}
    >
      <FamilyNav.Screen name="FamiliesHome" component={FamilyStack} />
      <FamilyNav.Screen name="FamiliesInner" component={FamilyStack} />
    </FamilyNav.Navigator>
  );
}

function CategoriesNavigator() {
  const { theme } = useTheme();

  return (
    <CategoriesNav.Navigator
      initialRouteName="CategoriesHome"
      screenOptions={{
        headerShown: false,
        contentStyle: theme.container,
      }}
    >
      <CategoriesNav.Screen name="CategoriesHome" component={CategoriesStack} />
      <CategoriesNav.Screen name="CategoriesInner" component={CategoriesStack} />
    </CategoriesNav.Navigator>
  );
}

function CartNavigator() {
  const { theme } = useTheme();

  return (
    <CartStack.Navigator
      initialRouteName="ShoppingCartScreen"
      screenOptions={{
        headerShown: false,
        contentStyle: theme.container,
      }}
    >
      <CartStack.Screen name="SelectedItems" component={SelectedItemsScreen} />
      <CartStack.Screen name="ShoppingCartScreen" component={ShoppingCartScreen} />
      <CartStack.Screen name="CreateCart" component={CreateOrEditCartScreen} />
      <CartStack.Screen name="CartDetails" component={CartDetailsScreen} />
      <CartStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    </CartStack.Navigator>
  );
}

function CartButton({ children, onPress }) {
  return (
    <TouchableOpacity
      style={{
        top: -15,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: 'green',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
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

export default function MainApp() {
  const { darkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 65,
          position: 'absolute',
          backgroundColor: darkMode ? '#111' : '#fff',
          borderTopColor: darkMode ? '#333' : '#ddd',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: darkMode ? '#fff' : '#000',
        tabBarInactiveTintColor: darkMode ? '#888' : '#666',
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
        component={CategoriesNavigator}
        options={{
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="grid-outline" size={size} color={color} />
          ),
          title: "",
        }}
      />

      <Tab.Screen
        name="ShoppingCart"
        component={CartNavigator}
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
        component={FamiliesNavigator}
        options={{
          tabBarIcon: ({ color, size = 22 }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
          title: "",
        }}
      />

      <Tab.Screen
        name="Settings"
        component={AccountNavigator}
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
