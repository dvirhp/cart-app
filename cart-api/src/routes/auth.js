const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const requireAuth = require('../middleware/requireAuth');

// Sign JWT token for authenticated users
function sign(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Generates a 6-digit code and a fast SHA-256 hash
const genCode6 = () => String(Math.floor(100000 + Math.random() * 900000));
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Runs validationResult and returns errors if exist
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
};

// REGISTER – creates user with verification code and sends email (no token returned)
router.post(
  '/register',
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('birthDate')
    .isISO8601().withMessage('Birth date must be a valid date')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Birth date cannot be in the future');
      }
      return true;
    }),
  body('phone')
    .matches(/^[0-9]{9,15}$/)
    .withMessage('Phone must contain only 9–15 digits'),
  body('address')
    .optional()
    .isLength({ min: 5 })
    .withMessage('Address must be at least 5 characters if provided'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // נחזיר את כל השגיאות כדי שיהיה ברור למשתמש
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, birthDate, phone, address } = req.body;
    const displayName = `${firstName} ${lastName}`;

    // בדיקה אם המייל כבר קיים
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    // הצפנת סיסמה
    const passwordHash = await bcrypt.hash(password, 10);

    // קוד אימות 6 ספרות
    const code = genCode6();
    const user = await User.create({
      email,
      displayName,
      firstName,
      lastName,
      birthDate,
      phone,
      address: address || null,
      passwordHash,
      verifyCodeHash: hashCode(code),
      verifyCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verifyCodeAttempts: 0
    });

    console.log("📩 REGISTER verification code for", email, "is:", code);

    // שליחת מייל
    const html = `
      <div style="font-family:sans-serif;">
        <h2>Account verification – Cart</h2>
        <p>Your verification code:</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:2px">${code}</p>
        <p>The code is valid for 10 minutes.</p>
      </div>`;
    try {
      await sendMail({
        to: email,
        subject: 'Cart – Verification Code (6 digits)',
        text: `Your verification code: ${code}`,
        html
      });
    } catch (e) {
      console.error('MAIL ERROR:', e.message);
    }

    return res.status(201).json({ verifyRequired: true, email });
  }
);

// LOGIN – denies access if email not verified
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

    if (!user.emailVerifiedAt) {
      return res.status(403).json({ error: 'Email not verified', verifyRequired: true, email });
    }

    const token = sign(user);
    return res.json({ token, user: user.toJSON() });
  }
);

// VERIFY – confirms 6-digit code then returns token
router.post('/verify',
  body('email').isEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  async (req, res) => {
    validate(req, res);

    const { email, code } = req.body;
    console.log("📥 VERIFY attempt for", email, "entered code:", code);

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

// RESEND – sends a new verification code
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
        html: `<p>New verification code: <b>${code}</b> (valid for 10 minutes)</p>`
      });
    } catch (e) {
      console.error('MAIL RESEND ERROR:', e.message);
    }

    res.json({ ok: true });
  }
);

// Returns the currently logged-in user
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  return res.json({ user: user.toJSON() });
});

// UPDATE – allow user to update profile info
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
    if (lastName  !== undefined) user.lastName  = lastName;
    if (birthDate !== undefined) user.birthDate = birthDate;
    if (phone     !== undefined) user.phone     = phone;
    if (address   !== undefined) user.address   = address;

    if (firstName || lastName) {
      user.displayName = `${user.firstName} ${user.lastName}`;
    }

    await user.save();
    return res.json({ message: 'Profile updated successfully', user: user.toJSON() });
  }
);



module.exports = router;
