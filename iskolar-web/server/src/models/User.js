const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'staff', 'provider', 'sponsor', 'STUDENT', 'ADMIN', 'SPONSOR', 'STAFF', 'PROVIDER'],
      default: 'student',
      lowercase: true,
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'PENDING_EMAIL_VERIFICATION', 'PENDING_ADMIN_REVIEW', 'SUSPENDED', 'DEACTIVATED'],
      default: 'ACTIVE',
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      default: null,
    },
    mfaMethod: {
      type: String,
      enum: ['EMAIL_OTP', 'AUTHENTICATOR'],
      default: 'EMAIL_OTP',
    },
    failedLoginCount: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    fcmTokens: [{ type: String }],
    profile: {
      fullName: { type: String, default: '' },
      avatarUrl: { type: String, default: '' },
      phoneNumber: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
