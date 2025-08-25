import axios from 'axios';

// API base URL for local development
const BASE_URL = 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL + '/api/v1' });

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { token, user } or 403 with { verifyRequired: true, email }
}

export async function register(payload) {
  // payload = { email, password, firstName, lastName, birthDate, phone, address }
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

export async function fetchUsers(token, { q }) {
  console.log("📡 fetchUsers called with token:", token); 

  const { data } = await api.get('/users', {
    headers: {
      Authorization: `Bearer ${token}`,   
    },
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



