const mongoose = require('mongoose');

const ConsentRecordSchema = new mongoose.Schema(
  {
    // P1 FIX: Accept both ObjectId and numeric IDs (in-memory store uses numeric IDs)
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    policyVersion: {
      type: String,
      required: true,
      default: '1.0',
    },
    consentType: {
      type: String,
      enum: ['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'DATA_PROCESSING'],
      required: true,
    },
    accepted: {
      type: Boolean,
      required: true,
      default: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    sourcePlatform: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
    ip: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ConsentRecord', ConsentRecordSchema);
