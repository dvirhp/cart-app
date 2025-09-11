const { Schema, model, Types } = require('mongoose');

const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "" },

    parent: { type: Types.ObjectId, ref: 'Category', default: null },
    children: [{ type: Types.ObjectId, ref: 'Category' }],

    products: [{ type: Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
);

module.exports = model('Category', categorySchema);
