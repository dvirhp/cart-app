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
  const { data } = await api.post('/auth/change-password', payload, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return data; // Expected: { success: true }
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
