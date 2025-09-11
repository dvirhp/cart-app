require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron'); // ✅ for scheduled jobs

// ---------------- ROUTES & MIDDLEWARE ----------------
const familiesRoutes = require('./routes/families');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const productRoutes = require('./routes/products');     // ✅ Products API
const categoryRoutes = require('./routes/categories');  // ✅ Categories API
const priceRoutes = require('./routes/price');          // ✅ Price comparison API
const cartsRoutes = require('./routes/carts');          // ✅ Carts API
const receiptRoutes = require('./routes/receipts');

const requireAuth = require('./middleware/requireAuth');
const { syncProducts } = require('./jobs/productSync'); // ✅ Product sync job

const app = express();

// ---------------- CORE MIDDLEWARES ----------------
app.set('trust proxy', 1);               // Required when running behind a proxy (Render/Vercel/NGINX)
app.use(helmet());                       // Security headers
app.use(compression());                  // Enable GZIP compression
app.use(cors());                         // Enable CORS (configure allowed origins if needed)
app.use(express.json({ limit: '2mb' })); // Parse JSON body (limit 2MB)
app.use(morgan('dev'));                  // Log HTTP requests (dev format)

app.use('/api/v1/receipts', requireAuth, receiptRoutes);


// Global rate limiter for all /api routes
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000                 // Limit each IP to 1000 requests per windowMs
}));

// ---------------- HEALTH CHECK ----------------
app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

// ---------------- PUBLIC ROUTES ----------------
app.use('/api/v1/auth', authRoutes); // Authentication routes (login/register/etc.)

// ---------------- PROTECTED ROUTES ----------------
app.use('/api/v1/users', requireAuth, usersRoutes);
app.use('/api/v1/families', requireAuth, familiesRoutes);
app.use('/api/v1/carts', cartsRoutes); // ✅ Carts require login

// ✅ Products & Categories (public for now, can protect later if needed)
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);

// ✅ Price routes
app.use('/api/v1/price', priceRoutes);

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

  // Handle common Mongoose errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate key', key: err.keyValue });
  }

  // Fallback generic error
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});
/* eslint-enable no-unused-vars */

// ---------------- MONGO CONNECTION & SERVER START ----------------
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: false, // ⛔ prevent Mongoose from auto-creating indexes
  })
  .then(() => {
    console.log("✅ Mongo connected");

    // Start server
    app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));

    // ---------------- CRON JOBS ----------------
    const SHUFERSAL_URL =
      "https://prices.shufersal.co.il/FileObject/UpdateCategory/7300/PriceFull7290027600007-001.xml.gz";

    // Run every 3 days at 03:00 AM
    cron.schedule("0 3 */3 * *", async () => {
      console.log("⏳ Running product sync job...");
      await syncProducts(SHUFERSAL_URL);
    });
  })
  .catch((err) => {
    console.error("❌ Mongo connection error", err);
    process.exit(1);
  });
