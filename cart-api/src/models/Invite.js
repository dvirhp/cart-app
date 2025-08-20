const mongoose = require('mongoose');

// Invite schema defining family invitation documents in the database
const InviteSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },   // Reference to the family this invite belongs to
  email: { type: String, required: true },                                            // Email address the invite is sent to
  code: { type: String, required: true },                                             // Unique invitation code
  expiresAt: { type: Date, required: true },                                          // Expiration date for the invite
  used: { type: Boolean, default: false }                                             // Indicates whether the invite has already been used
}, { timestamps: true });                                                             // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Invite', InviteSchema);
