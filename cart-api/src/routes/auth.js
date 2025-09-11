const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const requireAuth = require('../middleware/requireAuth');

/* ---------------- CLOUDINARY CONFIGURATION ---------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'cart-app/avatars',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 300, height: 300, crop: 'fill' }],
  },
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 2 * 1024 * 1024 }, // ⛔ Maximum 2MB
  fileFilter: (req, file, cb) => {
    if (!/image\/(jpe?g|png)/.test(file.mimetype)) {
      return cb(new Error('רק תמונות JPG/PNG מותרות'), false);
    }
    cb(null, true);
  }
});

/* ---------------- JWT HELPER ---------------- */
function sign(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/* ---------------- UTILITY HELPERS ---------------- */
const genCode6 = () => String(Math.floor(100000 + Math.random() * 900000));
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
};

/* ---------------- REGISTER ---------------- */
router.post(
  '/register',
  body('email').isEmail(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('password').isLength({ min: 6 }),
  body('firstName').isLength({ min: 2 }),
  body('lastName').isLength({ min: 2 }),
  body('birthDate').isISO8601().custom((value) => {
    if (new Date(value) > new Date()) throw new Error('תאריך לידה לא יכול להיות בעתיד');
    return true;
  }),
  body('phone').matches(/^[0-9]{9,15}$/),
  body('address')
    .optional({ checkFalsy: true }) 
    .isString().withMessage('ערך לא תקין'),  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, firstName, lastName, birthDate, phone, address, gender } = req.body;
    const displayName = `${firstName} ${lastName}`;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'האימייל כבר בשימוש' });

    const passwordHash = await bcrypt.hash(password, 10);
    const code = genCode6();

    const user = await User.create({
      email,
      displayName,
      firstName,
      lastName,
      birthDate,
      phone,
      address: address || null,
      gender,
      passwordHash,
      verifyCodeHash: hashCode(code),
      verifyCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verifyCodeAttempts: 0,
      avatar: null,
    });

    console.log("📩 REGISTER verification code for", email, "is:", code);

    try {
      await sendMail({
        to: email,
        subject: 'Cart – קוד אימות (6 ספרות)',
        text: `קוד האימות שלך: ${code}`,
        html: `<p>קוד האימות שלך: <b>${code}</b> (בתוקף ל־10 דקות)</p>`,
      });
    } catch (e) {
      console.error('MAIL ERROR:', e.message);
    }

    return res.status(201).json({ verifyRequired: true, email });
  }
);

/* ---------------- LOGIN ---------------- */
router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    validate(req, res);
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'פרטי ההתחברות שגויים' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'פרטי ההתחברות שגויים' });

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        verifyRequired: true,
        email,
        error: 'המייל לא אומת, יש להזין את קוד האימות שנשלח'
      });
    }

    const token = sign(user);
    return res.json({ token, user: user.toJSON() });
  }
);

/* ---------------- VERIFY ---------------- */
router.post('/verify',
  body('email').isEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  async (req, res) => {
    validate(req, res);
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'המשתמש לא נמצא' });

    if (user.emailVerifiedAt) {
      const token = sign(user);
      return res.json({ token, user: user.toJSON() });
    }

    if (!user.verifyCodeHash || !user.verifyCodeExpiresAt || user.verifyCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'הקוד פג תוקף, יש לבקש קוד חדש' });
    }

    if (user.verifyCodeAttempts >= 5) {
      return res.status(429).json({ error: 'יותר מדי ניסיונות שגויים, יש לבקש קוד חדש' });
    }

    const ok = (hashCode(code) === user.verifyCodeHash);
    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { verifyCodeAttempts: 1 } });
      return res.status(400).json({ error: 'קוד לא תקין' });
    }

    user.emailVerifiedAt = new Date();
    user.verifyCodeHash = null;
    user.verifyCodeExpiresAt = null;
    user.verifyCodeAttempts = 0;
    await user.save();

    const token = sign(user);
    return res.json({ token, user: user.toJSON() });
  }
);

