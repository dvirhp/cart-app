// server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// ---------------- ROUTES & MIDDLEWARE ----------------
const familiesRoutes = require('./routes/families');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const requireAuth = require('./middleware/requireAuth');

const app = express();

// ---------------- CORE MIDDLEWARES ----------------
app.set('trust proxy', 1);               // Required when running behind a proxy (e.g. Render/Vercel)
app.use(helmet());                       // Basic security headers
app.use(compression());                  // Response compression
app.use(cors());                         // Enable CORS (can restrict origin if needed)
app.use(express.json({ limit: '2mb' })); // JSON request body limit
app.use(morgan('dev'));                  // Request logging for development

// Global rate limit for API (can be hardened as needed)
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

// ---------------- HEALTH CHECK ----------------
app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

// ---------------- ROUTES ----------------
// ⚠️ Order matters: auth must be loaded before routes requiring authentication
app.use('/api/v1/auth', authRoutes);

// Routes requiring authentication
app.use('/api/v1/users', requireAuth, usersRoutes);
app.use('/api/v1/families', requireAuth, familiesRoutes);
// If you want to make certain routes public later, move `requireAuth` inside the route files

// ---------------- 404 HANDLER ----------------
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// ---------------- CENTRALIZED ERROR HANDLER ----------------
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error('❌ API error:', err);

  // Common validation/MongoDB errors
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

// ---------------- MONGO CONNECTION & SERVER START ----------------
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
