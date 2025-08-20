const mongoose = require('mongoose');

// Family schema representing a family group in the system
const FamilySchema = new mongoose.Schema({
  name: { type: String, required: true },                          // Family name
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of references to user IDs that belong to the family
}, { timestamps: true });                                           // Automatically includes createdAt and updatedAt timestamps

module.exports = mongoose.model('Family', FamilySchema);
