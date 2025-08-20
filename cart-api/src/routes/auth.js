const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

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
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('displayName').isLength({ min: 2 }),
  async (req, res) => {
    validate(req, res);

    const { email, password, displayName } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);

    // 10-minute verification code
    const code = genCode6();
    const user = await User.create({
      email,
      displayName,
      passwordHash,
      verifyCodeHash: hashCode(code),
      verifyCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verifyCodeAttempts: 0
    });
    console.log("📩 REGISTER verification code for", email, "is:", code);

    // Send verification email
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
      // User can still use resend option
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

    // Require verification before issuing token
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

    // If already verified, issue token immediately
    if (user.emailVerifiedAt) {
      const token = sign(user);
      return res.json({ token, user: user.toJSON() });
    }

    // Check code validity and attempts
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

    // Mark user as verified
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
router.get('/me', require('../middleware/requireAuth'), async (req, res) => {
  const user = await User.findById(req.user.id);
  return res.json({ user: user.toJSON() });
});

module.exports = router;
