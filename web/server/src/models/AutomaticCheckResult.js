const mongoose = require('mongoose');

const AutomaticCheckResultSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    ruleId: {
      type: String,
      required: true,
      index: true,
    },
    ruleVersion: {
      type: String,
      default: '1.0.0',
    },
    ruleCategory: {
      type: String,
      enum: ['FILE_INTEGRITY', 'ELIGIBILITY', 'OCR_CONSISTENCY', 'POLICY', 'CONSENT'],
      default: 'FILE_INTEGRITY',
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expectedCondition: {
      type: String,
      required: true,
    },
    actualResult: {
      type: String,
      enum: ['PASS', 'FAIL', 'WARN', 'NOT_APPLICABLE'],
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate rule evaluations per run
AutomaticCheckResultSchema.index({ applicationId: 1, ruleId: 1, timestamp: -1 });

module.exports = mongoose.model('AutomaticCheckResult', AutomaticCheckResultSchema);
