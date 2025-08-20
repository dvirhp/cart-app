const API_BASE = "http://localhost:3000/api/v1"; // Update if server runs elsewhere

// Send invite to join a family
export async function sendInvite(familyId, email, token) {
  const res = await fetch(`${API_BASE}/families/${familyId}/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ email })
  });
  return res.json();
}

// Join a family using an invite code
export async function joinFamily(code, token) {
  const res = await fetch(`${API_BASE}/families/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ code })
  });
  return res.json();
}

// Get family details
export async function getFamily(familyId, token) {
  const res = await fetch(`${API_BASE}/families/${familyId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return res.json();
}
