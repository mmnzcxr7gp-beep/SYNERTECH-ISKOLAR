const mongoose = require('mongoose');

const scholarshipApplicationSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or legacy numeric ID
    },
    id: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    scholarshipId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or legacy numeric scholarship ID
      ref: 'Scholarship',
      required: true,
      index: true,
    },
    scholarship_id: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or legacy numeric student ID
      ref: 'Student',
      required: true,
      index: true,
    },
    student_id: {
      type: mongoose.Schema.Types.Mixed,
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
        'UNDER_AUTOMATIC_CHECK',
        'PENDING_HUMAN_REVIEW',
        'PENDING_MANUAL_REVIEW',
        'MORE_INFORMATION_REQUIRED',
        'RESUBMISSION_REQUIRED',
        'INTERVIEW_SCHEDULED',
        'EXAMINATION_SCHEDULED',
        'QUALIFIED_FOR_FINAL_REVIEW',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
        'CLOSED',
        // Legacy synonyms
        'PENDING_PRE_SCREENING',
        'NEEDS_RESUBMISSION',
        'DOCUMENTS_PENDING',
        'DOCUMENTS_VERIFIED',
        'UNDER_REVIEW',
        'EXAM_SCHEDULED',
        'WAITLISTED',
        'DENIED',
        'DISQUALIFIED',
        'WITHDRAWN',
        'Pending Review',
        'Approved',
        'Rejected',
        'pending',
        'approved',
        'rejected',
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
    timeline: [
      {
        event: { type: String, required: true },
        fromStatus: String,
        toStatus: String,
        actorId: mongoose.Schema.Types.Mixed,
        actorRole: String,
        reason: String,
        notes: String,
        metadata: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    moreInformationRequest: {
      title: String,
      instructions: String,
      requiredResponse: String,
      optionalDocumentType: String,
      dueDate: Date,
      priority: { type: String, default: 'NORMAL' },
      uploadRequired: { type: Boolean, default: false },
      requestedAt: Date,
      requestedBy: mongoose.Schema.Types.Mixed,
      studentResponse: String,
      studentAttachmentUrl: String,
      respondedAt: Date,
    },
    resubmissionRequest: {
      documentId: mongoose.Schema.Types.Mixed,
      documentType: String,
      reason: String,
      instructions: String,
      requestedAt: Date,
      requestedBy: mongoose.Schema.Types.Mixed,
      replacementDocumentId: mongoose.Schema.Types.Mixed,
      replacementFileUrl: String,
      studentNotes: String,
      resubmittedAt: Date,
    },
    approvalData: {
      approvalNote: String,
      effectiveDate: Date,
      scholarshipInstructions: String,
      acceptanceDeadline: Date,
      contactInstructions: String,
      nextStepChecklist: [String],
      approvedAt: Date,
      approvedBy: mongoose.Schema.Types.Mixed,
      acknowledgedByStudent: { type: Boolean, default: false },
      acknowledgedAt: Date,
    },
    scheduleData: {
      scheduleId: mongoose.Schema.Types.Mixed,
      type: { type: String },
      title: String,
      date: Date,
      time: String,
      endTime: String,
      timezone: { type: String, default: 'Asia/Manila' },
      location: String,
      meetingLink: String,
      instructions: String,
      requiredMaterials: String,
      contactPerson: String,
      acknowledgedByStudent: { type: Boolean, default: false },
      acknowledgedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

scholarshipApplicationSchema.pre('save', function (next) {
  if (this.scholarshipId && !this.scholarship_id) this.scholarship_id = this.scholarshipId;
  if (this.scholarship_id && !this.scholarshipId) this.scholarshipId = this.scholarship_id;
  if (this.studentId && !this.student_id) this.student_id = this.studentId;
  if (this.student_id && !this.studentId) this.studentId = this.student_id;
  if (this._id && !this.id) this.id = this._id;
  if (this.id && !this._id) this._id = this.id;
  next();
});

scholarshipApplicationSchema.index({ scholarshipId: 1, studentId: 1 }, { unique: true });
scholarshipApplicationSchema.index({ scholarship_id: 1, student_id: 1 }, { unique: true, sparse: true });
scholarshipApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ScholarshipApplication', scholarshipApplicationSchema, 'applications');
