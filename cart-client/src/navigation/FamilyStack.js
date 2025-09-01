import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext'; // 👈 למשוך את ה-theme
import FamiliesHomeScreen from '../screens/familyScreens/FamiliesHomeScreen';
import FamilyDetailsScreen from '../screens/familyScreens/FamilyDetailsScreen';
import CreateFamilyScreen from '../screens/familyScreens/CreateFamilyScreen';
import JoinFamilyScreen from '../screens/familyScreens/JoinFamilyScreen';

const Stack = createNativeStackNavigator();

export default function FamilyStack() {
  const { theme } = useTheme(); // 👈 קח את הצבעים מה־ThemeContext

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.container.backgroundColor, // 👈 רקע מותאם
        },
        headerTintColor: theme.text.color, // 👈 צבע טקסט וחץ אחורה
        headerTitleStyle: {
          color: theme.text.color, // 👈 כותרת מותאמת
        },
      }}
    >
      <Stack.Screen 
        name="FamiliesHome" 
        component={FamiliesHomeScreen} 
        options={{ title: 'Families' }} 
      />
      <Stack.Screen 
        name="CreateFamily" 
        component={CreateFamilyScreen} 
        options={{ title: 'Create family' }} 
      />
      <Stack.Screen 
        name="JoinFamily" 
        component={JoinFamilyScreen} 
        options={{ title: 'Join family' }} 
      />
      <Stack.Screen 
        name="FamilyDetails" 
        component={FamilyDetailsScreen} 
        options={{ title: 'Family details' }} 
      />
    </Stack.Navigator>
  );
}
