const mongoose = require('mongoose');

// Unified collection that replaces ScholarshipOpportunity as the canonical "Scholarship" dataset.
const scholarshipSchema = new mongoose.Schema(
  {
    providerId: {
      type: Number,
      ref: 'Provider',
      required: true,
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
      enum: ['Draft', 'Open', 'Closed', 'draft', 'open', 'closed', 'archived'],
      default: 'Open',
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
    // Admin Content Control & Versioning Fields
    version: {
      type: Number,
      default: 1,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    deleteReason: {
      type: String,
      default: null,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastEditReason: {
      type: String,
      default: null,
    },
    editHistory: [
      {
        version: Number,
        editedBy: mongoose.Schema.Types.Mixed,
        editorRole: String,
        editReason: String,
        previousData: mongoose.Schema.Types.Mixed,
        updatedData: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
        ip: String,
        userAgent: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

scholarshipSchema.index({ providerId: 1, status: 1 });
scholarshipSchema.index({ status: 1, applicationDeadline: 1 });

module.exports = mongoose.model('Scholarship', scholarshipSchema);
