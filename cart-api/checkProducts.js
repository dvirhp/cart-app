require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Mongo connected");

    // כמה מוצרים יש כרגע
    const count = await Product.countDocuments();
    console.log("📦 Total products in DB:", count);

    // תציג 5 מוצרים ראשונים עם הקטגוריה שלהם
    const products = await Product.find()
      .limit(5)
      .populate('category subCategory subSubCategory');

    console.log("🛒 Sample products:", products);

    // תציג גם תת-תת קטגוריה אחת לדוגמה עם המוצרים המשויכים
    const categoryWithProducts = await Category.findOne({ products: { $exists: true, $ne: [] } })
      .populate('products');

    console.log("📂 Sample category with products:", categoryWithProducts);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
