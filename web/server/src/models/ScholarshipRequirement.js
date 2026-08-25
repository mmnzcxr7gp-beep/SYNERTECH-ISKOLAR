const mongoose = require('mongoose');

const scholarshipRequirementSchema = new mongoose.Schema(
  {
    scholarshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scholarship',
      required: true,
      // index added via schema.index() to avoid duplicate index warnings
    },
    requirementName: {
      type: String,
      required: true,
      trim: true,
      // NOTE: Do NOT restrict to an enum.
      // Admin UI allows custom requirement strings, and backend must accept them.
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
    fileType: {
      type: [String],
      enum: ['pdf', 'jpg', 'jpeg', 'png'],
      default: ['pdf', 'jpg', 'jpeg', 'png'],
    },
    maxFileSize: {
      type: Number,
      default: 5242880, // 5MB in bytes
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding requirements by scholarship
scholarshipRequirementSchema.index({ scholarshipId: 1 });

module.exports = mongoose.model('ScholarshipRequirement', scholarshipRequirementSchema);
