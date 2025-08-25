import React, { createContext, useContext, useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [ready, setReady] = useState(false);

  // Load preference once when app starts
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('darkMode');
      if (saved === 'true') setDarkMode(true);
      setReady(true);
    })();
  }, []);

  // Toggle + save to storage
  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    await AsyncStorage.setItem('darkMode', newMode ? 'true' : 'false');
  };

  // Themes
  const lightTheme = {
    container: { backgroundColor: '#fff' },
    text: { color: '#000' },
  };
  const darkTheme = {
    container: { backgroundColor: '#121212' },
    text: { color: '#fff' },
  };

  const theme = darkMode ? darkTheme : lightTheme;

  if (!ready) return null; // wait until we load from storage

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, theme }}>
      {/* Global wrapper with background color */}
      <View style={[{ flex: 1 }, theme.container]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
