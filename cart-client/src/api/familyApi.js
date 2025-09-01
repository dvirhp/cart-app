const API_BASE = "http://localhost:3000/api/v1";

// ---------------- FAMILY OPERATIONS ----------------
export async function listFamilies(token) {
  const r = await fetch(`${API_BASE}/families`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

export async function createFamily(name, token) {
  const r = await fetch(`${API_BASE}/families`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });
  return r.json();
}

export async function getFamily(familyId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

export async function joinByCode(code, token) {
  const r = await fetch(`${API_BASE}/families/join-by-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ code })
  });
  return r.json();
}

export async function leaveFamily(familyId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

export async function deleteFamily(familyId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

// ---------------- FAMILY UPDATES ----------------
export async function updateFamilyDescription(familyId, description, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}/description`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ description })
  });
  return r.json();
}

export async function updateFamilyAvatar(familyId, file, token) {
  const formData = new FormData();
  formData.append('avatar', file);

  const r = await fetch(`${API_BASE}/families/${familyId}/avatar`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  return r.json();
}

// ---------------- CART & MEMBERS ----------------
export async function getFamilyCart(familyId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}/cart`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

export async function removeMember(familyId, userId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}
