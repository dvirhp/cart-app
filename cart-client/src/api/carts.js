import { api } from "./client";

// Utility: builds the authorization header if a token is provided
function getAuthHeader(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ---------------- CARTS API ----------------

// Fetch all carts belonging to the authenticated user
export async function listCarts(token) {
  const { data } = await api.get("/carts", { headers: getAuthHeader(token) });
  console.log("📥 listCarts response:", data);
  return data; // Expected shape: { personal, family }
}

// Fetch carts for a specific family
export async function listFamilyCarts(familyId, token) {
  const { data } = await api.get(`/carts/family/${familyId}`, { headers: getAuthHeader(token) });
  console.log("📥 listFamilyCarts response:", data);
  return data; // Expected shape: { carts: [...] }
}

// Fetch a single cart by its ID
export async function getCart(cartId, token) {
  const { data } = await api.get(`/carts/${cartId}`, { headers: getAuthHeader(token) });
  console.log("📥 getCart response:", data);
  return data.cart;
}

// Create a new cart (supports both JSON and multipart form-data)
export async function createCart(payload, token, isForm = false) {
  const headers = getAuthHeader(token);
  if (!isForm) headers["Content-Type"] = "application/json";
  const { data } = await api.post("/carts", payload, { headers });
  console.log("📥 createCart response:", data);
  return data.cart;
}

// Set a given cart as the active one
export async function setActiveCart(cartId, token) {
  const { data } = await api.patch(`/carts/active/${cartId}`, {}, { headers: getAuthHeader(token) });
  console.log("📥 setActiveCart response:", data);
  return data;
}

// Fetch all archived carts
export async function listArchivedCarts(token) {
  const { data } = await api.get("/carts/archived/list", { headers: getAuthHeader(token) });
  console.log("📥 listArchivedCarts response:", data);
  return data;
}

// Add an item to the currently active cart
export async function addItemToActiveCart(payload, token) {
  const { data } = await api.post("/carts/active/items", payload, { headers: getAuthHeader(token) });
  console.log("📥 addItemToActiveCart response:", data);
  return data.cart; // The server responds with the full cart object
}

// Remove all items from a cart
export async function clearCart(cartId, token) {
  const { data } = await api.delete(`/carts/${cartId}`, { headers: getAuthHeader(token) });
  console.log("📥 clearCart response:", data);
  return data;
}

// Update cart metadata (name, avatar, etc.)
export async function updateCart(cartId, payload, token, isForm = false) {
  const headers = getAuthHeader(token);
  if (!isForm) headers["Content-Type"] = "application/json";
  const { data } = await api.put(`/carts/${cartId}`, payload, { headers });
  console.log("📥 updateCart response:", data);
  return data.cart;
}

// Permanently delete a cart
export async function deleteCart(cartId, token) {
  const { data } = await api.delete(`/carts/${cartId}`, { headers: getAuthHeader(token) });
  console.log("📥 deleteCart response:", data);
  return data;
}

// ---------------- CART ITEMS API ----------------

// Add a product to a specific cart
export async function addItemToCart(cartId, productId, quantity, token) {
  const { data } = await api.post(
    `/carts/${cartId}/items`,
    { productId, quantity },
    { headers: getAuthHeader(token) }
  );
  console.log("📥 addItemToCart response:", data);
  return data.cart;
}

// Update the quantity of a specific product inside a cart
export async function updateCartItem(cartId, itemId, quantity, token) {
  const { data } = await api.put(
    `/carts/${cartId}/items/${itemId}`,
    { quantity },
    { headers: getAuthHeader(token) }
  );
  console.log("📥 updateCartItem response:", data);
  return data.cart; // Always return a fresh cart object
}

// Remove a product from a cart
export async function deleteCartItem(cartId, itemId, token) {
  const { data } = await api.delete(`/carts/${cartId}/items/${itemId}`, {
    headers: getAuthHeader(token),
  });
  console.log("📥 deleteCartItem response:", data);
  return data.cart;
}
