const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
      default: null,
    },
    reason: {
      type: String,
      enum: ['logout', 'account_suspension', 'password_reset', 'admin_action', 'token_refresh'],
      default: 'logout',
    },
    revokedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatic TTL cleanup upon token expiration
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.RevokedToken || mongoose.model('RevokedToken', revokedTokenSchema);
