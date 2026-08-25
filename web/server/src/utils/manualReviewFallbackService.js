/**
 * ISKOLAR Manual Review Fallback Service
 * 
 * Manages fallback routing, audit history, provider notification,
 * and student messaging whenever OCR or automatic rule evaluations
 * cannot confidently process a document.
 */

const { db } = require('../config/db');

// Configurable confidence threshold (below 70% requires manual review)
const OCR_CONFIDENCE_THRESHOLD = 70;

const FALLBACK_TRIGGER_REASONS = {
  LOW_CONFIDENCE: 'OCR confidence score is below the required 70% certainty threshold.',
  EMPTY_TEXT: 'No legible text could be extracted from the uploaded document.',
  MISSING_REQUIRED_FIELDS: 'Essential document verification fields could not be automatically detected.',
  IMAGE_QUALITY_DEFECT: 'Image appears blurred, rotated, cropped, or contains insufficient contrast.',
  UNSUPPORTED_PDF_ENCODING: 'PDF artifact is readable but text layer is unsupported by automated OCR parser.',
  PROFILE_MISMATCH: 'Document information does not match student profile records.',
  CONFLICTING_DOCUMENTS: 'Conflicting information was detected across submitted document artifacts.',
  DUPLICATE_SUSPECTED: 'Possible duplicate file or identification number detected.',
  AMBIGUOUS_ELIGIBILITY: 'Academic or eligibility data is incomplete or ambiguous.',
  OCR_TIMEOUT: 'Automated OCR processing timed out before completing full extraction.',
  OCR_FAILURE: 'Automated OCR engine encountered an unrecoverable processing error.',
  RULE_CHECKS_FLAGGED: 'Automated rule checking flagged one or more compliance discrepancies.',
  UNCLASSIFIED_PREVIEWABLE: 'File preview is available but automated document classification is uncertain.',
};

/**
 * Evaluates whether an OCR result or document processing requires manual review fallback.
 */
function checkOcrFallbackNeeded({
  rawText = '',
  confidence = 0,
  extractedFields = {},
  documentType = 'unknown',
  ocrError = null,
  isTimeout = false,
}) {
  const issues = [];

  if (ocrError) {
    issues.push(isTimeout ? 'OCR_TIMEOUT' : 'OCR_FAILURE');
  } else if (!rawText || !rawText.trim()) {
    issues.push('EMPTY_TEXT');
  } else if (confidence < OCR_CONFIDENCE_THRESHOLD) {
    issues.push('LOW_CONFIDENCE');
  }

  if (documentType === 'unknown') {
    issues.push('UNCLASSIFIED_PREVIEWABLE');
  }

  const fieldKeys = Object.keys(extractedFields || {});
  if (fieldKeys.length === 0 && !issues.includes('EMPTY_TEXT')) {
    issues.push('MISSING_REQUIRED_FIELDS');
  }

  const needsFallback = issues.length > 0;
  const primaryReasonCode = issues[0] || null;
  const primaryReasonText = primaryReasonCode ? FALLBACK_TRIGGER_REASONS[primaryReasonCode] || primaryReasonCode : null;

  return {
    needsFallback,
    issues,
    primaryReasonCode,
    primaryReasonText,
    reviewStatus: needsFallback ? 'PENDING_MANUAL_REVIEW' : 'OCR_COMPLETED',
    studentNotice: needsFallback
      ? {
          headline: 'Manual Review Required',
          message: 'The system could not confidently verify all information in this document. An authorized scholarship provider will review it manually.',
        }
      : null,
  };
}

/**
 * Records or updates a manual review log entry in MongoDB and in-memory DB.
 */
