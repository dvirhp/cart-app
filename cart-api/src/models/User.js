const { Schema, model, Types } = require('mongoose');

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true }, // Unique user email
    displayName: { type: String, required: true }, // Public display name

    firstName: { type: String, required: true }, // First name
    lastName: { type: String, required: true }, // Last name
    birthDate: { type: Date, required: true }, // Date of birth
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' }, // Gender option

    phone: { type: String, required: true }, // Phone number
    address: { type: String, default: null }, // Address (optional)

    passwordHash: { type: String, required: true }, // Hashed password
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' }, // User role
    familyId: { type: Types.ObjectId, ref: 'Family', default: null }, // Linked family

    emailVerifiedAt: { type: Date, default: null }, // Email verification timestamp
    verifyCodeHash: { type: String, default: null }, // Hashed verification code
    verifyCodeExpiresAt: { type: Date, default: null }, // Verification code expiration
    verifyCodeAttempts: { type: Number, default: 0 }, // Attempts counter
    avatar: { type: String, default: null }, // Profile picture URL

    resetPasswordCode: { type: String, default: null }, // Password reset code
    resetPasswordExpires: { type: Date, default: null }, // Password reset expiration

    activeCart: { type: Types.ObjectId, ref: 'Cart', default: null }, // Current active cart
  },
  { timestamps: true } // Adds createdAt & updatedAt
);

// Remove sensitive/internal fields when converting to JSON
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
