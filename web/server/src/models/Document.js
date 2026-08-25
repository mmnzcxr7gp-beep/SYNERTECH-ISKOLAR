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
    docType: {
      type: String,
      default: 'GENERAL_DOCUMENT',
    },
    originalName: { type: String, default: '' },
    storedKey: { type: String, index: true, required: true },
    storageDriver: { type: String, enum: ['local', 'r2', 's3'], default: 'local' },
    fileHash: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_RESUBMISSION', 'REPLACED', 'ARCHIVED', 'PENDING_MANUAL_REVIEW'],
      default: 'PENDING',
    },
    ocrData: { type: Object, default: {} },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, default: '' },
    reviewReason: { type: String, default: '' },
    previousVersions: [DocumentVersionHistorySchema],
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
