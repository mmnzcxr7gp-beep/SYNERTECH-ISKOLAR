const path = require('path');
const fs = require('fs');
const storageService = require('../utils/storageService');

/* ================= FIELD PATTERNS ================= */
const fieldPatterns = {
  // Government ID patterns
  fullName: [
    /(?:name|nombre|pangalan)\s*[:\-]?\s*(.+)/i,
    /(?:last\s*name|surname)\s*[:\-]?\s*(.+)/i,
    /(?:first\s*name|given\s*name)\s*[:\-]?\s*(.+)/i,
  ],
  idNumber: [
    /(?:student\s*(?:no|number|#))\b\s*[:\-]?\s*([\w\-]+)/i,
    /(?:id\s*(?:no|number|#))\b\s*[:\-]?\s*([\w\-]+)/i,
    /(?:lrn\s*(?:no|number|#)?)\b\s*[:\-]?\s*([\w\-]+)/i,
    /(?:license\s*no|card\s*no)\b\s*[:\-]?\s*([\w\-]+)/i,
    /(?:CRN|TIN|SSS|GSIS|PhilHealth)\b\s*[:\-]?\s*([\d\-]+)/i,
  ],
  dateOfBirth: [
    /(?:date\s*of\s*birth|birthday|born|DOB)\s*[:\-]?\s*(\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2})/i,
    /(?:date\s*of\s*birth|birthday|born|DOB)\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/i,
    /(?:date\s*of\s*birth|birthday|born|DOB)\s*[:\-]?\s*(\w+\s+\d{1,2},?\s*\d{4})/i,
  ],
  expirationDate: [
    /(?:expir(?:y|ation)\s*(?:date)?|valid\s*(?:until|thru))\s*[:\-]?\s*(\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2})/i,
    /(?:expir(?:y|ation)\s*(?:date)?|valid\s*(?:until|thru))\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/i,
    /(?:expir(?:y|ation)\s*(?:date)?|valid\s*(?:until|thru))\s*[:\-]?\s*(\w+\s+\d{1,2},?\s*\d{4})/i,
  ],
  sex: [
    /(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)/i,
  ],
  birthplace: [
    /(?:place\s*of\s*birth|birthplace|born\s*in)\s*[:\-]?\s*(.+)/i,
  ],
  address: [
    /(?:address|residence|tirahan)\s*[:\-]?\s*(.+)/i,
  ],
  // Birth certificate specific
  fatherName: [
    /(?:father|ama)\s*(?:'?s?\s*name)?\s*[:\-]?\s*(.+)/i,
  ],
  motherName: [
    /(?:mother|ina)\s*(?:'?s?\s*name)?\s*[:\-]?\s*(.+)/i,
  ],
};

/* ================= EXTRACT FIELDS ================= */
const extractFields = (text) => {
  const fields = {};

  for (const [fieldName, patterns] of Object.entries(fieldPatterns)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields[fieldName] = match[1].trim();
        break;
      }
    }
  }

  return fields;
};

/* ================= DETECT DOCUMENT TYPE ================= */
const detectDocumentType = (text) => {
  const lower = text.toLowerCase();

  if (lower.includes('certificate of live birth') || lower.includes('birth certificate') || lower.includes('civil registrar')) {
    return 'birth_certificate';
  }
  if (lower.includes('driver') && lower.includes('license')) return 'drivers_license';
  if (lower.includes('passport')) return 'passport';
  if (lower.includes('philhealth')) return 'philhealth_id';
  if (lower.includes('postal') && lower.includes('id')) return 'postal_id';
  if (lower.includes('voter') || lower.includes('comelec')) return 'voters_id';
  if (lower.includes('sss')) return 'sss_id';
  if (lower.includes('unified') && lower.includes('multi-purpose')) return 'umid';
  if (lower.includes('national id') || lower.includes('philsys')) return 'national_id';
  if (lower.includes('student') || lower.includes('school') || lower.includes('university')) return 'school_id';
  if (lower.includes('certificate of registration') || lower.includes('cor')) return 'certificate_of_registration';

  return 'unknown';
};

/* ================= OCR EXTRACT ================= */
const extractFromDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document image uploaded' });
    }

    const fileBuffer = req.file.buffer || (req.file.path && fs.existsSync(req.file.path) ? fs.readFileSync(req.file.path) : null);
    const filePath = req.file.path;
    const ocrInput = fileBuffer || filePath;

    let rawText = '';
    let confidence = 0;

    try {
      // Phase 4 & 5: OCR with timeout protection (30s max)
      const { withTimeout } = require('../utils/resilience');
      const Tesseract = require('tesseract.js');

      const result = await withTimeout(
        () => Tesseract.recognize(ocrInput, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        }),
        30000, // 30 second timeout
        'OCR processing'
      );

      rawText = result.data.text;
      confidence = result.data.confidence;
    } catch (ocrError) {
      console.error('Tesseract.js OCR failed:', ocrError?.message);
      // Fallback: return empty results so the user can still manually enter data
      return res.json({
        rawText: '',
        extractedFields: {},
        documentType: 'unknown',
        confidence: 0,
        message: ocrError?.message?.includes('timed out')
          ? 'OCR processing timed out. Please try a smaller or clearer image, or enter information manually.'
          : 'OCR processing failed. Please enter information manually.',
        filePath: `/uploads/${path.basename(filePath || 'document.png')}`,
      });
    }

    const fallbackService = require('../utils/manualReviewFallbackService');
    const extractedFields = extractFields(rawText);
    const documentType = detectDocumentType(rawText);
    const roundedConfidence = Math.round(confidence);

    const fallbackCheck = fallbackService.checkOcrFallbackNeeded({
      rawText,
      confidence: roundedConfidence,
      extractedFields,
      documentType,
      ocrError: null,
    });

    const studentNotice = fallbackCheck.needsFallback
      ? fallbackCheck.studentNotice
      : null;

    return res.json({
      rawText,
      extractedFields,
      documentType,
      confidence: roundedConfidence,
      reviewStatus: fallbackCheck.reviewStatus,
      fallbackTriggered: fallbackCheck.needsFallback,
      manualReviewReason: fallbackCheck.primaryReasonText,
      studentNotice,
      message: fallbackCheck.needsFallback
        ? 'Manual Review Required: The system could not confidently verify all information in this document. An authorized scholarship provider will review it manually.'
        : 'Document processed successfully. Please review and confirm the extracted information.',
      filePath: `/uploads/${path.basename(filePath || 'document.png')}`,
    });
  } catch (err) {
    next(err);
  }
};