async function recordManualReviewEntry({
  documentId,
  applicationId,
  studentId,
  reviewStatus = 'PENDING_MANUAL_REVIEW',
  manualReviewReason = '',
  ocrConfidence = 0,
  ocrErrorCode = null,
  failedRuleIds = [],
  studentCorrections = {},
  action = 'SUBMITTED_FOR_REVIEW',
  performedBy = null,
  role = 'system',
  metadata = {},
}) {
  const mongoose = require('mongoose');
  const { ManualReviewLog } = require('../models');

  if (!db.data.manual_review_logs) db.data.manual_review_logs = [];

  const historyEntry = {
    action,
    performedBy,
    role,
    timestamp: new Date(),
    reason: manualReviewReason,
    metadata,
  };

  // 1. Update in-memory state
  let logRecord = db.data.manual_review_logs.find(
    (l) => String(l.documentId) === String(documentId)
  );

  if (logRecord) {
    logRecord.previousStatus = logRecord.reviewStatus;
    logRecord.reviewStatus = reviewStatus;
    logRecord.manualReviewReason = manualReviewReason || logRecord.manualReviewReason;
    logRecord.ocrConfidence = ocrConfidence || logRecord.ocrConfidence;
    logRecord.ocrErrorCode = ocrErrorCode || logRecord.ocrErrorCode;
    logRecord.failedRuleIds = failedRuleIds.length ? failedRuleIds : logRecord.failedRuleIds;
    logRecord.studentCorrections = { ...(logRecord.studentCorrections || {}), ...(studentCorrections || {}) };
    logRecord.updatedAt = new Date().toISOString();
    if (!logRecord.history) logRecord.history = [];
    logRecord.history.push(historyEntry);
  } else {
    logRecord = {
      id: db.data.manual_review_logs.length + 1,
      documentId: String(documentId),
      applicationId: String(applicationId),
      studentId: Number(studentId),
      reviewStatus,
      manualReviewReason,
      ocrConfidence,
      ocrErrorCode,
      failedRuleIds,
      studentCorrections,
      reviewerId: null,
      reviewerRole: null,
      reviewDecision: null,
      reviewReason: '',
      reviewedAt: null,
      previousStatus: 'UPLOADED',
      newStatus: reviewStatus,
      history: [historyEntry],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.data.manual_review_logs.push(logRecord);
  }

  await db.write();

  // 2. Persist to MongoDB
  try {
    if (mongoose.connection.readyState === 1 && ManualReviewLog) {
      await ManualReviewLog.findOneAndUpdate(
        { documentId: String(documentId), applicationId: String(applicationId) },
        {
          $set: {
            studentId: Number(studentId),
            reviewStatus,
            manualReviewReason,
            ocrConfidence,
            ocrErrorCode,
            failedRuleIds,
            studentCorrections,
            previousStatus: logRecord.previousStatus,
            newStatus: reviewStatus,
          },
          $push: { history: historyEntry },
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn('ManualReviewLog Mongo persist warning:', err?.message);
  }

  return logRecord;
}

/**
 * Handles Provider / Admin Review Action (Verify, Request Resubmission, Reject)
 */
async function processProviderReviewAction({
  documentId,
  applicationId,
  reviewerId,
  reviewerRole,
  decision, // 'VERIFIED' | 'NEEDS_RESUBMISSION' | 'REJECTED'
  reason = '',
}) {
  const allowedDecisions = ['VERIFIED', 'NEEDS_RESUBMISSION', 'REJECTED'];
  if (!allowedDecisions.includes(decision)) {
    throw new Error(`Invalid decision "${decision}". Must be one of: ${allowedDecisions.join(', ')}`);
  }

  if ((decision === 'NEEDS_RESUBMISSION' || decision === 'REJECTED') && !reason.trim()) {
    throw new Error(`A specific written reason is required when setting document status to "${decision}".`);
  }

  if (!db.data.manual_review_logs) db.data.manual_review_logs = [];

  let logRecord = db.data.manual_review_logs.find(
    (l) => String(l.documentId) === String(documentId)
  );

  const previousStatus = logRecord ? logRecord.reviewStatus : 'PENDING_MANUAL_REVIEW';
  const newStatus = decision;

  const historyEntry = {
    action: `PROVIDER_${decision}`,
    performedBy: Number(reviewerId),
    role: reviewerRole,
    timestamp: new Date(),
    reason,
    metadata: { previousStatus, newStatus },
  };

  if (logRecord) {
    logRecord.previousStatus = previousStatus;
    logRecord.reviewStatus = newStatus;
    logRecord.reviewerId = Number(reviewerId);
    logRecord.reviewerRole = reviewerRole;
    logRecord.reviewDecision = decision;
    logRecord.reviewReason = reason;
    logRecord.reviewedAt = new Date().toISOString();
    logRecord.updatedAt = new Date().toISOString();
    if (!logRecord.history) logRecord.history = [];
    logRecord.history.push(historyEntry);
  } else {
    logRecord = {
      id: db.data.manual_review_logs.length + 1,
      documentId: String(documentId),
      applicationId: String(applicationId),
      studentId: 0,
      reviewStatus: newStatus,
      manualReviewReason: '',
      ocrConfidence: 0,
      ocrErrorCode: null,
      failedRuleIds: [],
      studentCorrections: {},
      reviewerId: Number(reviewerId),
      reviewerRole,
      reviewDecision: decision,
      reviewReason: reason,
      reviewedAt: new Date().toISOString(),
      previousStatus,
      newStatus,
      history: [historyEntry],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.data.manual_review_logs.push(logRecord);
  }

  await db.write();

  // Also update corresponding document record in db.data.documents if present
  if (db.data.documents) {
    const doc = db.data.documents.find((d) => String(d.id) === String(documentId));
    if (doc) {
      doc.status = newStatus;
      doc.verificationStatus = newStatus;
      doc.reviewed_by = reviewerId;
      doc.review_reason = reason;
      doc.reviewed_at = new Date().toISOString();
    }
  }

  // Update in MongoDB
  const mongoose = require('mongoose');
  const { ManualReviewLog, Document, AuditLog } = require('../models');

  try {
    if (mongoose.connection.readyState === 1) {
      if (ManualReviewLog) {
        await ManualReviewLog.findOneAndUpdate(
          { documentId: String(documentId), applicationId: String(applicationId) },
          {
            $set: {
              reviewStatus: newStatus,
              reviewerId: Number(reviewerId),
              reviewerRole,
              reviewDecision: decision,
              reviewReason: reason,
              reviewedAt: new Date(),
              previousStatus,
              newStatus,
            },
            $push: { history: historyEntry },
          },
          { upsert: true }
        );
      }

      if (AuditLog) {
        await AuditLog.create({
          actorUserId: Number(reviewerId),
          actorRole: reviewerRole,
          action: `DOCUMENT_${decision}`,
          targetType: 'Document',
          targetId: String(documentId),
          beforeSummary: { status: previousStatus },
          afterSummary: { status: newStatus, reason },
          reason,
        });
      }
    }
  } catch (dbErr) {
    console.warn('Process provider review Mongo persistence notice:', dbErr?.message);
  }

  return logRecord;
}

module.exports = {
  OCR_CONFIDENCE_THRESHOLD,
  FALLBACK_TRIGGER_REASONS,
  checkOcrFallbackNeeded,
  recordManualReviewEntry,
  processProviderReviewAction,
};
