const { Schema, model, Types } = require("mongoose");

const priceSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product" }, // Reference to Product document
    barcode: { type: String, index: true, required: true }, // Must match Product.barcode

    chain: { type: String, required: true }, // Retail chain name
    storeId: { type: String }, // Store identifier (if available)
    storeName: { type: String }, // Store name
    address: { type: String }, // Store address (optional)

    price: { type: Number, required: true }, // Actual product price
    updatedAt: { type: Date, default: Date.now }, // Last update timestamp
  },
  { timestamps: true } // Adds createdAt & updatedAt automatically
);

module.exports = model("Price", priceSchema);
