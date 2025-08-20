require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const familiesRoutes = require('./routes/families');

const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');

const app = express();
app.use(cors());                 // Enable Cross-Origin requests
app.use(express.json());        // Parse incoming JSON bodies
app.use(morgan('dev'));         // Log requests to console (dev format)

// Health check endpoint
app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

// Public and protected routes
app.use('/api/v1/auth', authRoutes);                        // Auth (register/login/verify)
app.use('/api/v1/users', requireAuth, usersRoutes);         // Users listing (protected)
app.use('/api/v1/families', requireAuth, familiesRoutes);   // Families endpoints (protected)

const PORT = process.env.PORT || 3000;

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Mongo connected');
    app.listen(PORT, () => console.log(`API on :${PORT}`));
  })
  .catch((err) => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });
