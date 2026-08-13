const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Personal Information
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    // School Information
    schoolName: {
      type: String,
      required: false,
    },
    lrn: {
      type: String,
      required: false,
      // Note: Removed unique: true to allow resubmissions. 
      // userId is the unique identifier for students.
    },
    gradeLevel: {
      type: String,
      enum: ['7', '8', '9', '10', '11', '12', 'First Year', 'Second Year', 'Third Year', 'Fourth Year'],
    },
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
      governmentId: {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
      selfieWithId: {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
      certificateOfRegistration: {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
        verified: {
          type: Boolean,
          default: false,
        },
      },
    },
    // Payment Methods
    paymentMethods: {
      gcash: {
        number: String,
        accountName: String,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
      payMaya: {
        number: String,
        accountName: String,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
      bankAccount: {
        accountNumber: String,
        accountName: String,
        bankName: String,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
    },
    // Verification Timestamps
    verificationSubmittedAt: Date,
    verificationApprovedAt: Date,
    verificationRejectedAt: Date,
    // Transaction Information
    totalTransactionAmount: {
      type: Number,
      default: 0,
    },
    transactionCount: {
      type: Number,
      default: 0,
    },
    // Account Status
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries (keep non-duplicate indexes)
// studentSchema.index({ verificationStatus: 1 }); // removed to avoid duplicate schema index warnings
// studentSchema.index({ isVerified: 1 }); // kept out to avoid duplicate index warnings

module.exports = mongoose.model('Student', studentSchema);
