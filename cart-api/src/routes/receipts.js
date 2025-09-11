const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { parseReceiptAi } = require("../services/receiptParserAi");
const { matchProductsWithCart } = require("../services/productMatcher");
const Cart = require("../models/Cart");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

/* ---------- Cloudinary configuration ---------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cart-app/receipts", // Upload folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"], // Restrict file types
  },
});

const upload = multer({ storage });

/* ---------- POST /scan/:cartId (upload & process receipt) ---------- */
router.post(
  "/scan/:cartId",
  requireAuth,
  upload.single("receipt"), // Expect single image field called "receipt"
  async (req, res) => {
    try {
      const { cartId } = req.params;

      if (!req.file?.path && !req.file?.secure_url) {
        return res.status(400).json({ error: "No receipt image uploaded" });
      }

      const imageUrl = req.file.secure_url || req.file.path;
      console.log("📷 Uploaded receipt:", imageUrl);

      // Extract receipt data using AI service
      const result = await parseReceiptAi(imageUrl);

      // Ensure recognized items is always an array
      const recognizedItems = Array.isArray(result.items) ? result.items : [];

      // Fetch target cart
      const cart = await Cart.findById(cartId).populate(
        "items.product",
        "name barcode"
      );
      if (!cart) return res.status(404).json({ error: "Cart not found" });

      // Match recognized items against cart items
      const { remaining, notFound } = matchProductsWithCart(
        recognizedItems,
        cart.items
      );

      // Update cart quantities or remove items if quantity hits zero
      recognizedItems.forEach((rec) => {
        const idx = cart.items.findIndex(
          (i) =>
            (rec.barcode && i.product.barcode === rec.barcode) ||
            i.product.name.includes(rec.name)
        );

        if (idx !== -1) {
          const item = cart.items[idx];
          const newQty = item.quantity - rec.quantity;

          if (newQty > 0) {
            item.quantity = newQty; // Update quantity
          } else {
            cart.items.splice(idx, 1); // Remove item if qty <= 0
          }
        }
      });

      // Save updated cart
      await cart.save();

      res.json({
        receiptUrl: imageUrl, // Uploaded receipt URL
        recognized: recognizedItems, // Parsed items
        remaining, // Items left in cart
        notFound, // Items not matched
        cart, // Updated cart state
      });
    } catch (err) {
      console.error("❌ Receipt scan error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to process receipt" });
    }
  }
);

module.exports = router;
