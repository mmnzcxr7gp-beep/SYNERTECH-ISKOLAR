const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
    },
    applicationId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    scholarshipId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED'],
      default: 'ACTIVE',
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessagePreview: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ applicationId: 1 }, { unique: true });
conversationSchema.index({ studentId: 1, lastMessageAt: -1 });
conversationSchema.index({ providerId: 1, lastMessageAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
