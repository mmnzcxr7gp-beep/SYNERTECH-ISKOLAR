const express = require('express');
const path = require('path');
const { db } = require('../config/db');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isOwnedBy } = require('../utils/ownership');
const storageService = require('../utils/storageService');

const router = express.Router();

/**
 * Helper to sanitize filename/identifier and prevent path traversal
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return null;

  let decoded = filename;
  try {
    let prev = '';
    while (decoded !== prev && decoded.includes('%')) {
      prev = decoded;
      decoded = decodeURIComponent(decoded);
    }
  } catch (_) {}

  if (
    decoded.includes('..') ||
    decoded.includes('\0') ||
    decoded.startsWith('~') ||
    decoded.startsWith('/') ||
    decoded.startsWith('\\') ||
    path.isAbsolute(decoded)
  ) {
    return null;
  }

  return decoded.replace(/\\/g, '/');
};

/**
 * GET /api/documents/:id/download or GET /uploads/:filename
 * Secure document retrieval with object-level authorization (student owner, assigned provider, admin)
 */
const handleDocumentDownload = async (req, res, next) => {
  try {
    const docIdOrFilename = req.params.id || req.params.filename || req.query.key;

    // 1. Parameter Validation
    const cleanIdentifier = sanitizeFilename(docIdOrFilename);
    if (!cleanIdentifier) {
      return res.status(400).json({ message: 'Invalid or malformed document identifier' });
    }

    // 2. Authentication Check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // 3. Document Metadata Lookup (Authoritative scoped MongoDB query first)
    const docIdStr = String(cleanIdentifier);
    let doc = null;

    if (db.collections?.documents) {
      const numDocId = Number(docIdStr);
      const mDoc = await db.collections.documents.findOne({
        $or: [
          { id: docIdStr },
          ...(!Number.isNaN(numDocId) ? [{ id: numDocId }] : []),
          { _id: docIdStr },
          { documentId: docIdStr },
          { storedKey: cleanIdentifier },
          { filename: cleanIdentifier },
          { originalname: cleanIdentifier },
        ],
      }).catch(() => null);
      if (mDoc) {
        doc = {
          ...mDoc,
          id: mDoc.id || mDoc.documentId || mDoc._id,
          user_id: mDoc.user_id || mDoc.userId || mDoc.studentId || mDoc.applicantId,
          application_id: mDoc.application_id || mDoc.applicationId,
        };
      }
    }

    if (!doc) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        try {
          const { Document } = require('../models');
          if (Document) {
            const mDoc = await Document.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(docIdStr) ? docIdStr : null },
                { documentId: docIdStr },
                { storedKey: cleanIdentifier },
                { originalName: cleanIdentifier },
              ].filter(Boolean),
            }).lean();

            if (mDoc) {
              doc = {
                id: mDoc.documentId || mDoc._id.toString(),
                user_id: mDoc.studentId || mDoc.applicantId,
                storedKey: mDoc.storedKey,
                filename: mDoc.originalName || path.basename(mDoc.storedKey),
                originalname: mDoc.originalName,
                mime_type: mDoc.mimeType,
                size: mDoc.size,
                application_id: mDoc.applicationId,
              };
            }
          }
        } catch (_) {}
      }
    }

    if (!doc && db.data?.documents) {
      doc = (db.data.documents || []).find(
        (d) =>
          String(d.id) === docIdStr ||
          d.filename === cleanIdentifier ||
          d.originalname === cleanIdentifier ||
          d.storedKey === cleanIdentifier ||
          (d.path && d.path.endsWith(cleanIdentifier))
      );
    }

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // 4. Object-Level Authorization Check
    const userRole = (req.user.role || '').toLowerCase();
    const userIdStr = String(req.user.id);
    const docUserIdStr = String(doc.user_id || doc.userId || doc.studentId || doc.student_id || doc.applicantId || '');

    let isAuthorized = false;

    if (userRole === 'admin') {
      isAuthorized = true;
      // Record immutable audit event for administrator document access
      try {
        if (!db.data.audit_logs) db.data.audit_logs = [];
        db.data.audit_logs.push({
          id: db.data.audit_logs.length + 1,
          actorUserId: req.user.id,
          actorRole: 'admin',
          action: 'ADMIN_FILE_ACCESS',
          targetType: 'Document',
          targetId: String(doc.id || doc.documentId || cleanIdentifier),
          details: {
            documentId: String(doc.id || doc.documentId || cleanIdentifier),
            applicationId: doc.application_id || doc.applicationId,
            studentId: doc.user_id || doc.studentId,
            filename: doc.originalname || doc.filename || cleanIdentifier,
          },
          ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
          timestamp: new Date().toISOString(),
        });
        if (typeof db.write === 'function') await db.write();

        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          const { AuditLog } = require('../models');
          if (AuditLog) {
            await AuditLog.create({
              actorUserId: req.user.id,
              actorRole: 'admin',
              action: 'ADMIN_FILE_ACCESS',
              targetType: 'Document',
              targetId: String(doc.id || doc.documentId || cleanIdentifier),
              afterSummary: {
                documentId: String(doc.id || doc.documentId || cleanIdentifier),
                applicationId: doc.application_id || doc.applicationId,
                studentId: doc.user_id || doc.studentId,
                filename: doc.originalname || doc.filename || cleanIdentifier,
              },
              ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
              userAgent: req.headers['user-agent'] || '',
            }).catch(() => {});
          }
        }
      } catch (auditErr) {
        console.warn('Admin document access audit logging notice:', auditErr?.message);
      }
    } else if (userRole === 'student' || userRole === 'applicant') {
      isAuthorized = docUserIdStr === userIdStr;
    } else if (userRole === 'provider' || userRole === 'sponsor') {
      if (doc.application_id) {
        let app = null;
        if (db.collections?.applications) {
          app = await db.collections.applications.findOne({
            $or: [{ id: doc.application_id }, { id: Number(doc.application_id) }, { _id: doc.application_id }],
          }).catch(() => null);
        }
        if (!app) {
          app = (db.data.applications || []).find((a) => String(a.id) === String(doc.application_id));
        }
        if (app) {
          const sId = app.scholarship_id || app.scholarshipId;
          let scholarship = null;
          if (db.collections?.scholarships) {
            scholarship = await db.collections.scholarships.findOne({
              $or: [{ id: sId }, { id: Number(sId) }, { _id: sId }],
            }).catch(() => null);
          }
          if (!scholarship) {
            scholarship = (db.data.scholarships || []).find((s) => String(s.id) === String(sId));
          }
          if (scholarship && isOwnedBy(scholarship, req.user.id)) {
            isAuthorized = true;
          }
        }
      }
      if (docUserIdStr === userIdStr) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this document' });
    }

    // 5. Secure Retrieval Through StorageService (Phase 1 & Phase 10)
    const storedTarget = doc.storedKey || doc.filename || doc.path;
    let fileResult;
    try {
      fileResult = await storageService.downloadFile(storedTarget);
    } catch (err) {
      return res.status(404).json({ message: 'Physical file not found in storage' });
    }

    const mimeType = doc.mime_type || doc.mimeType || fileResult.mimeType || 'application/octet-stream';
    const downloadName = doc.originalname || doc.filename || path.basename(storedTarget);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    if (fileResult.size) {
      res.setHeader('Content-Length', fileResult.size);
    }

    if (fileResult.buffer) {
      return res.send(fileResult.buffer);
    } else if (fileResult.stream && typeof fileResult.stream.pipe === 'function') {
      return fileResult.stream.pipe(res);
    } else {
      return res.status(500).json({ message: 'Could not stream document content' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/manual-review
 * Retrieves complete manual review workspace data for provider/admin inspection or student status tracking
 */
const getManualReviewData = async (req, res, next) => {
  try {
    const docId = req.params.id;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let doc = null;
    if (db.collections?.documents) {
      const numDocId = Number(docId);
      doc = await db.collections.documents.findOne({
        $or: [
          { id: docId },
          ...(!Number.isNaN(numDocId) ? [{ id: numDocId }] : []),
          { _id: docId },
          { documentId: docId },
        ],
      }).catch(() => null);
    }
    if (!doc) {
      doc = (db.data.documents || []).find((d) => String(d.id) === String(docId));
    }
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Object-Level Authorization Check
    const userRole = (req.user.role || '').toLowerCase();
    const userIdStr = String(req.user.id);
    const docUserIdStr = String(doc.user_id || doc.userId || doc.studentId || doc.student_id || doc.applicantId || '');

    let isAuthorized = false;
    if (userRole === 'admin') {
      isAuthorized = true;
    } else if (userRole === 'student' || userRole === 'applicant') {
      isAuthorized = docUserIdStr === userIdStr;
    } else if (userRole === 'provider' || userRole === 'sponsor') {
      if (doc.application_id) {
        let app = null;
        if (db.collections?.applications) {
          app = await db.collections.applications.findOne({
            $or: [{ id: doc.application_id }, { id: Number(doc.application_id) }, { _id: doc.application_id }],
          }).catch(() => null);
        }
        if (!app) {
          app = (db.data.applications || []).find((a) => String(a.id) === String(doc.application_id));
        }
        if (app) {
          const sId = app.scholarship_id || app.scholarshipId;
          let scholarship = null;
          if (db.collections?.scholarships) {
            scholarship = await db.collections.scholarships.findOne({
              $or: [{ id: sId }, { id: Number(sId) }, { _id: sId }],
            }).catch(() => null);
          }
          if (!scholarship) {
            scholarship = (db.data.scholarships || []).find((s) => String(s.id) === String(sId));
          }
          if (scholarship && isOwnedBy(scholarship, req.user.id)) {
            isAuthorized = true;
          }
        }
      }
      if (docUserIdStr === userIdStr) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to view review data for this document' });
    }

    // Retrieve OCR extraction details
    let ocrExtraction = null;
    let reviewLog = null;
    let checkResults = [];
    if (db.collections?.ocr_extractions) {
      ocrExtraction = await db.collections.ocr_extractions.findOne({ documentId: String(docId) }).catch(() => null);
    }
    if (!ocrExtraction) {
      ocrExtraction = (db.data.ocr_extractions || []).find((o) => String(o.documentId) === String(docId)) || {};
    }
    if (db.collections?.manual_review_logs) {
      reviewLog = await db.collections.manual_review_logs.findOne({ documentId: String(docId) }).catch(() => null);
    }
    if (!reviewLog) {
      reviewLog = (db.data.manual_review_logs || []).find((l) => String(l.documentId) === String(docId)) || {};
    }
    if (db.collections?.automatic_check_results) {
      checkResults = await db.collections.automatic_check_results.find({
        $or: [{ applicationId: String(doc.application_id) }, { applicationId: doc.application_id }],
      }).toArray().catch(() => []);
    }
    if (!checkResults || checkResults.length === 0) {
      checkResults = (db.data.automatic_check_results || []).filter((c) => String(c.applicationId) === String(doc.application_id));
    }

    const isStudent = userRole === 'student' || userRole === 'applicant';

    const responsePayload = {
      documentId: doc.id,
      applicationId: doc.application_id || reviewLog.applicationId,
      studentId: doc.user_id,
      fileName: doc.originalname || doc.filename,
      fileUrl: `/api/documents/${doc.id}/download`,
      fileSize: doc.size || doc.file_size,
      mimeType: doc.mime_type,
      version: doc.version || 1,
      uploadedAt: doc.created_at || doc.uploadedAt,
      reviewStatus: reviewLog.reviewStatus || doc.status || 'PENDING_MANUAL_REVIEW',
      manualReviewReason: reviewLog.manualReviewReason || 'Automated checks require manual provider verification.',
      providerReason: reviewLog.reviewReason || doc.review_reason || '',
      studentCorrections: reviewLog.studentCorrections || {},
      previousVersions: doc.previous_versions || doc.previousVersions || [],
      history: reviewLog.history || [],
      studentNotice: {
        headline: 'Manual Review Required',
        message: 'The system could not confidently verify all information in this document. An authorized scholarship provider will review it manually.',
      },
    };

    // Provider / Admin extended workspace view
    if (!isStudent) {
      responsePayload.ocrRawText = ocrExtraction.rawText || doc.ocrRawText || '';
      responsePayload.extractedFields = ocrExtraction.extractedFields || doc.extractedFields || {};
      responsePayload.ocrConfidence = reviewLog.ocrConfidence || ocrExtraction.confidenceScore || 0;
      responsePayload.ocrErrorCode = reviewLog.ocrErrorCode || null;
      responsePayload.failedRuleIds = reviewLog.failedRuleIds || [];
      responsePayload.mismatchedValues = ocrExtraction.mismatches || [];
      responsePayload.failedChecks = checkResults.filter((r) => !r.passed);
      responsePayload.allRuleChecks = checkResults;
      responsePayload.reviewerId = reviewLog.reviewerId;
      responsePayload.reviewerRole = reviewLog.reviewerRole;
      responsePayload.reviewedAt = reviewLog.reviewedAt;
    }

    return res.json(responsePayload);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/review-action
 * Provider or Admin sets VERIFIED, NEEDS_RESUBMISSION, or REJECTED with mandatory reason
 */
const submitReviewAction = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const { action, decision, reason } = req.body;
    const finalDecision = (decision || action || '').toUpperCase();

    const doc = (db.data.documents || []).find((d) => String(d.id) === String(docId));
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Ownership verification for provider
    if (req.user.role === 'provider' || req.user.role === 'sponsor') {
      let isOwner = false;
      if (doc.application_id) {
        const app = (db.data.applications || []).find((a) => String(a.id) === String(doc.application_id));
        if (app) {
          const scholarship = (db.data.scholarships || []).find((s) => String(s.id) === String(app.scholarship_id));
          if (scholarship && isOwnedBy(scholarship, req.user.id)) isOwner = true;
        }
      }
      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You do not own the scholarship associated with this document' });
      }
    }

    const allowed = ['VERIFIED', 'NEEDS_RESUBMISSION', 'REJECTED'];
    if (!allowed.includes(finalDecision)) {
      return res.status(400).json({ message: `Invalid review action "${finalDecision}". Must be VERIFIED, NEEDS_RESUBMISSION, or REJECTED.` });
    }

    const effectiveReason = (reason && reason.trim()) ? reason.trim() : (finalDecision === 'VERIFIED' ? 'Verified during manual review' : '');
    if (!effectiveReason) {
      return res.status(400).json({ message: `A written reason is required when recording a human review decision (${finalDecision}).` });
    }

    const humanVerificationStatus = finalDecision === 'VERIFIED' ? 'VERIFIED_BY_HUMAN' : finalDecision === 'REJECTED' ? 'REJECTED_BY_HUMAN' : 'PENDING_HUMAN_REVIEW';
    const humanManualReviewStatus = (finalDecision === 'VERIFIED' || finalDecision === 'REJECTED') ? 'COMPLETED' : 'PENDING';

    doc.status = finalDecision;
    doc.verificationStatus = humanVerificationStatus;
    doc.manualReviewStatus = humanManualReviewStatus;
    doc.reviewed_by = req.user.id;
    doc.review_reason = reason || '';
    doc.reviewed_at = new Date().toISOString();
    doc.verifiedByHuman = {
      reviewerId: req.user.id,
      reviewerRole: req.user.role,
      reviewedAt: new Date(),
      reason: reason || '',
    };

    const fallbackService = require('../utils/manualReviewFallbackService');
    const updatedLog = await fallbackService.processProviderReviewAction({
      documentId: docId,
      applicationId: doc.application_id || 'unknown',
      reviewerId: req.user.id,
      reviewerRole: req.user.role,
      decision: finalDecision,
      reason: reason || '',
    });

    if (!db.data.audit_logs) db.data.audit_logs = [];
    db.data.audit_logs.push({
      id: db.data.audit_logs.length + 1,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: `DOCUMENT_${finalDecision}`,
      targetType: 'Document',
      targetId: String(docId),
      timestamp: new Date().toISOString(),
      beforeSummary: { status: doc.status },
      afterSummary: { status: finalDecision, verificationStatus: humanVerificationStatus, reason },
      reason: reason || '',
    });

    return res.json({
      message: `Document successfully marked as ${finalDecision}`,
      documentId: docId,
      status: finalDecision,
      document: doc,
      reviewLog: updatedLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/resubmit
 * Student uploads a replacement document, strictly through StorageService with Versioning
 */
const resubmitDocument = async (req, res, next) => {
  try {
    const docId = req.params.id;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const doc = (db.data.documents || []).find((d) => String(d.id) === String(docId));
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const docOwnerId = doc.user_id || doc.userId || doc.studentId || doc.student_id || doc.applicantId;
    if (String(docOwnerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this document' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No replacement file uploaded' });
    }

    // Read buffer from multer
    const fileBuffer = req.file.buffer || (req.file.path ? await require('fs').promises.readFile(req.file.path) : null);
    if (!fileBuffer) {
      return res.status(400).json({ message: 'Invalid or empty replacement file' });
    }

    const currentVersion = doc.version || 1;
    const oldStoredKey = doc.storedKey || doc.filename || doc.path;

    // Preserve previous file in previous_versions array (Phase 7 Versioning)
    if (!doc.previous_versions) doc.previous_versions = [];
    doc.previous_versions.push({
      version: currentVersion,
      storedKey: oldStoredKey,
      filename: doc.filename,
      originalname: doc.originalname,
      size: doc.size || doc.file_size,
      mime_type: doc.mime_type,
      fileHash: doc.fileHash || '',
      replaced_at: new Date().toISOString(),
      reason_for_replacement: doc.review_reason || 'Resubmission requested',
    });

    // Upload new version through unified StorageService
    const uploadResult = await storageService.uploadFile({
      buffer: fileBuffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      applicationId: doc.application_id || 'general',
      studentId: req.user.id,
    });

    // Update document record to new version
    doc.version = currentVersion + 1;
    doc.storedKey = uploadResult.storedKey;
    doc.storageDriver = uploadResult.storageDriver;
    doc.fileHash = uploadResult.fileHash;
    doc.filename = uploadResult.storedKey;
    doc.originalname = req.file.originalname;
    doc.size = uploadResult.size;
    doc.file_size = uploadResult.size;
    doc.mime_type = uploadResult.mimeType;
    doc.status = 'PENDING_MANUAL_REVIEW';
    doc.verificationStatus = 'PENDING_MANUAL_REVIEW';
    doc.uploadedAt = uploadResult.uploadedAt;

    const fallbackService = require('../utils/manualReviewFallbackService');
    await fallbackService.recordManualReviewEntry({
      documentId: docId,
      applicationId: doc.application_id || 'unknown',
      studentId: req.user.id,
      reviewStatus: 'PENDING_MANUAL_REVIEW',
      manualReviewReason: 'Student uploaded replacement document (v' + doc.version + '). Ready for provider review.',
      action: 'STUDENT_RESUBMITTED_REPLACEMENT',
      performedBy: req.user.id,
      role: 'student',
      metadata: {
        version: doc.version,
        storedKey: doc.storedKey,
        originalFilename: req.file.originalname,
        size: uploadResult.size,
      },
    });

    await db.write();

    return res.json({
      message: 'Replacement document uploaded successfully. Returned to manual review.',
      document: doc,
      version: doc.version,
      status: 'PENDING_MANUAL_REVIEW',
    });
  } catch (error) {
    next(error);
  }
};

const multer = require('multer');
// Use memory storage so file buffer is directly processed by StorageService
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const { roleMiddleware } = require('../middleware/roleMiddleware');
const sponsorVerification = require('../middleware/sponsorVerification');

/**
 * GET /api/documents
 * List documents in verification queue for authorized Provider, Sponsor, or Admin
 */
const getDocumentsQueue = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    let docs = [];
    if (db.collections?.documents) {
      if (req.user.role === 'provider' || req.user.role === 'sponsor') {
        let myScholarshipIds = [];
        if (db.collections?.scholarships) {
          const sList = await db.collections.scholarships.find({
            $or: [
              { sponsor_id: req.user.id },
              { sponsor_id: Number(req.user.id) },
              { sponsor_id: String(req.user.id) },
              { providerId: req.user.id },
              { providerId: String(req.user.id) },
              { provider_id: req.user.id },
              { provider_id: String(req.user.id) },
            ],
          }, { projection: { id: 1, _id: 1 } }).toArray().catch(() => []);
          myScholarshipIds = sList.flatMap(s => [s.id, s._id, String(s.id), String(s._id)]).filter(Boolean);
        }
        let myAppIds = [];
        if (db.collections?.applications && myScholarshipIds.length > 0) {
          const aList = await db.collections.applications.find({
            $or: [
              { scholarship_id: { $in: myScholarshipIds } },
              { scholarshipId: { $in: myScholarshipIds } },
            ],
          }, { projection: { id: 1, _id: 1 } }).toArray().catch(() => []);
          myAppIds = aList.flatMap(a => [a.id, a._id, String(a.id), String(a._id)]).filter(Boolean);
        }
        docs = await db.collections.documents.find({
          $or: [
            { providerId: req.user.id },
            { providerId: String(req.user.id) },
            ...(myAppIds.length > 0 ? [
              { application_id: { $in: myAppIds } },
              { applicationId: { $in: myAppIds } },
            ] : []),
          ],
        }).toArray().catch(() => []);
      } else if (req.user.role === 'admin') {
        docs = await db.collections.documents.find({}).toArray().catch(() => []);
      } else {
        docs = await db.collections.documents.find({
          $or: [
            { user_id: req.user.id },
            { user_id: Number(req.user.id) },
            { user_id: String(req.user.id) },
            { studentId: req.user.id },
            { studentId: String(req.user.id) },
          ],
        }).toArray().catch(() => []);
      }
    } else {
      docs = db.data.documents || [];
      if (req.user.role === 'provider' || req.user.role === 'sponsor') {
        const myScholarshipIds = (db.data.scholarships || [])
          .filter(s => String(s.sponsor_id) === String(req.user.id) || String(s.providerId) === String(req.user.id))
          .map(s => s.id);
        
        const myAppIds = (db.data.applications || [])
          .filter(a => myScholarshipIds.includes(a.scholarship_id))
          .map(a => a.id);

        docs = docs.filter(d => String(d.providerId) === String(req.user.id) || myAppIds.includes(d.application_id));
      } else if (req.user.role !== 'admin') {
        docs = docs.filter(d => String(d.user_id) === String(req.user.id) || String(d.studentId) === String(req.user.id));
      }
    }

    return res.json({ documents: docs, count: docs.length });
  } catch (err) {
    next(err);
  }
};

// Route definitions
router.get('/', authMiddleware, getDocumentsQueue);
router.get('/:id/download', authMiddleware, handleDocumentDownload);
router.get('/file/:filename', authMiddleware, handleDocumentDownload);
router.get('/:id/manual-review', authMiddleware, getManualReviewData);
router.post(
  '/:id/review-action',
  authMiddleware,
  roleMiddleware(['sponsor', 'provider', 'admin']),
  sponsorVerification,
  submitReviewAction
);
const resubmitUpload = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router.post(
  '/:id/resubmit',
  authMiddleware,
  roleMiddleware(['student']),
  resubmitUpload,
  (req, res, next) => {
    if (!req.file && req.files) {
      req.file = req.files?.document?.[0] || req.files?.file?.[0];
    }
    next();
  },
  resubmitDocument
);

module.exports = {
  router,
  handleDocumentDownload,
  sanitizeFilename,
  getManualReviewData,
  submitReviewAction,
  resubmitDocument,
  getDocumentsQueue,
};
