const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
    },
    conversationId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['student', 'provider', 'sponsor', 'admin', 'system'],
      required: true,
    },
    messageType: {
      type: String,
      enum: [
        'TEXT',
        'SYSTEM',
        'MORE_INFORMATION_REQUEST',
        'MORE_INFORMATION_RESPONSE',
        'RESUBMISSION_REQUEST',
        'RESUBMISSION_RESPONSE',
        'SCHEDULE',
        'SCHEDULE_ACKNOWLEDGED',
        'APPROVAL_NOTICE',
        'APPROVAL_ACKNOWLEDGED',
        'REJECTION_NOTICE',
        'ATTACHMENT',
      ],
      default: 'TEXT',
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attachmentIds: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    readBy: [
      {
        userId: mongoose.Schema.Types.Mixed,
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'SENT',
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ idempotencyKey: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

module.exports = Message;
