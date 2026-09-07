const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'otp_sent',
        'application_submitted',
        'application_approved',
        'application_rejected',
        'application_denied',
        'application_under_review',
        'application_needs_resubmission',
        'more_information_required',
        'more_information_submitted',
        'resubmission_required',
        'resubmission_submitted',
        'qualified_for_final_review',
        'document_needs_correction',
        'document_verified',
        'document_rejected',
        'exam_scheduled',
        'interview_scheduled',
        'schedule_updated',
        'schedule_cancelled',
        'schedule_acknowledged',
        'approval_acknowledged',
        'new_message',
        'verification_approved',
        'verification_rejected',
        'verification_pending',
        'ACCOUNT_VERIFIED',
        'ACCOUNT_SUSPENDED',
        'ACCOUNT_REJECTED',
        'ACCOUNT_REACTIVATED',
        'ACCOUNT_ARCHIVED',
        'ACCOUNT_RESTORED',
        'ACCOUNT_DELETION_PENDING',
        'ACCOUNT_DELETED',
        'INFORMATION_REQUIRED',
        'transaction_completed',
        'transaction_failed',
        'transaction_created',
        'allowance_approved',
        'deadline_reminder',
        'general',
      ],
      default: 'general',
    },
    read: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
module.exports = Notification;
