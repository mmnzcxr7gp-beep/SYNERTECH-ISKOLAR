const mongoose = require('mongoose');

const manualReviewLogSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    studentId: {
      type: Number,
      required: true,
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: [
        'UPLOADED',
        'PROCESSING',
        'OCR_COMPLETED',
        'OCR_FAILED',
        'AUTOMATIC_CHECKS_PASSED',
        'AUTOMATIC_CHECKS_FLAGGED',
        'PENDING_MANUAL_REVIEW',
        'NEEDS_RESUBMISSION',
        'VERIFIED',
        'APPROVED',
        'REJECTED',
      ],
      default: 'PENDING_MANUAL_REVIEW',
      index: true,
    },
    manualReviewReason: {
      type: String,
      default: '',
    },
    ocrConfidence: {
      type: Number,
      default: 0,
    },
    ocrErrorCode: {
      type: String,
      default: null,
    },
    failedRuleIds: [{
      type: String,
    }],
    studentCorrections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reviewerId: {
      type: Number,
      default: null,
    },
    reviewerRole: {
      type: String,
      default: null,
    },
    reviewDecision: {
      type: String,
      default: null,
    },
    reviewReason: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    newStatus: {
      type: String,
      default: null,
    },
    history: [
      {
        action: { type: String, required: true },
        performedBy: { type: Number, default: null },
        role: { type: String, default: null },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: '' },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
  },
  { timestamps: true }
);

manualReviewLogSchema.index({ applicationId: 1, documentId: 1 });
manualReviewLogSchema.index({ reviewStatus: 1, createdAt: -1 });

module.exports = mongoose.models.ManualReviewLog || mongoose.model('ManualReviewLog', manualReviewLogSchema);
