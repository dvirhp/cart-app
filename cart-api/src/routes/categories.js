const router = require('express').Router();
const Category = require('../models/Category');
const Product = require('../models/Product');

/* ---------- GET all top-level categories with nested children ---------- */
router.get('/', async (req, res) => {
  try {
    // Fetch only root categories (parent = null)
    const categories = await Category.find({ parent: null })
      .populate({
        path: 'children',
        populate: { path: 'children' } // Populate nested children
      });

    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- GET single category (with children & products) ---------- */
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('children')
      .populate('products');
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- CREATE category ---------- */
router.post('/', async (req, res) => {
  try {
    const { name, description, icon, parent } = req.body;

    const category = new Category({ name, description, icon, parent });
    await category.save();

    // If category has a parent, push this ID into parent's children
    if (parent) {
      await Category.findByIdAndUpdate(parent, { $push: { children: category._id } });
    }

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- UPDATE category ---------- */
router.put('/:id', async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('children')
      .populate('products');
    if (!updated) return res.status(404).json({ error: 'Category not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- DELETE category ---------- */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Category not found' });

    // If deleted category has a parent, remove it from parent's children
    if (deleted.parent) {
      await Category.findByIdAndUpdate(deleted.parent, {
        $pull: { children: deleted._id }
      });
    }

    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Helper: recursively collect all descendant category IDs ---------- */
async function getAllDescendants(categoryId) {
  const category = await Category.findById(categoryId).populate('children');
  if (!category) return [];
  let ids = [category._id];
  for (const child of category.children) {
    const childIds = await getAllDescendants(child._id);
    ids = ids.concat(childIds);
  }
  return ids;
}

/* ---------- GET products by category (recursive) ---------- */
router.get('/:id/products', async (req, res) => {
  try {
    // 1. Collect all related category IDs (including descendants)
    const allCategoryIds = await getAllDescendants(req.params.id);

    // 2. Fetch products linked to any of these categories
    const products = await Product.find({
      $or: [
        { category: { $in: allCategoryIds } },
        { subCategory: { $in: allCategoryIds } },
        { subSubCategory: { $in: allCategoryIds } }
      ]
    }).populate('category subCategory subSubCategory');

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
