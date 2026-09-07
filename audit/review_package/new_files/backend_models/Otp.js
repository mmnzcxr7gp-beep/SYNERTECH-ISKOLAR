const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      default: null,
    },
    purpose: {
      type: String,
      enum: ['login', 'registration', 'password_reset', 'email_verification'],
      default: 'login',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index: automatically deletes document when expiresAt arrives
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'otps',
  }
);

otpSchema.index({ email: 1, created_at: -1 });

module.exports = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
