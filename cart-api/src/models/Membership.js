const mongoose = require('mongoose');

const MembershipSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  role:   { type: String, enum: ['owner','member'], default: 'member', index: true },
  status: { type: String, enum: ['active','removed'], default: 'active' }
}, { timestamps: true });

MembershipSchema.index({ user: 1, family: 1 }, { unique: true });

module.exports = mongoose.model('Membership', MembershipSchema);
