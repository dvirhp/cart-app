const express = require('express');
const { nanoid } = require('nanoid');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { v2: cloudinary } = require('cloudinary');

const Family = require('../models/Family');
const Membership = require('../models/Membership');
const Cart = require('../models/Cart');
const requireAuth = require('../middleware/requireAuth');
const { requireFamilyRole } = require('../middleware/requireFamilyRole');

const router = express.Router();

/* ---------------- CLOUDINARY CONFIGURATION ---------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ---------------- MULTER STORAGE (Cloudinary) ---------------- */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'cart-app/families',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 300, height: 300, crop: 'fill' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // ⛔ Maximum 2MB
  fileFilter: (req, file, cb) => {
    if (!/image\/(jpe?g|png)/.test(file.mimetype)) {
      return cb(new Error('מותר להעלות רק תמונות בפורמט JPG/PNG'), false);
    }
    cb(null, true);
  },
});

/* ---------------- CREATE FAMILY ---------------- */
router.post('/', requireAuth, upload.single('avatar'), async (req, res, next) => {
  try {
    console.log("📥 Family create request body:", req.body);
    console.log("📂 File received:", req.file);

    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'שם המשפחה הוא שדה חובה' });
    }

    let avatarUrl = null;
    if (req.file) {
      avatarUrl = req.file.path; // Cloudinary returns URL
      console.log("✅ Uploaded to Cloudinary:", avatarUrl);
    }

    const joinCode = nanoid(8);

    const family = await Family.create({
      name: name.trim(),
      description: description?.trim() || '',
      avatar: avatarUrl,
      owner: req.user.id,
      joinCode,
    });

    await Membership.create({
      user: req.user.id,
      family: family._id,
      role: 'owner',
      status: 'active',
    });

    await Cart.create({
      family: family._id,
      name: family.name,        
      avatar: family.avatar,     
      items: [],
      archived: false,
    });

    res.status(201).json({ family });
  } catch (e) {
    console.error("❌ Create family error:", e);
    next(e);
  }
});


/* ---------------- UPDATE FAMILY AVATAR ---------------- */
router.put('/:id/avatar', requireAuth, requireFamilyRole('owner'), upload.single('avatar'), async (req, res) => {
  try {
    console.log("📥 Family avatar update hit for family:", req.params.id);
    console.log("📂 File received:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: 'לא הועלתה תמונה' });
    }

    const family = await Family.findById(req.params.id);
    if (!family) {
      return res.status(404).json({ error: 'משפחה לא נמצאה' });
    }

    family.avatar = req.file.path; // Cloudinary URL
    await family.save();

    return res.json({ message: 'תמונת המשפחה עודכנה בהצלחה', family });
  } catch (err) {
    console.error("❌ Family avatar update error:", err);
    return res.status(500).json({ error: 'שגיאת שרת', details: err.message });
  }
});

/* ---------------- LIST FAMILIES ---------------- */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    console.log("📥 Families list requested by user:", req.user.id);

    const memberships = await Membership.find({
      user: req.user.id,
      status: 'active',
    }).populate('family');

    console.log("📂 Raw memberships:", JSON.stringify(memberships, null, 2));

    const families = memberships
      .filter((m) => !!m.family)
      .map((m) => ({
        _id: m.family._id,
        name: m.family.name,
        description: m.family.description || '',
        avatar: m.family.avatar || null,
        owner: m.family.owner,
        joinCode: m.family.joinCode,
        role: m.role,
      }));

    console.log("✅ Families response:", families);

    res.json({ families });
  } catch (e) {
    console.error("❌ Error in /families:", e);
    next(e);
  }
});

/* ---------------- GET FAMILY DETAILS ---------------- */
router.get('/:id', requireAuth, requireFamilyRole('member'), async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id).lean();
    if (!family) {
      return res.status(404).json({ error: 'משפחה לא נמצאה' });
    }

    const members = await Membership.find({
      family: family._id,
      status: 'active',
    })
      .populate('user', 'email _id avatar displayName') // Include avatar and displayName fields
      .lean();

    res.json({
      _id: family._id,
      name: family.name,
      description: family.description || '',
      avatar: family.avatar || null,
      owner: family.owner,
      joinCode: family.joinCode,
      members: members.map((m) => ({
        _id: m.user._id,
        email: m.user.email,
        displayName: m.user.displayName || null,
        avatar: m.user.avatar || null,   // Include avatar in response
        role: m.role,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/* ---------------- JOIN FAMILY BY CODE ---------------- */
router.post('/join-by-code', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) {
      return res.status(400).json({ error: 'נדרש קוד הצטרפות' });
    }

    const family = await Family.findOne({ joinCode: code.trim() });
    if (!family) {
      return res.status(400).json({ error: 'קוד הצטרפות לא תקין' });
    }

    await Membership.updateOne(
      { user: req.user.id, family: family._id },
      { $setOnInsert: { role: 'member', status: 'active' } },
      { upsert: true }
    );

    res.json({
      message: 'הצטרפת בהצלחה למשפחה',
      familyId: family._id,
      family: {
        _id: family._id,
        name: family.name,
        description: family.description || '',
        avatar: family.avatar || null,
        joinCode: family.joinCode,
      },
    });
  } catch (e) {
    next(e);
  }
});

/* ---------------- LEAVE FAMILY ---------------- */
router.post('/:id/leave', requireAuth, requireFamilyRole('member'), async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) {
      return res.status(404).json({ error: 'משפחה לא נמצאה' });
    }

    if (String(family.owner) === req.user.id) {
      return res
        .status(400)
        .json({ error: 'מנהל לא יכול לעזוב את המשפחה, יש למחוק את המשפחה במקום' });
    }

    await Membership.updateOne(
      { user: req.user.id, family: family._id },
      { $set: { status: 'removed' } }
    );

    res.json({ message: 'יצאת מהמשפחה בהצלחה' });
  } catch (e) {
    next(e);
  }
});

/* ---------------- DELETE FAMILY ---------------- */
router.delete('/:id', requireAuth, requireFamilyRole('owner'), async (req, res, next) => {
  try {
    const familyId = req.params.id;

    await Membership.deleteMany({ family: familyId });
    await Cart.deleteOne({ family: familyId });
    await Family.deleteOne({ _id: familyId });

    res.json({ message: 'המשפחה נמחקה בהצלחה' });
  } catch (e) {
    next(e);
  }
});

/* ---------------- UPDATE FAMILY DESCRIPTION ---------------- */
router.put('/:id/description', requireAuth, requireFamilyRole('member'), async (req, res) => {
  try {
    const { description } = req.body;

    const family = await Family.findById(req.params.id);
    if (!family) {
      return res.status(404).json({ error: 'משפחה לא נמצאה' });
    }

    family.description = description?.trim() || '';
    await family.save();

    res.json({ message: 'התיאור עודכן בהצלחה', family });
  } catch (err) {
    console.error("❌ Family description update error:", err);
    res.status(500).json({ error: 'שגיאת שרת', details: err.message });
  }
});

/* ---------------- REMOVE MEMBER (OWNER ONLY) ---------------- */
router.delete('/:id/members/:userId', requireAuth, requireFamilyRole('owner'), async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ error: 'מנהל לא יכול להסיר את עצמו' });
    }

    const membership = await Membership.findOne({ family: id, user: userId });
    if (!membership) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    await membership.deleteOne();
    res.json({ message: 'המשתמש הוסר בהצלחה' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
