const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      ref: 'User',
      required: true,
    },

    userType: {
      type: String,
      enum: ['student', 'provider'],
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      sparse: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      sparse: true,
    },
    // Verification Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'under_review'],
      default: 'pending',
    },
    // Verification Details
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: Date,
    reviewedBy: {
      // legacy users are stored in the in-memory DB with numeric ids
      type: Number,
      ref: 'User',
      sparse: true,
    },
    // For Students
    documents: {
      governmentId: {
        isVerified: Boolean,
        notes: String,
      },
      selfieWithId: {
        isVerified: Boolean,
        notes: String,
      },
      certificateOfRegistration: {
        isVerified: Boolean,
        notes: String,
      },
    },
    // For Providers
    businessDocuments: {
      registration: {
        isVerified: Boolean,
        notes: String,
      },
      permit: {
        isVerified: Boolean,
        notes: String,
      },
      taxId: {
        isVerified: Boolean,
        notes: String,
      },
    },
    // Review Notes
    adminNotes: String,
    rejectionReason: String,
    // Flags for issues found
    flags: [
      {
        type: String,
        enum: [
          'document_quality_poor',
          'document_not_valid',
          'identity_mismatch',
          'document_expired',
          'suspicious_activity',
          'other',
        ],
      },
    ],
    // Number of resubmissions
    resubmissionCount: {
      type: Number,
      default: 0,
    },
    lastResubmissionAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
verificationSchema.index({ userId: 1 });
verificationSchema.index({ status: 1 });
verificationSchema.index({ userType: 1 });
// verificationSchema.index({ studentId: 1 }); // kept out to avoid duplicate index warnings
// verificationSchema.index({ providerId: 1 }); // kept out to avoid duplicate index warnings
verificationSchema.index({ submittedAt: -1 });

const Verification = mongoose.models.Verification || mongoose.model('Verification', verificationSchema);
module.exports = Verification;
