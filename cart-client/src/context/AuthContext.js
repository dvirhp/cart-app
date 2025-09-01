import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode'; // npm i jwt-decode

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // { id, email, role, avatar? }
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
        console.error('❌ Failed to load auth state:', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Normalize user object (ensure id/email/role exist)
  function normalizeUser(u, t) {
    if (u?.id && u?.email) return u;
    if (!t) return u;
    try {
      const payload = jwtDecode(t);
      return {
        id: payload.sub || payload.id || u?.id || null,
        email: payload.email || u?.email || null,
        role: payload.role || u?.role || null,
        avatar: u?.avatar ?? null,
      };
    } catch {
      return u;
    }
  }

  // Save token and user to state + storage
  const signIn = async ({ token: newToken, user: newUser }, remember) => {
    const safeUser = normalizeUser(newUser, newToken);

    setToken(newToken);
    setUser(safeUser);
    setRememberMe(remember);

    try {
      if (remember) {
        await AsyncStorage.setItem('token', newToken);
        await AsyncStorage.setItem('user', JSON.stringify(safeUser));
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.setItem('rememberMe', 'false');
      }
    } catch (err) {
      console.error('❌ Failed to persist auth state:', err);
    }
  };

  // Update user profile in state + storage
  const updateUser = async (newUser) => {
    const merged = { ...(user || {}), ...(newUser || {}) };
    const safeUser = normalizeUser(merged, token);
    setUser(safeUser);
    if (rememberMe) {
      try {
        await AsyncStorage.setItem('user', JSON.stringify(safeUser));
      } catch (err) {
        console.error('❌ Failed to persist updated user:', err);
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
      console.error('❌ Failed to clear auth state:', err);
    }
  };

  const value = useMemo(
    () => ({ token, user, ready, signIn, signOut, rememberMe, updateUser }),
    [token, user, ready, rememberMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
