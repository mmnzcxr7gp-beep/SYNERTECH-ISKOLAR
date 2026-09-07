const mongoose = require('mongoose');

const DocumentVersionHistorySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    storedKey: { type: String, required: true },
    fileHash: { type: String, default: '' },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
    originalName: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
    replacedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    documentId: { type: String, index: true },
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentId: { type: Number, index: true },
    providerId: { type: Number, index: true },
    applicationId: { type: Number, index: true },
    requirementId: { type: String, default: '' },
    docType: {
      type: String,
      default: 'GENERAL_DOCUMENT',
    },
    originalName: { type: String, default: '' },
    originalFilename: { type: String, default: '' },
    storedKey: { type: String, index: true, required: true },
    objectKey: { type: String, default: '' },
    storageDriver: { type: String, enum: ['local', 'r2', 's3'], default: 'local' },
    bucket: { type: String, default: '' },
    fileHash: { type: String, default: '' },
    sha256Hash: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    version: { type: Number, default: 1 },

    // Phase 5 Multi-Stage Status Architecture
    storageStatus: {
      type: String,
      enum: ['PENDING', 'STORED', 'FAILED'],
      default: 'STORED',
    },
    ocrStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PROCESSING', 'COMPLETED', 'LOW_CONFIDENCE', 'FAILED', 'PENDING_HUMAN_REVIEW', 'PENDING'],
      default: 'NOT_STARTED',
    },
    automaticCheckStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PASS', 'FAIL', 'UNCERTAIN', 'MISSING_INFORMATION', 'FLAGGED_MISMATCH'],
      default: 'NOT_STARTED',
    },
    studentConfirmationStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'CONFIRMED'],
      default: 'NOT_REQUIRED',
    },
    manualReviewStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'IN_REVIEW', 'COMPLETED'],
      default: 'NOT_STARTED',
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING_HUMAN_REVIEW', 'VERIFIED_BY_HUMAN', 'REJECTED_BY_HUMAN'],
      default: 'PENDING_HUMAN_REVIEW',
    },

    // Legacy status field compatibility
    status: {
      type: String,
      default: 'PENDING_HUMAN_REVIEW',
    },

    ocrData: { type: Object, default: {} },
    rawOcrText: { type: String, default: '' },
    extractedFields: { type: Object, default: {} },
    missingFields: { type: [String], default: [] },
    automaticCheckDetails: { type: Object, default: {} },
    providerNotes: { type: String, default: '' },

    // Human-Only Verification Audit Trail
    verifiedByHuman: {
      reviewerId: { type: Number },
      reviewerRole: { type: String },
      reviewerName: { type: String },
      reviewedAt: { type: Date },
      reason: { type: String },
    },

    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, default: '' },
    reviewReason: { type: String, default: '' },
    previousVersions: [DocumentVersionHistorySchema],
    uploadedBy: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
