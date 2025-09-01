import React, { createContext, useContext, useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [ready, setReady] = useState(false);

  // ---------------- LOAD PREFERENCE ON APP START ----------------
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('darkMode');
      if (saved === 'true') setDarkMode(true);
      setReady(true);
    })();
  }, []);

  // ---------------- TOGGLE DARK MODE ----------------
  // Switch between light/dark mode and persist in storage
  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    await AsyncStorage.setItem('darkMode', newMode ? 'true' : 'false');
  };

  // ---------------- THEMES ----------------
  const lightTheme = {
    container: { backgroundColor: '#fff' },
    text: { color: '#000' },
  };

  const darkTheme = {
    container: { backgroundColor: '#121212' },
    text: { color: '#fff' },
  };

  const theme = darkMode ? darkTheme : lightTheme;

  if (!ready) return null; // Wait until preference is loaded from storage

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, theme }}>
      {/* Global wrapper that applies the background color */}
      <View style={[{ flex: 1 }, theme.container]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
