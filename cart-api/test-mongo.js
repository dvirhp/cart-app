require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    const t0 = Date.now();
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to Mongo in', Date.now() - t0, 'ms');
  } catch (e) {
    console.error('❌ Mongo connect error:', e.message);
  } finally {
    await mongoose.disconnect();
  }
})();
