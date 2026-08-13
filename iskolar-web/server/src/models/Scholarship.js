const mongoose = require('mongoose');

// Unified collection that replaces ScholarshipOpportunity as the canonical "Scholarship" dataset.
// It intentionally mirrors ScholarshipOpportunity fields so the existing UI/app behavior can continue.
const scholarshipSchema = new mongoose.Schema(
  {
    providerId: {
      type: Number,
      ref: 'Provider',
      required: true,
      // index added via schema.index() to avoid duplicate index warnings
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Scholarship', 'Allowance', 'Scholarship + Allowance'],
      required: true,
    },
    benefits: {
      type: String,
      required: true,
    },
    eligibilityRequirements: {
      type: String,
      required: true,
    },
    totalSlots: {
      type: Number,
      required: true,
      min: 1,
    },
    applicantsCount: {
      type: Number,
      default: 0,
      index: true,
    },
    approvedCount: {
      type: Number,
      default: 0,
    },
    applicationDeadline: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Open', 'Closed'],
      default: 'Draft',
      index: true,
    },
    allowance: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
      get: (value) => (value ? value.toString() : '0'),
    },
    maxAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
      get: (value) => (value ? value.toString() : '0'),
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

scholarshipSchema.index({ providerId: 1, status: 1 });
scholarshipSchema.index({ status: 1, applicationDeadline: 1 });

module.exports = mongoose.model('Scholarship', scholarshipSchema);

