const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    // Transaction Details
    transactionType: {
      type: String,
      enum: ['scholarship_payment', 'allowance_payment', 'tuition_payment', 'refund'],
      required: true,
    },
    // Parties Involved
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      sparse: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      sparse: true,
    },
    // Transfer Information
    transferDirection: {
      type: String,
      enum: ['provider_to_school', 'provider_to_student'],
      required: true,
    },
    // Amount & Payment
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PHP',
    },
    paymentMethod: {
      type: String,
      enum: ['gcash', 'payMaya', 'bank_transfer', 'check', 'cash'],
      required: true,
    },
    // Status Tracking
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    // Reference Information
    referenceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // For Scholarship/Allowance
    scholarshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scholarship',
      sparse: true,
    },
    programName: String,
    disbursementMonth: Date,
    // Verification & Approval
    isStudentVerified: {
      type: Boolean,
      default: false,
    },
    requiresStudentVerification: {
      type: Boolean,
      default: true,
    },
    studentApprovedAt: Date,
    adminApprovedAt: Date,
    approvedBy: {
      // legacy users are stored in the in-memory DB with numeric ids
      type: Number,
      ref: 'User',
      sparse: true,
    },
    // Proof of Payment
    proofOfPayment: {
      fileName: String,
      fileUrl: String,
      uploadedAt: Date,
    },
    receiptNumber: String,
    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    failureReason: String,
    failureAt: Date,
    // Tracking
    notes: String,
    description: String,
    // For Allowance Tracking
    allowanceMonth: String, // e.g., "2024-01"
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
// transactionId and referenceNumber already create unique indexes via field options,
// avoid duplicating those with schema.index(). Keep other useful indexes.
transactionSchema.index({ providerId: 1 });
// transactionSchema.index({ studentId: 1 }); // avoid duplicate schema index warnings
// transactionSchema.index({ schoolId: 1 }); // avoid duplicate schema index warnings
transactionSchema.index({ status: 1 });
transactionSchema.index({ transactionType: 1 });
transactionSchema.index({ initiatedAt: -1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
