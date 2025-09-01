import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'; // Import forgot password screen
import { useAuth } from '../context/AuthContext';

import MainApp from '../screens/MainApp';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, ready } = useAuth();
  if (!ready) return null; // Wait until auth state is loaded

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> 
            {/* Forgot password screen */}
          </>
        ) : (
          <>
            <Stack.Screen name="MainApp" component={MainApp} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
