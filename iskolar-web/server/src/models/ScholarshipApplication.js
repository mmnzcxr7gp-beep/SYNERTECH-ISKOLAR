const mongoose = require('mongoose');

const scholarshipApplicationSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or legacy numeric ID
    },
    scholarshipId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or legacy numeric scholarship ID
      ref: 'Scholarship',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or legacy numeric student ID
      ref: 'Student',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or legacy numeric user ID
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'PENDING_PRE_SCREENING',
        'NEEDS_RESUBMISSION',
        'DOCUMENTS_PENDING',
        'DOCUMENTS_VERIFIED',
        'UNDER_REVIEW',
        'EXAM_SCHEDULED',
        'INTERVIEW_SCHEDULED',
        'WAITLISTED',
        'APPROVED',
        'DENIED',
        'DISQUALIFIED',
        'WITHDRAWN',
        'Pending Review',
        'Approved',
        'Rejected',
      ],
      default: 'SUBMITTED',
      index: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    providerRemarks: {
      type: String,
      default: '',
    },
    decisionReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
    submissionCount: {
      type: Number,
      default: 1,
    },
    lastResubmittedAt: {
      type: Date,
      default: null,
    },
    weightedScore: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: null,
    },
    preScreeningResults: [
      {
        ruleId: String,
        passed: Boolean,
        explanation: String,
      },
    ],
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicationDocument',
      },
    ],
  },
  {
    timestamps: true,
  }
);

scholarshipApplicationSchema.index({ scholarshipId: 1, studentId: 1 });
scholarshipApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ScholarshipApplication', scholarshipApplicationSchema);
