require("dotenv").config();
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { parseStringPromise } = require("xml2js");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Price = require("../models/Price");

async function run() {
  console.log("⏳ Connecting to Mongo...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to Mongo");

  // ✅ כאן תעדכן את שם הקובץ האחרון שהורדת
  const filePath = path.join(__dirname, "Price7290785400000-002-202509030800.gz");
  const gzData = fs.readFileSync(filePath);

  // פריסה
  const xml = zlib.gunzipSync(gzData).toString("utf8");
  const json = await parseStringPromise(xml, { explicitArray: false });

  const store = json?.Root?.Store;
  const storeName = store?.StoreName || "קשת טעמים"; // ✅ ברירת מחדל
  const items = Array.isArray(json?.Root?.Items?.Item)
    ? json.Root.Items.Item
    : [json?.Root?.Items?.Item || []];

  console.log("📑 Store:", storeName, "| Items in file:", items.length);

  // שלב 1: טען מוצרים שלך
  const products = await Product.find({}, "barcode name brand");
  const barcodeMap = new Map(products.map((p) => [p.barcode, p]));

  // שלב 2: חפש התאמות
  const matches = items
    .filter((p) => barcodeMap.has(p.ItemCode))
    .map((p) => {
      const prod = barcodeMap.get(p.ItemCode);
      return {
        product: prod._id,
        barcode: p.ItemCode,
        chain: "קשת טעמים",
        storeId: store?.StoreID || null,
        storeName,
        address: store?.Address || "",
        price: parseFloat(p.ItemPrice),
        updatedAt: new Date(),
        productName: prod.name,
        brand: prod.brand || p.ManufacturerName || "",
      };
    });

  console.log("✅ Found matches:", matches.length);

  // שלב 3: שמירה + דוגמאות
  if (matches.length > 0) {
    await Price.insertMany(matches.slice(0, 10), { ordered: false });
    console.log("💾 Saved first 10 matches to Price collection");

    console.log("📊 Example 10 results:");
    matches.slice(0, 10).forEach((m, i) => {
      console.log(
        `${i + 1}. 🏷️ ${m.productName} | ברקוד: ${m.barcode} | מחיר: ₪${m.price} | חנות: ${m.storeName}`
      );
    });
  } else {
    console.log("⚠️ No matching products found");
  }

  await mongoose.disconnect();
  console.log("🔌 Mongo disconnected");
}

run();
