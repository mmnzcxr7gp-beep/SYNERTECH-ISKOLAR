const mongoose = require('mongoose');

const OcrExtractionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'tesseract',
    },
    providerVersion: {
      type: String,
      default: '7.0.0',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CONFIRMED'],
      default: 'PENDING',
    },
    rawText: {
      type: String,
      default: '',
    },
    extractedFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    confidenceScore: {
      type: Number,
      default: 0,
    },
    userCorrections: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    confirmedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OcrExtraction', OcrExtractionSchema);