/* ================= VERIFY DOCUMENT DATA ================= */
const verifyDocumentData = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const { db } = require('../config/db');

    const user = db.data.users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { extractedFields, documentId } = req.body;
    if (!extractedFields) return res.status(400).json({ message: 'No extracted fields provided' });

    const mismatches = [];
    const matches = [];
    const warnings = [];
    const flags = [];

    // ── Layer 1: Name Cross-Check ──
    const userName = (user.name || '').toLowerCase().trim();
    const extractedName = (extractedFields.fullName || '').toLowerCase().trim();

    if (extractedName && userName) {
      const nameWords = userName.split(/\s+/);
      const extractedWords = extractedName.split(/\s+/);
      const matchCount = nameWords.filter((w) => extractedWords.includes(w)).length;

      if (matchCount === 0) {
        mismatches.push({
          field: 'fullName',
          profile: user.name,
          document: extractedFields.fullName,
          severity: 'high',
        });
        flags.push('NAME_MISMATCH');
      } else if (matchCount < nameWords.length) {
        warnings.push({
          field: 'fullName',
          message: 'Partial name match — please verify',
          profile: user.name,
          document: extractedFields.fullName,
          severity: 'medium',
        });
      } else {
        matches.push({ field: 'fullName', value: extractedFields.fullName });
      }
    }

    // ── Layer 2: Date of Birth Cross-Check ──
    if (extractedFields.dateOfBirth) {
      // Compare against stored DOB (if available in student profile)
      const studentProfile = db.data.student_profiles
        ? db.data.student_profiles.find((p) => String(p.user_id) === String(userId))
        : null;
      const storedDOB = user.dateOfBirth || (studentProfile && studentProfile.dateOfBirth);

      if (storedDOB) {
        const normalizeDate = (d) => {
          try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
        };
        const extractedDOB = normalizeDate(extractedFields.dateOfBirth);
        const profileDOB = normalizeDate(storedDOB);

        if (extractedDOB && profileDOB && extractedDOB !== profileDOB) {
          mismatches.push({
            field: 'dateOfBirth',
            profile: storedDOB,
            document: extractedFields.dateOfBirth,
            severity: 'high',
          });
          flags.push('DOB_MISMATCH');
        } else if (extractedDOB && profileDOB) {
          matches.push({ field: 'dateOfBirth', value: extractedFields.dateOfBirth });
        }
      }
    }

    // ── Layer 3: ID Number Duplicate Detection ──
    if (extractedFields.idNumber) {
      const normalizedId = extractedFields.idNumber.replace(/[\s\-]/g, '').toLowerCase();

      // Check if this ID number belongs to another user
      if (!db.data.documents) db.data.documents = [];
      const existingDocWithSameId = db.data.documents.find((doc) => {
        if (String(doc.user_id) === String(userId)) return false; // Skip own docs
        const docIdNum = (doc.extractedIdNumber || '').replace(/[\s\-]/g, '').toLowerCase();
        return docIdNum && docIdNum === normalizedId;
      });

      if (existingDocWithSameId) {
        mismatches.push({
          field: 'idNumber',
          profile: 'N/A',
          document: extractedFields.idNumber,
          severity: 'critical',
          reason: 'This ID number is already associated with another account.',
        });
        flags.push('DUPLICATE_ID_NUMBER');
      } else {
        matches.push({ field: 'idNumber', value: extractedFields.idNumber });
      }

      // Store the extracted ID number on the document record for future cross-checks
      if (documentId) {
        const docRecord = db.data.documents.find((d) => String(d.id) === String(documentId));
        if (docRecord) {
          docRecord.extractedIdNumber = extractedFields.idNumber;
        }
      }
    }

    // ── Layer 4: Expiration Validation ──
    if (extractedFields.expirationDate) {
      try {
        const expiry = new Date(extractedFields.expirationDate);
        if (expiry < new Date()) {
          warnings.push({
            field: 'expirationDate',
            message: 'Document appears to be expired',
            value: extractedFields.expirationDate,
            severity: 'high',
          });
          flags.push('EXPIRED_DOCUMENT');
        }
      } catch (e) {
        // Date parsing failed — not critical
      }
    }

    // ── Layer 5: Missing Critical Fields ──
    const requiredFields = ['fullName'];
    for (const field of requiredFields) {
      if (!extractedFields[field]) {
        warnings.push({
          field,
          message: `Could not extract ${field} from document`,
          severity: 'medium',
        });
      }
    }

    // ── Determine verification status ──
    const isFlagged = mismatches.length > 0 || flags.length > 0;
    const verificationFlag = isFlagged ? 'FLAGGED_MISMATCH' : 'PASSED';

    // Update the document record with verification flag
    if (documentId && db.data.documents) {
      const docRecord = db.data.documents.find((d) => String(d.id) === String(documentId));
      if (docRecord) {
        docRecord.verificationFlag = verificationFlag;
        docRecord.verificationFlags = flags;
        docRecord.verifiedAt = new Date().toISOString();
        docRecord.verifiedBy = 'ocr_auto';
      }
      try {
        if (typeof db.write === 'function') await db.write();
      } catch (e) {
        console.error('DB write error:', e?.message);
      }
    }

    const verificationResult = {
      status: isFlagged ? 'FLAGGED_MISMATCH' : 'PASSED',
      verificationFlag,
      matches,
      mismatches,
      warnings,
      flags,
      recommendation:
        flags.includes('DUPLICATE_ID_NUMBER')
          ? 'CRITICAL: This ID number is already registered to another user. Manual review required.'
          : mismatches.length > 0
            ? 'Document information does not match profile. Manual review recommended.'
            : warnings.length > 0
              ? 'Minor issues found. Please review warnings.'
              : 'Document information matches profile data.',
    };

    return res.json(verificationResult);
  } catch (err) {
    next(err);
  }
};

