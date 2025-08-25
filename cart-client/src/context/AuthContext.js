import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load auth state from storage on app start
  useEffect(() => {
    (async () => {
      try {
        const savedRemember = await AsyncStorage.getItem('rememberMe');
        if (savedRemember === 'true') {
          const t = await AsyncStorage.getItem('token');
          const u = await AsyncStorage.getItem('user');
          if (t) setToken(t);
          if (u) setUser(JSON.parse(u));
          setRememberMe(true);
        }
      } catch (err) {
        console.error("❌ Failed to load auth state:", err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Save token and user to state + storage
  const signIn = async ({ token, user }, remember) => {
    console.log("✅ signIn called with token:", token);
    setToken(token);
    setUser(user);
    setRememberMe(remember);

    if (remember) {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('rememberMe', 'true');
    } else {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.setItem('rememberMe', 'false');
    }
  };

  // Update user profile in state + storage
  const updateUser = async (newUser) => {
    setUser(newUser);
    if (rememberMe) {
      try {
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
      } catch (err) {
        console.error("❌ Failed to persist updated user:", err);
      }
    }
  };

  // Clear token and user from state + storage
  const signOut = async () => {
    setToken(null);
    setUser(null);
    setRememberMe(false);
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.setItem('rememberMe', 'false');
    } catch (err) {
      console.error("❌ Failed to clear auth state:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        ready,
        signIn,
        signOut,
        rememberMe,
        updateUser, // 👈 עדכון פרופיל גם ב-context וגם ב-storage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
