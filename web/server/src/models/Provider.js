const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Organization Information
    organizationName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    // Organization Details
    industry: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      // Note: Removed unique: true to allow resubmissions.
      // userId is the unique identifier for providers.
    },
    operatingRegions: [String],
    // Verification Status
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationRejectionReason: {
      type: String,
      default: null,
    },
    // Verification Documents
    documents: {
      businessRegistration: {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
      businessPermit: {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
      taxIdentificationNumber: {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
    },
    // Payment Information
    paymentAccount: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      isVerified: {
        type: Boolean,
        default: false,
      },
    },
    // Funding Information
    totalFundingAmount: {
      type: Number,
      default: 0,
    },
    totalDisbursedAmount: {
      type: Number,
      default: 0,
    },
    activeProgramsCount: {
      type: Number,
      default: 0,
    },
    // Account Status
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'inactive', 'rejected', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED', 'PENDING_ADMIN_REVIEW'],
      default: 'active',
    },
    // Verification Timestamps
    verificationSubmittedAt: Date,
    verificationApprovedAt: Date,
    verificationRejectedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries (keep non-duplicate and useful indexes)
providerSchema.index({ verificationStatus: 1 });
providerSchema.index({ isVerified: 1 });
// providerSchema.index({ organizationName: 1 }); // kept out to avoid duplicate index warnings

module.exports = mongoose.model('Provider', providerSchema);
