// routes/prices.js
const router = require("express").Router();
const Price = require("../models/Price");
const Product = require("../models/Product");

/* ---------- Get all prices ---------- */
router.get("/", async (req, res) => {
  try {
    const prices = await Price.find().populate("product", "name brand barcode");
    res.json({
      total: prices.length, // Total count
      prices,
    });
  } catch (err) {
    console.error("❌ Error fetching all prices:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Get prices by productId ---------- */
router.get("/by-product/:id", async (req, res) => {
  try {
    const prices = await Price.find({ product: req.params.id }).populate(
      "product",
      "name brand barcode"
    );

    if (!prices.length) {
      return res.json({ prices: [] }); // Return empty array instead of 404
    }

    res.json({ prices });
  } catch (err) {
    console.error("❌ Error fetching prices by product:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Get prices by barcode ---------- */
router.get("/by-barcode/:barcode", async (req, res) => {
  try {
    const prices = await Price.find({ barcode: req.params.barcode })
      .populate("product", "name brand barcode")
      .sort({ price: 1 }); // Sorted ascending by price

    res.json({ prices });
  } catch (err) {
    console.error("❌ Error fetching prices by barcode:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Get prices by product name ---------- */
router.get("/by-name/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const prices = await Price.find().populate({
      path: "product",
      match: { name: new RegExp("^" + name + "$", "i") }, // Case-insensitive exact match
      select: "name brand barcode",
    });

    const filtered = prices.filter((p) => p.product); // Keep only matched products

    if (!filtered.length) {
      return res.json({ prices: [] }); // Return empty array instead of 404
    }

    res.json({ prices: filtered });
  } catch (err) {
    console.error("❌ Error fetching prices by name:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Get single price by ID ---------- */
router.get("/:id", async (req, res) => {
  try {
    const price = await Price.findById(req.params.id).populate(
      "product",
      "name brand barcode"
    );
    if (!price) return res.status(404).json({ error: "Price not found" });

    res.json(price);
  } catch (err) {
    console.error("❌ Error fetching price by id:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
