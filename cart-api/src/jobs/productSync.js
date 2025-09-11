const axios = require('axios');
const zlib = require('zlib'); // ✅ built-in, no npm install needed
const { parseStringPromise } = require('xml2js');
const Product = require('../models/Product');

/**
 * Download and parse PriceFull file from a retailer
 */
async function fetchPriceFile(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });

    // If file is gzipped → decompress
    let xmlData;
    if (url.endsWith('.gz')) {
      xmlData = zlib.gunzipSync(res.data).toString('utf-8');
    } else {
      xmlData = res.data.toString();
    }

    // Convert XML to JSON
    const json = await parseStringPromise(xmlData, { explicitArray: false });
    return json;
  } catch (err) {
    console.error('❌ Failed to fetch file:', url, err.message);
    return null;
  }
}

/**
 * Parse JSON structure from PriceFull into Product objects
 */
function mapProductsFromJson(json) {
  if (!json || !json.PriceCatalog || !json.PriceCatalog.Item) return [];

  const items = Array.isArray(json.PriceCatalog.Item)
    ? json.PriceCatalog.Item
    : [json.PriceCatalog.Item];

  return items.map(item => ({
    barcode: item.ItemCode,
    name: item.ItemName,
    brand: item.ManufacturerName || '',
    prices: [{
      chain: 'Shufersal',    // Example: hardcoded for now
      branchId: item.StoreId || '',
      price: parseFloat(item.ItemPrice) || 0,
      updatedAt: new Date()
    }]
  }));
}

/**
 * Sync products to MongoDB
 */
async function syncProducts(url) {
  const json = await fetchPriceFile(url);
  const products = mapProductsFromJson(json);

  for (const p of products) {
    try {
      await Product.findOneAndUpdate(
        { barcode: p.barcode },
        {
          $set: { name: p.name, brand: p.brand, lastUpdated: new Date() },
          $push: { prices: p.prices[0] }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(`❌ Failed to upsert product ${p.barcode}:`, err.message);
    }
  }

  console.log(`✅ Synced ${products.length} products from ${url}`);
}

module.exports = { syncProducts };
