const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  qty:   { type: Number, default: 1, min: 1 },
  notes: { type: String }
}, { _id: false });

const CartSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, unique: true },
  items:  [CartItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);
