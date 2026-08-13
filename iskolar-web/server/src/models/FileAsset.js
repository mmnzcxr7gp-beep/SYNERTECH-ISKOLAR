const mongoose = require('mongoose');

const FileAssetSchema = new mongoose.Schema(
  {
    storageProvider: {
      type: String,
      enum: ['local', 'gridfs', 's3'],
      default: 'local',
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    checksum: {
      type: String,
      default: '',
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accessScope: {
      type: String,
      enum: ['private', 'profile', 'application_doc'],
      default: 'private',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FileAsset', FileAssetSchema);
