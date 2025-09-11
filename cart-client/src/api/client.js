import axios from 'axios';
import { Platform } from 'react-native';

// ---------------- BASE CONFIG ----------------
// API base URL (adjust for development/production as needed)
export const BASE_URL = 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL + '/api/v1' });

// ---------------- AUTH ----------------
export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { token, user } or 403 with { verifyRequired: true, email }
}

export async function register(payload) {
  // payload example: { email, password, firstName, lastName, birthDate, phone, address }
  const { data } = await api.post('/auth/register', payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  return data; // { verifyRequired: true, email }
}

export async function verifyEmail(email, code) {
  const { data } = await api.post('/auth/verify', { email, code });
  return data; // { token, user }
}

export async function resendCode(email) {
  const { data } = await api.post('/auth/resend', { email });
  return data; // { ok: true }
}

// ---------------- USERS ----------------
export async function fetchUsers(token, { q }) {
  console.log("📡 fetchUsers called with token:", token); 

  const { data } = await api.get('/users', {
    headers: { Authorization: `Bearer ${token}` },
    params: { q }, // query string (?q=)
  });

  return data;
}

export async function updateProfile(token, payload) {
  const { data } = await api.put('/auth/me/update', payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return data;
}

export async function changePassword(token, payload) {
  try {
    const { data } = await api.post('/auth/change-password', payload, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return data; // { success: true }
  } catch (err) {
    if (err.response?.data) {
      return err.response.data;
    }
    return { error: 'שגיאת שרת' };
  }
}


// ---------------- AVATAR ----------------
export async function uploadAvatar(token, uri) {
  const formData = new FormData();
  formData.append('avatar', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri, // iOS path fix
    name: 'avatar.jpg',
    type: 'image/jpeg',
  });

  const { data } = await api.post('/auth/upload-avatar', formData, {
    headers: {
      Authorization: `Bearer ${token}`, // Do not manually set Content-Type
    },
  });

  return data; // { message, user }
}

// ---------------- PASSWORD RECOVERY ----------------
export async function forgotPassword(email) {
  try {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  } catch (err) {
    console.error('❌ forgotPassword error:', err.response?.data || err.message);
    throw err.response?.data || { error: 'Server error' };
  }
}

export async function resetPassword(email, code, newPassword) {
  try {
    const { data } = await api.post('/auth/reset-password', { email, code, newPassword });
    return data;
  } catch (err) {
    console.error('❌ resetPassword error:', err.response?.data || err.message);
    throw err.response?.data || { error: 'Server error' };
  }
}

// ---------------- ACCOUNT ----------------
export async function deleteAccount(token) {
  try {
    const { data } = await api.delete('/auth/delete-account', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (err) {
    console.error('❌ deleteAccount error:', err.response?.data || err.message);
    throw err.response?.data || { error: 'Server error' };
  }
}



// ---------------- PRICES ----------------

// 🟢 Get prices by barcode (מחירים לפי ברקוד)
export async function fetchPricesByBarcode(barcode) {
  try {
      console.log("📞 fetchPricesByBarcode called with:", barcode);

    const url = `${API_BASE_URL}/prices/${barcode}`;
    console.log("🌍 Fetching prices from:", url);

    const res = await fetch(url);
    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("📦 Data received:", data);

    return data;
  } catch (err) {
    console.error("❌ fetchPricesByBarcode failed:", err.message);
    throw err;
  }
}


// 🟢 Get prices by productId (מחירים לפי מזהה מוצר ב־Mongo)
export async function fetchPricesByProductId(productId) {
  const { data } = await api.get(`/prices/by-product/${productId}`);
  return data; // array of Price docs
}

// 🟢 Get all prices (זהירות – יכול להיות כבד)
export async function fetchAllPrices() {
  const { data } = await api.get(`/prices`);
  return data; // array of all prices
}

// 🟢 Get prices by product name
export async function fetchPricesByName(name) {
  try {
    console.log("🔍 fetchPricesByName called with:", name);

    const { data } = await api.get(`/price/by-name/${encodeURIComponent(name)}`);
    console.log("📦 fetchPricesByName data:", data);

    return data.prices || [];
  } catch (err) {
    console.error("❌ fetchPricesByName error:", err.response?.data || err.message);
    throw err.response?.data || { error: "Server error" };
  }
}