/* ================= UPDATE DOCUMENT STATUS (Admin) ================= */
const updateDocumentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, flags } = req.body;
    const { db, createId } = require('../config/db');

    if (!db.data.documents) db.data.documents = [];

    const doc = db.data.documents.find((d) => String(d.id) === String(id));
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (status) doc.verification_status = status; // pending | verified | rejected | needs_resubmission
    if (notes) doc.verification_notes = notes;
    if (flags) doc.verification_flags = flags;
    doc.verified_at = new Date().toISOString();
    doc.verified_by = req.user.id;

    try {
      if (typeof db.write === 'function') await db.write();
    } catch (e) {
      console.error('DB write error:', e?.message);
    }

    // Notify the document owner
    if (doc.user_id) {
      const Notification = require('../models/Notification');
      const mongoose = require('mongoose');

      const notifType = status === 'verified' ? 'document_verified' :
        status === 'rejected' ? 'document_rejected' : 'document_needs_correction';
      const notifTitle = status === 'verified' ? 'Document Verified' :
        status === 'rejected' ? 'Document Rejected' : 'Document Needs Correction';
      const notifMessage = status === 'verified'
        ? 'Your uploaded document has been verified successfully.'
        : status === 'rejected'
          ? `Your document was rejected. ${notes || 'Please upload a valid document.'}`
          : `Your document needs correction. ${notes || 'Please review and resubmit.'}`;

      if (mongoose.connection.readyState === 1) {
        try {
          await Notification.create({
            userId: doc.user_id,
            title: notifTitle,
            message: notifMessage,
            type: notifType,
            data: { documentId: id, status },
          });
        } catch (e) {
          console.error('Notification save error:', e?.message);
        }
      }

      if (global._io) {
        global._io.to(`user_${doc.user_id}`).emit('notification', {
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const { logAuditEvent } = require('../middleware/auditMiddleware');
    await logAuditEvent({
      actorUserId: req.user && req.user.id,
      actorRole: req.user && req.user.role,
      action: 'DOCUMENT_VERIFICATION_STATUS_UPDATE',
      targetType: 'Document',
      targetId: id,
      afterSummary: { status, notes, flags },
      reason: notes || '',
      req,
    });

    return res.json({ message: 'Document status updated', document: doc });
  } catch (err) {
    next(err);
  }
};

/* ================= CONFIRM OCR EXTRACTION ================= */
const confirmOcrExtraction = async (req, res, next) => {
  try {
    const { documentId, extractedFields, userCorrections, rawText } = req.body;
    const OcrExtraction = require('../models/OcrExtraction');
    const mongoose = require('mongoose');

    let extractionRecord = null;
    if (mongoose.connection.readyState === 1) {
      extractionRecord = await OcrExtraction.create({
        documentId: documentId || new mongoose.Types.ObjectId(),
        status: 'CONFIRMED',
        rawText: rawText || '',
        extractedFields: extractedFields || {},
        userCorrections: userCorrections || {},
        confirmedBy: req.user && req.user.id,
        confirmedAt: new Date(),
      });
    }

    return res.json({
      message: 'OCR extraction confirmed',
      status: 'CONFIRMED',
      extraction: extractionRecord,
      confirmedFields: { ...extractedFields, ...userCorrections },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  extractFields,
  detectDocumentType,
  extractFromDocument,
  verifyDocumentData,
  updateDocumentStatus,
  confirmOcrExtraction,
};
