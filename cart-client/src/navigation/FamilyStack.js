import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import FamiliesHomeScreen from '../screens/familyScreens/FamiliesHomeScreen';
import FamilyDetailsScreen from '../screens/familyScreens/FamilyDetailsScreen';
import CreateFamilyScreen from '../screens/familyScreens/CreateFamilyScreen';
import JoinFamilyScreen from '../screens/familyScreens/JoinFamilyScreen';

const Stack = createNativeStackNavigator();

export default function FamilyStack() {
  const { theme } = useTheme(); // Use colors from ThemeContext

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.container.backgroundColor, // Themed header background
        },
        headerTintColor: theme.text.color, // Themed back arrow and text color
        headerTitleStyle: {
          color: theme.text.color, // Themed header title
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
