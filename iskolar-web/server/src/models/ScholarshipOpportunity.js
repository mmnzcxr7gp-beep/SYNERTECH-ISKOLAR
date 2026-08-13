const mongoose = require('mongoose');

const scholarshipOpportunitySchema = new mongoose.Schema(
  {
    providerId: {
      type: Number,
      ref: 'Provider',
      required: true,
      index: true,
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
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

// Index for finding opportunities by provider and status
scholarshipOpportunitySchema.index({ providerId: 1, status: 1 });
scholarshipOpportunitySchema.index({ status: 1, applicationDeadline: 1 });

module.exports = mongoose.model('ScholarshipOpportunity', scholarshipOpportunitySchema);
