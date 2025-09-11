// src/api/products.js
const API_BASE = "http://localhost:3000/api/v1";

/* ---------------- PRODUCTS ---------------- */

// Get products by categoryId (recursive from server)
export async function listProductsByCategory(categoryId, token) {
  const r = await fetch(`${API_BASE}/categories/${categoryId}/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to fetch products");
  return r.json();
}

// Get all products
export async function listAllProducts(token) {
  const r = await fetch(`${API_BASE}/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to fetch products");
  return r.json();
}

// Get a single product by ID
export async function getProduct(productId, token) {
  const r = await fetch(`${API_BASE}/products/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to fetch product");
  return r.json();
}

// Create a new product
export async function createProduct(productData, token) {
  const r = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(productData),
  });
  if (!r.ok) throw new Error("Failed to create product");
  return r.json();
}

// Update a product by ID
export async function updateProduct(productId, productData, token) {
  const r = await fetch(`${API_BASE}/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` },
    body: JSON.stringify(productData),
  });
  if (!r.ok) throw new Error("Failed to update product");
  return r.json();
}

// Delete a product by ID
export async function deleteProduct(productId, token) {
  const r = await fetch(`${API_BASE}/products/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to delete product");
  return r.json();
}
