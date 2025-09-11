require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const { parseStringPromise } = require("xml2js");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------- classify with AI ---------- */
async function classifyProductAI(name, brand, subSubCategories) {
  const prompt = `אתה מקבל מוצר מסופרמרקט.
המשימה שלך: לסווג את המוצר לתת-תת-קטגוריה מתוך הרשימה הבאה בלבד:

${subSubCategories.join(", ")}

מוצר: ${name}
מותג: ${brand || "ללא"}

תחזיר אך ורק את שם תת-התת-קטגוריה המדויק מהרשימה למעלה.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    if (err.message.includes("429")) {
      console.error("⏸ Hit daily rate limit (429). Please rerun after reset (00:00 UTC).");
      process.exit(0); // stop gracefully
    }
    console.error("❌ AI classification error:", err.message);
    return null;
  }
}

/* ---------- Main runner ---------- */
async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Mongo connected");

    // 📂 Load all sub-sub categories
    const allSubSubCategories = await Category.find({ parent: { $ne: null } });
    const subSubCategoryNames = allSubSubCategories.map((c) => c.name);
    console.log(`📂 Loaded ${subSubCategoryNames.length} sub-sub categories from DB`);

    // ℹ️ Count how many products are already classified / unclassified
    const totalProducts = await Product.countDocuments();
    const classifiedCount = await Product.countDocuments({ subSubCategory: { $ne: null } });
    const unclassifiedCount = totalProducts - classifiedCount;

    console.log(`📊 Products in DB: ${totalProducts}`);
    console.log(`✅ Already classified: ${classifiedCount}`);
    console.log(`🕐 Still unclassified: ${unclassifiedCount}`);

    // 1. Load local XML file
    const xmlData = fs.readFileSync("./data/PriceFull.xml", "utf-8");

    // 2. Parse XML to JSON
    const json = await parseStringPromise(xmlData, { explicitArray: false });

    // 3. Extract items
    const items = Array.isArray(json.Root?.Items?.Item)
      ? json.Root.Items.Item
      : [json.Root?.Items?.Item].filter(Boolean);

    console.log(`📦 Found ${items.length} items in local file`);

    let counter = 0;
    for (const item of items) {
      // ⏩ Skip if product already classified
      const existing = await Product.findOne({
        barcode: item.ItemCode,
        subSubCategory: { $ne: null },
      });

      if (existing) {
        continue;
      }

      // 🔎 Classify with AI
      const subSubCategoryName = await classifyProductAI(
        item.ItemName,
        item.ManufacturerName,
        subSubCategoryNames
      );

      let subSubCategory = null;
      if (subSubCategoryName) {
        subSubCategory = await Category.findOne({ name: subSubCategoryName });
      }

      // Build product data
      const productData = {
        barcode: item.ItemCode,
        name: item.ItemName,
        brand: item.ManufacturerName || "",
        prices: [
          {
            chain: "Shufersal",
            branchId: json.Root.StoreId || "",
            price: parseFloat(item.ItemPrice) || 0,
            updatedAt: new Date(item.PriceUpdateDate),
          },
        ],
        subSubCategory: subSubCategory?._id || null,
      };

      const product = await Product.findOneAndUpdate(
        { barcode: productData.barcode },
        {
          $set: {
            name: productData.name,
            brand: productData.brand,
            subSubCategory: productData.subSubCategory,
            lastUpdated: new Date(),
          },
          $push: { prices: productData.prices[0] },
        },
        { upsert: true, new: true }
      );

      // ✅ Link product to category
      if (subSubCategory) {
        await Category.findByIdAndUpdate(subSubCategory._id, {
          $addToSet: { products: product._id },
        });
      }

      counter++;
      if (counter % 100 === 0) {
        console.log(`✅ Processed ${counter} new products`);
      }
    }

    console.log(`🎉 Finished. Classified ${counter} new products in this run.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
