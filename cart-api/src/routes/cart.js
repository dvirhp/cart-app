const router = require('express').Router();
const Cart = require('../models/Cart');
const requireAuth = require('../middleware/requireAuth');
const { requireFamilyRole } = require('../middleware/requireFamilyRole');

/* --- Get family cart --- */
router.get('/:familyId', requireAuth, requireFamilyRole('member'), async (req, res) => {
  try {
    const cart = await Cart.findOne({ family: req.params.familyId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --- Add item --- */
router.post('/:familyId/items', requireAuth, requireFamilyRole('member'), async (req, res) => {
  try {
    const { name, qty, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Item name is required' });

    const cart = await Cart.findOne({ family: req.params.familyId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items.push({ name, qty, notes });
    await cart.save();

    res.status(201).json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --- Update item --- */
router.put('/:familyId/items/:index', requireAuth, requireFamilyRole('member'), async (req, res) => {
  try {
    const { name, qty, notes } = req.body;
    const cart = await Cart.findOne({ family: req.params.familyId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    if (!cart.items[req.params.index]) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (name !== undefined) cart.items[req.params.index].name = name;
    if (qty !== undefined) cart.items[req.params.index].qty = qty;
    if (notes !== undefined) cart.items[req.params.index].notes = notes;

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --- Delete item --- */
router.delete('/:familyId/items/:index', requireAuth, requireFamilyRole('member'), async (req, res) => {
  try {
    const cart = await Cart.findOne({ family: req.params.familyId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    if (!cart.items[req.params.index]) {
      return res.status(404).json({ error: 'Item not found' });
    }

    cart.items.splice(req.params.index, 1);
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --- Clear cart --- */
router.delete('/:familyId', requireAuth, requireFamilyRole('member'), async (req, res) => {
  try {
    const cart = await Cart.findOne({ family: req.params.familyId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = [];
    await cart.save();

    res.json({ message: 'Cart cleared', cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
