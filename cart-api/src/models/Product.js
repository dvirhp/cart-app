const { Schema, model, Types } = require('mongoose');

const productSchema = new Schema(
  {
    name: { type: String, required: true }, // Product name
    description: { type: String }, // Description
    price: { type: Number, required: true }, // Price
    barcode: { type: String, unique: true }, // Barcode
    images: [{ type: String }], // Array of image URLs
    brand: { type: String }, // Brand (optional)
    stock: { type: Number, default: 0 }, // Inventory
    category: { type: Types.ObjectId, ref: 'Category' }, // Parent category
    subCategory: { type: Types.ObjectId, ref: 'Category' }, // Sub category
    subSubCategory: { type: Types.ObjectId, ref: 'Category' }, // Sub-sub category
  },
  { timestamps: true } // Adds createdAt & updatedAt
);

module.exports = model('Product', productSchema);
