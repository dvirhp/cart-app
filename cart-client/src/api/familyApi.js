const API_BASE = "http://localhost:3000/api/v1";

// ---------------- FAMILY OPERATIONS ----------------

// Fetch all families for the authenticated user
export async function listFamilies(token) {
  const r = await fetch(`${API_BASE}/families`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

// Create a new family with a given name
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

// Fetch a single family by its ID
export async function getFamily(familyId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

// Join a family using an invite code
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

// Leave a specific family
export async function leaveFamily(familyId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

// Permanently delete a family
export async function deleteFamily(familyId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

// ---------------- FAMILY UPDATES ----------------

// Update the description text of a family
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

// Update the avatar image of a family (multipart form-data upload)
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

// ---------------- FAMILY CART ----------------

// Fetch all carts associated with a specific family
export async function getFamilyCart(familyId, token) {
  const r = await fetch(`${API_BASE}/carts/family/${familyId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

// Remove a specific member from a family
export async function removeMember(familyId, userId, token) {
  const r = await fetch(`${API_BASE}/families/${familyId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}
