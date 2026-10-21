const path = require('path');
const fs = require('fs');
const storageService = require('../utils/storageService');
const authenticityService = require('../utils/documentAuthenticityService');

/* ================= FIELD PATTERNS ================= */
const fieldPatterns = {
  // Government ID patterns
  fullName: [
    /(?:name|nombre|pangalan)\s*[:\-]?\s*(.+)/i,
    /(?:last\s*name|surname)\s*[:\-]?\s*(.+)/i,
    /(?:first\s*name|given\s*name)\s*[:\-]?\s*(.+)/i,
  ],
  idNumber: [
    /(?:student\s*(?:no|number|#))\b\s*[:\-\~\s]*\s*([\w\-]+)/i,
    /(?:id\s*(?:no|number|#))\b\s*[:\-\~\s]*\s*([\w\-]+)/i,
    /(?:lrn\s*(?:no|number|#)?)\b\s*[:\-\~\s]*\s*([\w\-]+)/i,
    /(?:license\s*no|card\s*no)\b\s*[:\-\~\s]*\s*([\w\-]+)/i,
    /(?:CRN|TIN|SSS|GSIS|PhilHealth)\b\s*[:\-\~\s]*\s*([\d\-]+)/i,
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
  // Use evidence-based extraction — only returns validated fields with source proof
  const { fields } = authenticityService.extractFieldsWithEvidence(text, fieldPatterns);
  return fields;
};

/* ================= EXTRACT FIELDS WITH EVIDENCE ================= */
const extractFieldsWithEvidence = (text) => {
  return authenticityService.extractFieldsWithEvidence(text, fieldPatterns);
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
  // TOR and COG before generic school_id check
  if (lower.includes('transcript of records') || lower.includes('official transcript') || lower.includes('scholastic record')) return 'transcript_of_records';
  if (lower.includes('certificate of grades') || lower.includes('grade report') || lower.includes('grade slip')) return 'certificate_of_grades';
  if (lower.includes('certificate of registration') || lower.includes('enrollment form') || lower.includes('registration form')) return 'certificate_of_registration';
  if (lower.includes('student') || lower.includes('school') || lower.includes('university')) return 'school_id';

  return 'unknown';
};

/**
 * Helper to safely extract text from either image (Tesseract OCR) or PDF
 */
async function extractTextFromBuffer(fileBuffer, mimeType = '', originalName = '') {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    return { rawText: '', confidence: 0, format: 'empty', error: 'Empty file buffer' };
  }

  // Check if PDF
  const isPdf =
    fileBuffer.subarray(0, 5).toString('utf8').startsWith('%PDF') ||
    mimeType === 'application/pdf' ||
    (originalName && originalName.toLowerCase().endsWith('.pdf'));

  if (isPdf) {
    try {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse(new Uint8Array(fileBuffer));
      const pdfResult = await parser.getText();
      const rawPdfText = typeof pdfResult === 'string' ? pdfResult : (pdfResult?.text || '');
      // Remove page delimiters (e.g. "-- 1 of 1 --") to inspect real document content
      const cleanPdfText = rawPdfText.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
      if (cleanPdfText && cleanPdfText.length > 20) {
        return {
          rawText: cleanPdfText,
          confidence: 88,
          format: 'pdf_text',
          isScannedPdf: false,
        };
      }
    } catch (_) {}

    // Scanned / Image-only PDF (No extractable text stream)
    return {
      rawText: '',
      confidence: 0,
      format: 'pdf_scanned_image_only',
      isScannedPdf: true,
      error: 'SCANNED_PDF_NOT_DIRECTLY_SUPPORTED',
      notice: 'Scanned image-only PDF detected. Pure raster image PDFs do not contain an embedded text stream and cannot be processed by the optical text extraction engine without native desktop rasterizer libraries. Please upload this credential as a high-resolution image file (PNG, JPG, JPEG) or an official digital PDF with selectable text.',
    };
  }

  // Pre-validate image buffer to prevent unhandled worker errors on corrupt files
  if (fileBuffer.length < 200) {
    return {
      rawText: '',
      confidence: 0,
      format: 'image_unreadable_or_corrupt',
      error: 'IMAGE_CORRUPTED_OR_TOO_SMALL',
    };
  }

  // Image Optical Character Recognition via Tesseract.js
  try {
    const taskQueue = require('../utils/taskQueue');
    const Tesseract = require('tesseract.js');

    const { promise } = taskQueue.enqueue(
      'ocr',
      () =>
        Tesseract.recognize(fileBuffer, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        }).catch((err) => {
          console.warn('Tesseract worker error caught:', err?.message);
          return { data: { text: '', confidence: 0 } };
        }),
      { timeout: 30000 }
    );

    const result = await promise;
    if (result && result.data) {
      return {
        rawText: result.data.text || '',
        confidence: Math.round(result.data.confidence || 0),
        format: 'image_ocr',
      };
    }
  } catch (ocrError) {
    console.error('Tesseract.js OCR execution notice:', ocrError?.message);
    return {
      rawText: '',
      confidence: 0,
      format: 'image_ocr_error',
      error: ocrError?.message,
    };
  }

  return { rawText: '', confidence: 0, format: 'unknown' };
}

/* ================= OCR EXTRACT ================= */
const extractFromDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file uploaded' });
    }

    const fileBuffer = req.file.buffer || (req.file.path && fs.existsSync(req.file.path) ? fs.readFileSync(req.file.path) : null);
    const filePath = req.file.path;
    const originalName = req.file.originalname || 'document.png';
    const mimeType = req.file.mimetype || 'image/png';

    // Cross-Account Duplicate Document & Credential Check (Panel Revision 1)
    const currentUserId = req.user && req.user.id;
    if (fileBuffer && currentUserId) {
      const { validateUploadUniqueness } = require('../utils/duplicateDetectionService');
      const uniqueness = await validateUploadUniqueness({
        buffer: fileBuffer,
        currentUserId,
        documentType: req.body?.documentType || 'DOCUMENT',
      });
      if (!uniqueness.allowed) {
        return res.status(409).json({
          error: 'DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS',
          message: uniqueness.message,
        });
      }
    }

    // Extract text from buffer (safe for both images and PDFs)
    const { rawText, confidence, format, error: ocrErrorMsg, notice: pdfNotice } = await extractTextFromBuffer(
      fileBuffer,
      mimeType,
      originalName
    );

    const roundedConfidence = Math.round(confidence);
    const documentType = detectDocumentType(rawText);

    // Evidence-based field extraction
    const { fields: extractedFields, evidence: extractionEvidence } = extractFieldsWithEvidence(rawText);

    // Document Extraction & Administrative Verification Assessment (Panel Revision 2)
    const extractionVerification = authenticityService.assessDocumentExtractionAndVerification({
      rawText,
      confidence: roundedConfidence,
      documentType,
      extractedFields,
      evidence: extractionEvidence,
    });

    const fallbackService = require('../utils/manualReviewFallbackService');
    const fallbackCheck = fallbackService.checkOcrFallbackNeeded({
      rawText,
      confidence: roundedConfidence,
      extractedFields,
      documentType,
      ocrError: ocrErrorMsg || null,
    });

    const studentNotice = fallbackCheck.needsFallback ? fallbackCheck.studentNotice : null;

    // Check for missing key fields
    const missingFields = [];
    if (!extractedFields.fullName) missingFields.push('fullName');
    if (!extractedFields.idNumber) missingFields.push('idNumber');

    // Message describing extraction state and administrator authority
    let message = 'Document text processed successfully. Please review and confirm the extracted values before submitting.';
    if (pdfNotice) {
      message = pdfNotice;
    } else if (ocrErrorMsg) {
      message = 'OCR processing encountered an issue with this image. The document has been saved for manual administrative verification. You may enter details manually.';
    } else if (!extractionVerification.isExtractionUsable) {
      message = 'Notice: The document text could not be fully recognized or does not clearly match ' +
        (extractionVerification.structuralMarkers.documentTypeLabel || 'expected document criteria') +
        '. An administrator will review this document manually.';
    } else if (fallbackCheck.needsFallback) {
      message = 'Administrative Verification Required: The system could not automatically extract all required fields with high confidence. An authorized scholarship provider will review the uploaded document manually.';
    }

    return res.json({
      rawText,
      extractedFields,
      missingFields,
      documentType,
      confidence: roundedConfidence,
      format,
      isScannedPdf: Boolean(format === 'pdf_scanned_image_only'),
      ocrNotice: pdfNotice || ocrErrorMsg || null,
      extractionStatus: roundedConfidence >= 70 ? 'SUCCESS' : (roundedConfidence > 0 ? 'PARTIAL' : 'NEEDS_MANUAL_REVIEW'),
      supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf (text-based)'],
      reviewStatus: 'PENDING_ADMIN_VERIFICATION',
      administrativeVerificationNotice: 'OCR extraction is an administrative aid. Final document authenticity and eligibility are verified manually by authorized scholarship evaluators.',
      fallbackTriggered: fallbackCheck.needsFallback,
      manualReviewReason: fallbackCheck.primaryReasonText,
      studentNotice,
      extractionVerification,
      documentBasis: extractionVerification,
      message,
      filePath: `/uploads/${path.basename(filePath || originalName || 'document.png')}`,
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
        docRecord.consistencyCheckedAt = new Date().toISOString();
        // Preserves human administrative review authority: OCR does not auto-verify documents
        docRecord.verificationStatus = 'PENDING_ADMIN_VERIFICATION';
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
    const { documentId, extractedFields = {}, userCorrections = {}, rawText } = req.body;
    const confirmedFields = { ...extractedFields, ...userCorrections };
    const currentUserId = req.user && req.user.id;

    // Cross-Account Duplicate Credential Identifier Check (Panel Revision 1)
    const confirmedIdNumber = confirmedFields.idNumber || confirmedFields.studentNumber || confirmedFields.lrn;
    const confirmedInstitution = confirmedFields.institution || confirmedFields.schoolName || confirmedFields.university || '';
    if (confirmedIdNumber && currentUserId) {
      const { checkDuplicateCredentialIdentifier } = require('../utils/duplicateDetectionService');
      const dupCheck = await checkDuplicateCredentialIdentifier({
        identifier: confirmedIdNumber,
        identifierType: confirmedFields.lrn ? 'LRN' : 'Student ID',
        institution: confirmedInstitution,
        currentUserId,
      });

      if (dupCheck.isDuplicate) {
        return res.status(409).json({
          error: 'DUPLICATE_CREDENTIAL_IDENTIFIER_ACROSS_ACCOUNTS',
          message: dupCheck.reason,
        });
      }
    }

    const { db } = require('../config/db');
    if (documentId && Array.isArray(db.data?.documents)) {
      const doc = db.data.documents.find((d) => String(d.id) === String(documentId));
      if (doc) {
        doc.extractedFields = confirmedFields;
        doc.studentConfirmationStatus = 'CONFIRMED';
        doc.manualReviewStatus = 'PENDING';
        doc.verificationStatus = 'PENDING_HUMAN_REVIEW';
        await db.write();
      }
    }

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
        confirmedBy: currentUserId,
        confirmedAt: new Date(),
      });
    }

    return res.json({
      message: 'Document extraction values confirmed by applicant. Ready for administrative verification.',
      status: 'CONFIRMED',
      extraction: extractionRecord,
      confirmedFields,
      verificationStatus: 'PENDING_HUMAN_REVIEW',
    });
  } catch (err) {
    next(err);
  }
};

/* ================= SCAN DOCUMENT BY ID (On-Demand Physical OCR) ================= */
const scanDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { db } = require('../config/db');
    const storageService = require('../utils/storageService');
    const fallbackService = require('../utils/manualReviewFallbackService');

    const doc = (db.data.documents || []).find((d) => String(d.id) === String(id));
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    let rawText = doc.rawOcrText || doc.ocrRawText || '';
    let confidence = doc.ocrConfidence || 85;
    let extractedFields = doc.extractedFields || {};
    let documentType = doc.documentType || doc.type || 'unknown';

    // Attempt to download the document buffer from storage only if not already extracted
    let fileBuffer = null;
    const storedTarget = doc.storedKey || doc.filename || doc.path;
    if (storedTarget && (!rawText || Object.keys(extractedFields).length === 0)) {
      try {
        const fileResult = await storageService.downloadFile(storedTarget);
        if (fileResult && fileResult.buffer) {
          fileBuffer = fileResult.buffer;
        }
      } catch (dlErr) {
        console.warn('[scanDocumentById] Storage download notice:', dlErr.message);
      }
    }

    // If we have a readable file buffer and haven't scanned yet, run extraction safely
    let ocrActuallyRan = false;
    if (fileBuffer && (!rawText || Object.keys(extractedFields).length === 0)) {
      const extRes = await extractTextFromBuffer(
        fileBuffer,
        doc.mime_type || doc.mimeType,
        doc.filename || doc.originalname
      );
      if (extRes.rawText) {
        rawText = extRes.rawText;
        confidence = extRes.confidence;
        ocrActuallyRan = true;
      }
    }

    // ANTI-HALLUCINATION: Evidence-based extraction only — never use stored metadata as fake scan results
    let extractionEvidence = {};
    if (rawText && rawText.trim()) {
      const result = extractFieldsWithEvidence(rawText);
      extractedFields = result.fields;
      extractionEvidence = result.evidence;
      documentType = detectDocumentType(rawText);
    }
    // If OCR didn't extract anything, fields stay empty — we do NOT hallucinate from metadata

    // Document correctness basis — structural markers + authenticity scoring
    const documentBasis = authenticityService.assessDocumentAuthenticity({
      rawText,
      confidence,
      documentType,
      extractedFields,
      evidence: extractionEvidence,
    });

    // Check if manual review fallback is needed
    const fallbackCheck = fallbackService.checkOcrFallbackNeeded({
      rawText,
      confidence,
      extractedFields,
      documentType,
      ocrError: null,
    });

    // Cross-check against student profile
    const studentUser = (db.data.users || []).find((u) => String(u.id) === String(doc.user_id || doc.studentId));
    const mismatches = [];
    const matches = [];
    const flags = [];

    if (studentUser && extractedFields.fullName) {
      const uName = (studentUser.name || '').toLowerCase();
      const extName = (extractedFields.fullName || '').toLowerCase();
      if (uName && extName && !uName.includes(extName) && !extName.includes(uName)) {
        mismatches.push({ field: 'fullName', profile: studentUser.name, document: extractedFields.fullName, severity: 'high' });
        flags.push('NAME_MISMATCH');
      } else {
        matches.push({ field: 'fullName', value: extractedFields.fullName });
      }
    }

    const verificationFlag = mismatches.length > 0 ? 'FLAGGED_MISMATCH' : 'PASSED';

    // Update document record
    doc.rawOcrText = rawText;
    doc.extractedFields = extractedFields;
    doc.ocrStatus = 'COMPLETED';
    doc.verificationFlag = verificationFlag;
    doc.verificationFlags = flags;
    doc.ocrConfidence = confidence;
    doc.documentType = documentType;
    doc.documentBasis = documentBasis;
    if (typeof db.write === 'function') await db.write();

    return res.json({
      documentId: id,
      rawText,
      extractedFields,
      documentType,
      confidence,
      verificationFlag,
      matches,
      mismatches,
      flags,
      fallbackTriggered: fallbackCheck.needsFallback,
      reviewStatus: fallbackCheck.reviewStatus,
      documentBasis,
      ocrActuallyScanned: ocrActuallyRan || Boolean(rawText && rawText.trim()),
      message: !documentBasis.isCorrectPaper
        ? 'Warning: This does not appear to be a valid ' + (documentBasis.structuralMarkers.documentTypeLabel || 'document') + '. Uploaded image may be incorrect.'
        : 'Document scan & verification completed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  extractTextFromBuffer,
  extractFields,
  extractFieldsWithEvidence,
  detectDocumentType,
  extractFromDocument,
  verifyDocumentData,
  updateDocumentStatus,
  confirmOcrExtraction,
  scanDocumentById,
};
