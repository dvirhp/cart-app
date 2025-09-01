const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },          // ⬅️ הוספתי
  avatar:      { type: String, default: null },        // ⬅️ הוספתי
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinCode:    { type: String, required: true, unique: true, index: true }, // קוד קבוע לכל משפחה
}, { timestamps: true });

module.exports = mongoose.model('Family', FamilySchema);
