const { Schema, model, Types } = require('mongoose');

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },

    phone: { type: String, required: true },   // 📱 Phone number (required)
    address: { type: String, default: null },  // 🏠 Address (optional)

    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    familyId: { type: Types.ObjectId, ref: 'Family', default: null },

    emailVerifiedAt: { type: Date, default: null },
    verifyCodeHash: { type: String, default: null },
    verifyCodeExpiresAt: { type: Date, default: null },
    verifyCodeAttempts: { type: Number, default: 0 },
    avatar: { type: String, default: null },

    resetPasswordCode: { type: String, default: null },
resetPasswordExpires: { type: Date, default: null },


  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.verifyCodeHash;
  }
});

module.exports = model('User', userSchema);
