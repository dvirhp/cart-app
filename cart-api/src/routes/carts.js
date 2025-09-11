const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v2: cloudinary } = require("cloudinary");

const Cart = require("../models/Cart");
const Membership = require("../models/Membership");
const User = require("../models/User");
const Family = require("../models/Family");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

/* ---------------- CLOUDINARY CONFIGURATION ---------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ---------------- MULTER STORAGE (Cloudinary) ---------------- */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cart-app/carts",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 300, height: 300, crop: "fill" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/image\/(jpe?g|png)/.test(file.mimetype)) {
      console.log("❌ Rejecting file, invalid type:", file.mimetype);
      return cb(new Error("Only JPG/PNG images allowed"), false);
    }
    console.log("✅ Accepting file:", file.originalname, file.mimetype);
    cb(null, true);
  },
});

/* ---------------- Helper: check if user can access a cart ---------------- */
async function canAccessCart(userId, cart) {
  if (cart.owner && String(cart.owner) === String(userId)) {
    return true;
  }
  if (cart.family) {
    const membership = await Membership.findOne({
      user: userId,
      family: cart.family,
      status: "active",
    });
    if (membership) return true;
  }
  return false;
}

/* ---------------- GET ALL CARTS FOR USER ---------------- */
router.get("/", requireAuth, async (req, res) => {
  try {
    console.log("📥 GET /carts for user:", req.user.id);

    const personalCarts = await Cart.find({
      owner: req.user.id,
      archived: false,
    }).lean();
    console.log("📦 Personal carts from DB:", personalCarts);

    const memberships = await Membership.find({
      user: req.user.id,
      status: "active",
    }).select("family");
    const familyIds = memberships.map((m) => m.family);

    const familyCarts = await Cart.find({
      family: { $in: familyIds },
      archived: false,
    })
      .populate("family", "name avatar")
      .lean();
    console.log("📦 Family carts from DB:", familyCarts);

    const formattedPersonal = personalCarts.map((c) => ({
      ...c,
      avatar: c.avatar || null,
      isFamily: false,
    }));

    const formattedFamily = familyCarts.map((c) => ({
      ...c,
      avatar: c.family?.avatar || null,
      isFamily: true,
    }));

    const result = { personal: formattedPersonal, family: formattedFamily };
    console.log("✅ Returning carts:", result);

    res.json(result);
  } catch (err) {
    console.error("❌ Error in GET /carts:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- GET CARTS FOR SPECIFIC FAMILY ---------------- */
router.get("/family/:familyId", requireAuth, async (req, res) => {
  try {
    const { familyId } = req.params;
    console.log("📥 GET /carts/family:", familyId);

    const carts = await Cart.find({ family: familyId, archived: false })
      .populate("family", "name avatar")
      .populate("items.product", "name brand images price")
      .lean();
    console.log("📦 Family carts for familyId", familyId, ":", carts);

    const formatted = carts.map((c) => ({
      ...c,
      avatar: c.family?.avatar || null,
      isFamily: true,
    }));

    res.json({ carts: formatted });
  } catch (err) {
    console.error("❌ Error in GET /carts/family:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- GET SINGLE CART ---------------- */
router.get("/:cartId", requireAuth, async (req, res) => {
  try {
    const { cartId } = req.params;
    console.log("📥 GET /carts/:cartId =", cartId);

    const cart = await Cart.findById(cartId)
      .populate("family", "name avatar")
      .populate("items.product", "name brand images price")
      .lean();
    console.log("📦 Found single cart:", cart);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!(await canAccessCart(req.user.id, cart))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const avatar = cart.family ? cart.family?.avatar : cart.avatar;
    res.json({ cart: { ...cart, avatar } });
  } catch (err) {
    console.error("❌ Error in GET /carts/:cartId:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- CREATE CART ---------------- */
router.post("/", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    console.log("📥 CREATE /carts body:", req.body);
    console.log("📷 CREATE /carts file:", req.file);

    const { name, familyId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Cart name is required" });
    }

    let avatarUrl = null;
    if (req.file) {
      avatarUrl = req.file.secure_url || req.file.path || null;
      console.log("✅ Uploaded to Cloudinary:", avatarUrl);
    }

    const cart = await Cart.create({
      name: name.trim(),
      family: familyId || null,
      owner: familyId ? null : req.user.id,
      items: [],
      avatar: avatarUrl,
      archived: false,
    });

    console.log("✅ Cart created:", cart);
    res.status(201).json({ cart });
  } catch (err) {
    console.error("❌ Create cart error:", err);
    res.status(500).json({ error: err.message || "Failed to create cart" });
  }
});

/* ---------------- UPDATE CART AVATAR ---------------- */
router.put("/:id/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    console.log("📥 UPDATE CART AVATAR for id:", req.params.id);
    console.log("📷 File received:", req.file);

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const cart = await Cart.findById(req.params.id);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!(await canAccessCart(req.user.id, cart))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    cart.avatar = req.file.secure_url || req.file.path || null;
    await cart.save();

    console.log("✅ Cart avatar updated:", cart);
    res.json({ message: "Cart avatar updated", cart });
  } catch (err) {
    console.error("❌ Update cart avatar error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- ARCHIVE CART ---------------- */
router.patch("/:cartId/archive", requireAuth, async (req, res) => {
  try {
    const { cartId } = req.params;
    console.log("📥 ARCHIVE /carts/:cartId =", cartId);

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!(await canAccessCart(req.user.id, cart))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    cart.archived = true;
    await cart.save();

    console.log("✅ Cart archived:", cart);
    res.json({ message: "Cart archived", cart });
  } catch (err) {
    console.error("❌ Archive cart error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- DELETE ENTIRE CART ---------------- */
router.delete("/:cartId", requireAuth, async (req, res) => {
  try {
    const { cartId } = req.params;
    console.log("📥 DELETE /carts/:cartId =", cartId);

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!(await canAccessCart(req.user.id, cart))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Cart.findByIdAndDelete(cartId);

    console.log("✅ Cart deleted:", cartId);
    res.json({ message: "Cart deleted successfully" });
  } catch (err) {
    console.error("❌ Delete cart error:", err);
    res.status(500).json({ error: err.message || "Failed to delete cart" });
  }
});

/* ---------------- UPDATE CART (name + avatar) ---------------- */
router.put("/:id", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    console.log("📥 UPDATE /carts/:id =", id, "body:", req.body);
    console.log("📷 File received:", req.file);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Cart name is required" });
    }

    const cart = await Cart.findById(id);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!(await canAccessCart(req.user.id, cart))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    cart.name = name.trim();
    if (req.file) {
      cart.avatar = req.file.secure_url || req.file.path || null;
      console.log("✅ Updated avatar:", cart.avatar);
    }

    await cart.save();

    console.log("✅ Cart updated:", cart);
    res.json({ message: "Cart updated successfully", cart });
  } catch (err) {
    console.error("❌ Update cart error:", err);
    res.status(500).json({ error: err.message || "Failed to update cart" });
  }
});

/* ---------------- ADD ITEM TO CART ---------------- */
router.post("/:cartId/items", requireAuth, async (req, res) => {
  try {
    const { cartId } = req.params;
    const { productId, quantity } = req.body;

    if (!productId) return res.status(400).json({ error: "Product ID is required" });
    if (!quantity || quantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    if (!(await canAccessCart(req.user.id, cart))) return res.status(403).json({ error: "Not authorized" });

    const existingItem = cart.items.find(i => String(i.product) === String(productId));
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate("items.product", "name brand images price");

    res.json({ message: "Item added to cart", cart });
  } catch (err) {
    console.error("❌ Add item error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- UPDATE ITEM IN CART ---------------- */
router.put("/:cartId/items/:itemId", requireAuth, async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!(await canAccessCart(req.user.id, cart))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const item = cart.items.find(i => String(i._id) === String(itemId));
    if (!item) return res.status(404).json({ error: "Item not found in cart" });

    item.quantity = quantity;

    cart.markModified("items"); // 👈 מוודא שהשינוי יישמר ב־DB
    await cart.save();
    await cart.populate("items.product", "name brand images price");

    console.log("✅ Item updated in cart:", item);
    res.json({ message: "Item updated", cart });
  } catch (err) {
    console.error("❌ Update item error:", err);
    res.status(500).json({ error: err.message || "Failed to update item" });
  }
});


/* ---------------- DELETE ITEM FROM CART ---------------- */
router.delete("/:cartId/items/:itemId", requireAuth, async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    console.log("📥 DELETE item from cart:", cartId, itemId);

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    if (!(await canAccessCart(req.user.id, cart)))
      return res.status(403).json({ error: "Not authorized" });

    // 🔑 פתרון במקום item.remove()
    cart.items = cart.items.filter(i => String(i._id) !== String(itemId));
    await cart.save();
    await cart.populate("items.product", "name brand images price");

    console.log("✅ Item deleted from cart:", itemId);
    res.json({ message: "Item deleted from cart", cart });
  } catch (err) {
    console.error("❌ Delete item error:", err);
    res.status(500).json({ error: err.message || "Failed to delete item" });
  }
});


module.exports = router;
