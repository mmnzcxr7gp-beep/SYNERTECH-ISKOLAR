const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: true,
      unique: true,
    },
    schoolCode: {
      type: String,
      unique: true,
      required: true,
    },
    region: String,
    province: String,
    municipality: String,
    schoolLevel: {
      type: String,
      enum: ['elementary', 'junior_high', 'senior_high', 'tertiary'],
    },
    // Contact Information
    contactNumber: String,
    email: {
      type: String,
      lowercase: true,
    },
    // Principal/Head Information
    principalName: String,
    // Payment Account for School
    paymentAccount: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      isVerified: {
        type: Boolean,
        default: false,
      },
    },
    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Statistics
    totalStudentsEnrolled: Number,
    totalScholarships: {
      type: Number,
      default: 0,
    },
    totalDisbursements: {
      type: Number,
      default: 0,
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// schoolName and schoolCode are unique and create indexes automatically via field options.
// Avoid duplicating those here. Keep regional indexes.
schoolSchema.index({ region: 1 });
// Note: avoid schema-level single-field indexes that duplicate field-level indexes if any exist elsewhere.
schoolSchema.index({ province: 1 });

module.exports = mongoose.model('School', schoolSchema);