/* ---------------- RESEND VERIFICATION CODE ---------------- */
router.post('/resend',
  body('email').isEmail(),
  async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'המשתמש לא נמצא' });
    if (user.emailVerifiedAt) return res.status(400).json({ error: 'המייל כבר אומת' });

    const code = genCode6();
    user.verifyCodeHash = hashCode(code);
    user.verifyCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.verifyCodeAttempts = 0;
    await user.save();

    console.log("📩 RESEND verification code for", email, "is:", code);

    try {
      await sendMail({
        to: email,
        subject: 'Cart – קוד אימות חדש',
        text: `קוד חדש: ${code}`,
        html: `<p>קוד חדש: <b>${code}</b> (בתוקף ל־10 דקות)</p>`,
      });
    } catch (e) {
      console.error('MAIL RESEND ERROR:', e.message);
    }

    res.json({ ok: true });
  }
);

/* ---------------- GET CURRENT USER ---------------- */
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  return res.json({ user: user.toJSON() });
});

/* ---------------- UPDATE PROFILE ---------------- */
router.put('/me/update',
  requireAuth,
  body('firstName').optional().isLength({ min: 2 }),
  body('lastName').optional().isLength({ min: 2 }),
  body('birthDate').optional().isISO8601(),
  body('phone').optional(),
  body('address').optional(),
  async (req, res) => {
    const { firstName, lastName, birthDate, phone, address } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'המשתמש לא נמצא' });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (birthDate !== undefined) user.birthDate = birthDate;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    if (firstName || lastName) {
      user.displayName = `${user.firstName} ${user.lastName}`;
    }

    await user.save();
    return res.json({ message: 'הפרופיל עודכן בהצלחה', user: user.toJSON() });
  }
);

/* ---------------- CHANGE PASSWORD ---------------- */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'חסרים פרטים' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'המשתמש לא נמצא' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'הסיסמה הנוכחית שגויה' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Change password error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

/* ---------------- UPLOAD AVATAR (Cloudinary) ---------------- */
router.post('/upload-avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  console.log("📥 upload-avatar hit");
  console.log("📂 req.file:", req.file);
  console.log("📂 req.body:", req.body);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'לא הועלה קובץ' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'המשתמש לא נמצא' });

    user.avatar = req.file.path; // Cloudinary returns a URL
    await user.save();

    return res.json({ message: 'התמונה עודכנה בהצלחה', user: user.toJSON() });
  } catch (err) {
    console.error("❌ UPLOAD ERROR:", err);
    return res.status(500).json({ error: 'שגיאת שרת', details: err.message });
  }
});

/* ---------------- FORGOT PASSWORD ---------------- */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'יש להזין אימייל' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ ok: true, message: 'אם האימייל קיים, נשלח אליו קוד' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordCode: codeHash,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000)
      }
    );

    console.log("📩 Password reset code for", email, "is:", code);

    res.json({ ok: true, message: 'אם האימייל קיים, נשלח אליו קוד' });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

/* ---------------- RESET PASSWORD ---------------- */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'חסרים פרטים' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordCode || !user.resetPasswordExpires) {
      return res.status(400).json({ error: 'ניסיון איפוס לא תקין או שפג תוקף' });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'קוד האיפוס פג תוקף' });
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (codeHash !== user.resetPasswordCode) {
      return res.status(400).json({ error: 'קוד האיפוס שגוי' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: user._id },
      {
        passwordHash: newHash,
        resetPasswordCode: null,
        resetPasswordExpires: null
      }
    );

    res.json({ ok: true, message: 'הסיסמה אופסה בהצלחה' });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

/* ---------------- DELETE ACCOUNT ---------------- */
router.delete('/delete-account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: 'המשתמש לא נמצא' });
    }

    return res.json({ success: true, message: 'החשבון נמחק בהצלחה' });
  } catch (err) {
    console.error('❌ deleteAccount error:', err.message);
    return res.status(500).json({ error: 'שגיאת שרת בעת מחיקת חשבון' });
  }
});

module.exports = router;
