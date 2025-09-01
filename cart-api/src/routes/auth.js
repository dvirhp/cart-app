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
      return cb(new Error('Only JPG/PNG images allowed'), false);
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
    if (new Date(value) > new Date()) throw new Error('Birth date cannot be in the future');
    return true;
  }),
  body('phone').matches(/^[0-9]{9,15}$/),
  body('address')
    .optional({ checkFalsy: true }) 
    .isString().withMessage('Invalid value'),  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, firstName, lastName, birthDate, phone, address, gender } = req.body;
    const displayName = `${firstName} ${lastName}`;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

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
        subject: 'Cart – Verification Code (6 digits)',
        text: `Your verification code: ${code}`,
        html: `<p>Your verification code: <b>${code}</b> (valid for 10 minutes)</p>`,
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
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // 🔑 Ensure the email has been verified
    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        verifyRequired: true,
        email,
        error: 'Email not verified'
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
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.emailVerifiedAt) {
      const token = sign(user);
      return res.json({ token, user: user.toJSON() });
    }

    if (!user.verifyCodeHash || !user.verifyCodeExpiresAt || user.verifyCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Code expired. Please resend.' });
    }

    if (user.verifyCodeAttempts >= 5) {
      return res.status(429).json({ error: 'Too many attempts. Resend code.' });
    }

    const ok = (hashCode(code) === user.verifyCodeHash);
    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { verifyCodeAttempts: 1 } });
      return res.status(400).json({ error: 'Invalid code' });
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
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerifiedAt) return res.status(400).json({ error: 'Already verified' });

    const code = genCode6();
    user.verifyCodeHash = hashCode(code);
    user.verifyCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.verifyCodeAttempts = 0;
    await user.save();

    console.log("📩 RESEND verification code for", email, "is:", code);

    try {
      await sendMail({
        to: email,
        subject: 'Cart – New Verification Code',
        text: `Code: ${code}`,
        html: `<p>New verification code: <b>${code}</b> (valid for 10 minutes)</p>`,
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
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (birthDate !== undefined) user.birthDate = birthDate;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    if (firstName || lastName) {
      user.displayName = `${user.firstName} ${user.lastName}`;
    }

    await user.save();
    return res.json({ message: 'Profile updated successfully', user: user.toJSON() });
  }
);

/* ---------------- CHANGE PASSWORD ---------------- */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Change password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ---------------- UPLOAD AVATAR (Cloudinary) ---------------- */
router.post('/upload-avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  console.log("📥 upload-avatar hit");
  console.log("📂 req.file:", req.file);
  console.log("📂 req.body:", req.body);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.avatar = req.file.path; // Cloudinary returns a URL
    await user.save();

    return res.json({ message: 'Avatar updated', user: user.toJSON() });
  } catch (err) {
    console.error("❌ UPLOAD ERROR:", err); // 👈 Logs the real error
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/* ---------------- FORGOT PASSWORD ---------------- */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Do not expose whether the user exists or not
      return res.json({ ok: true, message: 'If the email exists, code was sent' });
    }

    // Generate 6-digit reset code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    // ✅ Direct update without running validations
    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordCode: codeHash,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000) // Expires in 10 minutes
      }
    );

    console.log("📩 Password reset code for", email, "is:", code);

    res.json({ ok: true, message: 'If the email exists, code was sent' });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ---------------- RESET PASSWORD ---------------- */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordCode || !user.resetPasswordExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset attempt' });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'Reset code expired' });
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (codeHash !== user.resetPasswordCode) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    // ✅ Direct password update
    const newHash = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: user._id },
      {
        passwordHash: newHash,
        resetPasswordCode: null,
        resetPasswordExpires: null
      }
    );

    res.json({ ok: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ---------------- DELETE ACCOUNT ---------------- */
router.delete('/delete-account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('❌ deleteAccount error:', err.message);
    return res.status(500).json({ error: 'Server error while deleting account' });
  }
});

module.exports = router;
