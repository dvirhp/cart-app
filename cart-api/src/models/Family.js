const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },          // Added: family description
  avatar:      { type: String, default: null },        // Added: family avatar image URL
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinCode:    { type: String, required: true, unique: true, index: true }, // Unique join code for each family
}, { timestamps: true });

module.exports = mongoose.model('Family', FamilySchema);
