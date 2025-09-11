const stringSimilarity = require("string-similarity");

/**
 * Normalize Hebrew/English product names:
 * - lowercase
 * - remove extra spaces
 */
function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if two names are "similar enough" to be considered the same product.
 * Uses a mix of exact keyword match and string similarity.
 */
function isSimilarName(nameA, nameB) {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  // quick exact contains
  if (normA === normB) return true;
  if (normB.includes(normA) && normA.length > 2) return true;
  if (normA.includes(normB) && normB.length > 2) return true;

  // string similarity (threshold 0.7 for stricter match)
  const rating = stringSimilarity.compareTwoStrings(normA, normB);
  return rating >= 0.7;
}

/**
 * Try to match recognized products with items in the cart
 */
function matchProductsWithCart(recognized, cartItems) {
  const remaining = [];
  const notFound = [];

  recognized.forEach((rec) => {
    let match = null;

    // 🔹 Match by barcode first
    if (rec.barcode) {
      match = cartItems.find((i) => i.product.barcode === rec.barcode);
    }

    // 🔹 If no barcode match, try name similarity
    if (!match && rec.name) {
      const best = cartItems.find((i) =>
        isSimilarName(rec.name, i.product.name)
      );
      if (best) {
        match = best;
      }
    }

    if (match) {
      // update quantity in cart (remove purchased items)
      const currentQty = match.quantity || 0;
      const newQty = Math.max(0, currentQty - (rec.quantity || 1));
      match.quantity = newQty;

      remaining.push({
        _id: match._id,
        product: match.product,
        quantity: newQty,
      });
    } else {
      notFound.push(rec);
    }
  });

  return { remaining, notFound };
}

module.exports = { matchProductsWithCart };
