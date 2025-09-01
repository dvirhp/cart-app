const Membership = require('../models/Membership');

function requireFamilyRole(requiredRole /* 'owner' | 'member' */) {
  return async (req, res, next) => {
    try {
      const familyId = req.params.familyId || req.params.id;
      const membership = await Membership.findOne({
        user: req.user.id,
        family: familyId,
        status: 'active'
      });

      if (!membership) return res.status(403).json({ error: 'Not a member of this family' });
      if (requiredRole === 'owner' && membership.role !== 'owner') {
        return res.status(403).json({ error: 'Owner role required' });
      }

      req.membership = membership;
      next();
    } catch (e) { next(e); }
  };
}

module.exports = { requireFamilyRole };
