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
      enum: [
        'PENDING_EMAIL_VERIFICATION',
        'PENDING_ADMIN_REVIEW',
        'ACTIVE',
        'SUSPENDED',
        'REJECTED',
        'ARCHIVED',
        'DELETION_PENDING',
        'DELETED',
        'DEACTIVATED',
      ],
      default: 'ACTIVE',
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedBy: {
      type: String,
      default: null,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: null,
    },
    deletionReason: {
      type: String,
      default: null,
    },
    retentionUntil: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
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
