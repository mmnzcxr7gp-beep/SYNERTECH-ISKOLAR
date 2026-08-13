const mongoose = require('mongoose');

const applicationDocumentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScholarshipApplication',
      required: true,
      index: true,
    },
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScholarshipRequirement',
      default: null,
    },
    documentType: {
      type: String,
      default: 'DOCUMENT',
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileAsset',
      default: null,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'UPLOADED',
        'OCR_PROCESSING',
        'PENDING_REVIEW',
        'VERIFIED',
        'REJECTED',
        'NEEDS_RESUBMISSION',
        'pending_review',
        'approved',
        'rejected',
      ],
      default: 'UPLOADED',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_RESUBMISSION'],
      default: 'PENDING',
    },
    reviewerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
    reviewReason: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

applicationDocumentSchema.index({ applicationId: 1, documentType: 1 });

module.exports = mongoose.model('ApplicationDocument', applicationDocumentSchema);
