const { Schema, model, Types } = require('mongoose');

// User schema representing an account in the system
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },       // User's unique email address
    displayName: { type: String, required: true },                            // Name shown in the UI
    passwordHash: { type: String, required: true },                           // Encrypted password
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' }, // User access level
    familyId: { type: Types.ObjectId, ref: 'Family', default: null },         // Reference to family if user belongs to one

    emailVerifiedAt: { type: Date, default: null },                           // Date of successful email verification
    verifyCodeHash: { type: String, default: null },                          // Hashed verification code
    verifyCodeExpiresAt: { type: Date, default: null },                       // Verification code expiration timestamp
    verifyCodeAttempts: { type: Number, default: 0 },                         // Number of verification attempts
  },
  { timestamps: true }                                                        // Adds createdAt and updatedAt automatically
);

// Customize JSON output to clean internal fields
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;        // Expose id instead of _id
    delete ret._id;
    delete ret.__v;          // Remove version key
    delete ret.passwordHash; // Never expose password hash
    delete ret.verifyCodeHash; // Hide verification code hash
  }
});

module.exports = model('User', userSchema);
