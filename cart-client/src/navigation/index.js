import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import UsersScreen from '../screens/UsersScreen';
import FamilyPage from '../screens/familyScreens/FamilyPage';
import JoinFamilyPage from '../screens/familyScreens/JoinFamilyPage';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, ready } = useAuth();
  if (!ready) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Public routes */}
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Verify Email' }} />
          </>
        ) : (
          <>
            {/* Private routes */}
            <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Users' }} />
            <Stack.Screen name="Family">
              {props => <FamilyPage {...props} familyId="FAMILY_ID_FROM_DB" token={token} />}
            </Stack.Screen>
            <Stack.Screen name="JoinFamily">
              {props => <JoinFamilyPage {...props} token={token} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
