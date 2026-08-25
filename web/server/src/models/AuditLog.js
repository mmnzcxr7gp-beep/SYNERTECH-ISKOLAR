const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    // P1 FIX: Accept both ObjectId and numeric IDs (in-memory store uses numeric IDs)
    actorUserId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['student', 'admin', 'staff', 'provider', 'sponsor', 'system', 'STUDENT', 'ADMIN', 'STAFF', 'PROVIDER', 'SPONSOR', 'SYSTEM'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    beforeSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
    requestId: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
