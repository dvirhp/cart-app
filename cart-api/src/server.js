// server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// --- Routes & Middleware ---
const familiesRoutes = require('./routes/families');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const requireAuth = require('./middleware/requireAuth');

const app = express();

// ---------- Middlewares בסיס ---------- //
app.set('trust proxy', 1); // אם תריץ מאחורי פרוקסי/רנדאר/ורצל
app.use(helmet());         // כותרות אבטחה בסיסיות
app.use(compression());    // דחיסה
app.use(cors());           // CORS (אפשר להקשיח origin לפי הצורך)
app.use(express.json({ limit: '2mb' })); // גוף בקשות JSON
app.use(morgan('dev'));    // לוגים לפיתוח

// Rate limit קל על כל ה-API (אפשר להקשיח לפי צורך)
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

// ---------- Health ---------- //
app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

// ---------- Routes ---------- //
// ⚠️ סדר חשוב: auth לפני requireAuth
app.use('/api/v1/auth', authRoutes);

// ראוטים שדורשים התחברות
app.use('/api/v1/users', requireAuth, usersRoutes);
app.use('/api/v1/families', requireAuth, familiesRoutes);
// אם תרצה בעתיד לפתוח חלק מהמסלולים לציבור – תוציא את requireAuth לרמת הראוטר הפנימית

// ---------- 404 ---------- //
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// ---------- Error Handler מרוכז ---------- //
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error('❌ API error:', err);

  // שגיאות ולידציה/מונגו נפוצות
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate key', key: err.keyValue });
  }

  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});
/* eslint-enable no-unused-vars */

// ---------- Mongo & Server ---------- //
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Mongo connected');
    app.listen(PORT, () => console.log(`🚀 API running on :${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Mongo connection error', err);
    process.exit(1);
  });
