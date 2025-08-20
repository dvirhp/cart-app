const router = require('express').Router();
const User = require('../models/User');

// GET /api/v1/users?q=&page=&limit= — returns paginated list of users
router.get('/', async (req, res) => {
  const { q = '', page = 1, limit = 20 } = req.query;

  // Build search filter by email/displayName if a query was provided
  const filter = q
    ? {
        $or: [
          { email: { $regex: q, $options: 'i' } },           // Case-insensitive search on email
          { displayName: { $regex: q, $options: 'i' } }      // Case-insensitive search on display name
        ]
      }
    : {};

  const pg = Math.max(1, Number(page));                     // Ensure page >= 1
  const lm = Math.min(100, Math.max(1, Number(limit)));      // Limit between 1 and 100

  // Fetch users and total count in parallel
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lm).limit(lm),
    User.countDocuments(filter)
  ]);

  // Return paginated response
  res.json({ data: items.map((u) => u.toJSON()), total, page: pg, pages: Math.ceil(total / lm) });
});

module.exports = router;
