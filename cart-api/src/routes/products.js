const router = require("express").Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const { body, validationResult } = require("express-validator");

/* ---------- Recursive helper to collect descendant category IDs ---------- */
async function getAllDescendantIds(categoryId) {
  const children = await Category.find({ parent: categoryId }).select("_id");
  if (!children.length) return [categoryId];

  let ids = [categoryId];
  for (const child of children) {
    const subIds = await getAllDescendantIds(child._id);
    ids = ids.concat(subIds);
  }
  return ids;
}

/* ---------- Get products by category (includes all descendants) ---------- */
router.get("/by-category/:categoryId/all", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const allCategoryIds = await getAllDescendantIds(categoryId);

    const products = await Product.find({
      $or: [
        { category: { $in: allCategoryIds } },
        { subCategory: { $in: allCategoryIds } },
        { subSubCategory: { $in: allCategoryIds } },
      ],
    }).populate("category subCategory subSubCategory");

    const count = await Product.countDocuments({
      $or: [
        { category: { $in: allCategoryIds } },
        { subCategory: { $in: allCategoryIds } },
        { subSubCategory: { $in: allCategoryIds } },
      ],
    });

    res.json({ total: count, products });
  } catch (err) {
    console.error("❌ Error fetching products by category + children:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Get all products (supports filters & search) ---------- */
router.get("/", async (req, res) => {
  try {
    const { search, categoryId, category, subCategory, subSubCategory } = req.query;
    const filter = {};

    // Full-text search (min 3 chars)
    if (search && search.length >= 3) {
      filter.$text = { $search: search };
    }

    // Category hierarchy filters
    if (categoryId) {
      const ids = await getAllDescendantIds(categoryId);
      filter.category = { $in: ids };
    }
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (subSubCategory) filter.subSubCategory = subSubCategory;

    const products = await Product.find(filter)
      .populate("category subCategory subSubCategory");

    const count = await Product.countDocuments(filter);

    res.json({ total: count, products });
  } catch (err) {
    console.error("❌ Product fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Search products (regex-based, min 2 chars) ---------- */
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    console.log("🔍 Search query:", q);

    if (!q || q.length < 2) {
      console.log("⚠️ Query too short");
      return res.json([]);
    }

    const regex = new RegExp(q, "i");
    const products = await Product.find({
      $or: [
        { name: regex },
        { brand: regex },
        { description: regex },
        { barcode: regex },
      ],
    })
      .populate("category subCategory subSubCategory", "name")
      .select("_id name images brand category subCategory subSubCategory");

    console.log("✅ Found products:", products.length);
    res.json(products);
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

/* ---------- Get single product by ID ---------- */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category subCategory subSubCategory");
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Create new product ---------- */
router.post(
  "/",
  [
    body("barcode").isString().isLength({ min: 5 }).withMessage("Barcode must be at least 5 characters"),
    body("name").isString().notEmpty().withMessage("Name is required"),
    body("price").isNumeric().withMessage("Price must be a number"),
    body("category").optional().isMongoId(),
    body("subCategory").optional().isMongoId(),
    body("subSubCategory").optional().isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { barcode, name, description, price, brand, images, stock, category, subCategory, subSubCategory } = req.body;

      const product = new Product({
        barcode,
        name,
        description,
        price,
        brand,
        images,
        stock,
        category,
        subCategory,
        subSubCategory,
      });

      await product.save();

      // Link product to subSubCategory if exists
      if (subSubCategory) {
        await Category.findByIdAndUpdate(subSubCategory, {
          $push: { products: product._id },
        });
      }

      res.status(201).json(product);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ---------- Update product by ID ---------- */
router.put(
  "/:id",
  [
    body("barcode").optional().isString().isLength({ min: 5 }),
    body("name").optional().isString().notEmpty(),
    body("price").optional().isNumeric(),
    body("category").optional().isMongoId(),
    body("subCategory").optional().isMongoId(),
    body("subSubCategory").optional().isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .populate("category subCategory subSubCategory");

      if (!updated) return res.status(404).json({ error: "Product not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ---------- Delete product by ID ---------- */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });

    // Remove product reference from subSubCategory if linked
    if (deleted.subSubCategory) {
      await Category.findByIdAndUpdate(deleted.subSubCategory, {
        $pull: { products: deleted._id },
      });
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
