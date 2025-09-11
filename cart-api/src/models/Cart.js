const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  notes: { type: String }
});

const CartSchema = new mongoose.Schema({
  name: { type: String, required: true },

  // Either family cart OR personal cart
family: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Family",
  default: null,
  sparse: true
}
,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // 🟢 Avatar for personal carts (family carts will fallback to family.avatar)
  avatar: { type: String, default: null },

  items: [CartItemSchema],

  archived: { type: Boolean, default: false } // Archive flag
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);
