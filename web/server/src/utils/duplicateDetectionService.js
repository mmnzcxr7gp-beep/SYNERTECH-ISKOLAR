/**
 * ISKOLAR Server-Side Duplicate Credential & Document Detection Service
 * 
 * Complies with Panel Revision Requirement 1:
 * - Detects identical uploaded files using SHA-256 cryptographic fingerprints across different user accounts.
 * - Detects duplicate extracted credential identifiers (Student ID, LRN, National ID, Certificate Number)
 *   across different applicant accounts.
 * - Permits legitimate replacement uploads and retries by the same applicant.
 * - Prevents association of duplicate credentials with a different applicant account.
 * - Provides privacy-safe validation messages without leaking another applicant's personal data.
 * - Documents detection methodology and operational limitations.
 */

const crypto = require('crypto');
const { db } = require('../config/db');

/**
 * Calculates SHA-256 hash of a Buffer
 * @param {Buffer} buffer 
 * @returns {string} 64-character hex hash
 */
function computeSha256(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return null;
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Normalizes credential identifiers (e.g. Student ID, LRN, License No)
 * for collision checking by stripping whitespace, hyphens, and casing.
 * @param {string} rawId 
 * @returns {string}
 */
function normalizeIdentifier(rawId) {
  if (!rawId || typeof rawId !== 'string') return '';
  return rawId.trim().toUpperCase().replace(/[\s\-_]/g, '');
}

/**
 * Check if a file hash has already been submitted by another user account
 * 
 * @param {object} params
 * @param {string} params.fileHash - SHA-256 hash of the uploaded file
 * @param {string|number} params.currentUserId - User ID of applicant uploading the file
 * @param {string} [params.documentType] - Optional type of document
 * @returns {Promise<{ isDuplicate: boolean, reason?: string, existingOwnerId?: string }>}
 */
async function checkDuplicateFileHash({ fileHash, currentUserId, documentType }) {
  if (!fileHash) return { isDuplicate: false };

  const currentUserIdStr = String(currentUserId);

  // 1. Check in-memory / lowdb db.data.documents
  if (Array.isArray(db.data?.documents)) {
    const existing = db.data.documents.find((d) => {
      const existingHash = d.fileHash || d.sha256Hash || d.hash;
      if (!existingHash) return false;
      if (existingHash.toLowerCase() !== fileHash.toLowerCase()) return false;

      const ownerId = String(d.user_id || d.userId || d.studentId || d.applicantId || '');
      // If owner is the same applicant, this is a legitimate retry or replacement
      return ownerId && ownerId !== currentUserIdStr;
    });

    if (existing) {
      return {
        isDuplicate: true,
        reason: 'This exact document file has already been uploaded by another applicant account. Submitting duplicate documents across different accounts is strictly prohibited.',
        existingOwnerId: String(existing.user_id || existing.studentId),
      };
    }
  }

  // 1b. Check in-memory / lowdb db.data.applications
  if (Array.isArray(db.data?.applications)) {
    const existingApp = db.data.applications.find((a) => {
      const existingHash = a.fileHash || a.sha256Hash || a.documentMetadata?.fileHashSha256;
      if (!existingHash) return false;
      if (existingHash.toLowerCase() !== fileHash.toLowerCase()) return false;

      const ownerId = String(a.studentId || a.userId || a.applicantId || '');
      return ownerId && ownerId !== currentUserIdStr;
    });

    if (existingApp) {
      return {
        isDuplicate: true,
        reason: 'This exact document file has already been uploaded by another applicant account. Submitting duplicate documents across different accounts is strictly prohibited.',
        existingOwnerId: String(existingApp.studentId || existingApp.userId),
      };
    }
  }

  // 2. Check MongoDB Document collection
  const mongoose = require('mongoose');
  if (mongoose.connection?.readyState === 1) {
    try {
      const { Document } = require('../models');
      if (Document) {
        const query = {
          $or: [{ fileHash }, { sha256Hash: fileHash }],
          studentId: { $ne: Number(currentUserId) },
        };
        // Also check applicantId if using ObjectId
        if (mongoose.Types.ObjectId.isValid(currentUserIdStr)) {
          query.applicantId = { $ne: new mongoose.Types.ObjectId(currentUserIdStr) };
        }

        const existingDoc = await Document.findOne(query).lean().catch(() => null);
        if (existingDoc) {
          const ownerId = String(existingDoc.studentId || existingDoc.applicantId || '');
          if (ownerId && ownerId !== currentUserIdStr) {
            return {
              isDuplicate: true,
              reason: 'This exact document file has already been uploaded by another applicant account. Submitting duplicate documents across different accounts is strictly prohibited.',
              existingOwnerId: ownerId,
            };
          }
        }
      }

      // Check FileAsset model
      const { FileAsset } = require('../models');
      if (FileAsset && mongoose.Types.ObjectId.isValid(currentUserIdStr)) {
        const existingAsset = await FileAsset.findOne({
          checksum: fileHash,
          ownerUserId: { $ne: new mongoose.Types.ObjectId(currentUserIdStr) },
        }).lean().catch(() => null);

        if (existingAsset) {
          return {
            isDuplicate: true,
            reason: 'This exact document file has already been uploaded by another applicant account. Submitting duplicate documents across different accounts is strictly prohibited.',
            existingOwnerId: String(existingAsset.ownerUserId),
          };
        }
      }

      // Check ScholarshipApplication collection
      const { ScholarshipApplication } = require('../models');
      if (ScholarshipApplication) {
        const existingApp = await ScholarshipApplication.findOne({
          $or: [
            { fileHash },
            { sha256Hash: fileHash },
            { 'documentMetadata.fileHashSha256': fileHash },
          ],
        }).lean().catch(() => null);

        if (existingApp) {
          const ownerId = String(existingApp.studentId || existingApp.userId || existingApp.applicantId || '');
          if (ownerId && ownerId !== currentUserIdStr) {
            return {
              isDuplicate: true,
              reason: 'This exact document file has already been uploaded by another applicant account. Submitting duplicate documents across different accounts is strictly prohibited.',
              existingOwnerId: ownerId,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[DuplicateDetection] Mongo hash check error:', err.message);
    }
  }

  return { isDuplicate: false };
}

function normalizeInstitution(rawInst) {
  if (!rawInst || typeof rawInst !== 'string') return '';
  return rawInst.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Check if a credential identifier (e.g. Student ID, LRN, National ID Number)
 * is already registered or submitted by a DIFFERENT applicant account.
 * 
 * Note: National identifiers (LRN, National ID) are unique nationwide across institutions.
 * School-issued identifiers (Student ID) are scoped to the issuing institution;
 * if both applicants have explicit, distinct institutions (e.g. PLM vs TUP), they do not conflict.
 * 
 * @param {object} params
 * @param {string} params.identifier - Extracted or input ID number
 * @param {string} params.identifierType - E.g. 'STUDENT_ID', 'LRN', 'NATIONAL_ID'
 * @param {string} [params.institution] - Issuing school / university name
 * @param {string|number} params.currentUserId - User ID of the applicant
 * @returns {Promise<{ isDuplicate: boolean, reason?: string, conflictingField?: string }>}
 */
async function checkDuplicateCredentialIdentifier({ identifier, identifierType = 'STUDENT_ID', institution = '', currentUserId }) {
  if (!identifier) return { isDuplicate: false };

  const normId = normalizeIdentifier(identifier);
  if (!normId || normId.length < 4) {
    // Ignore trivially short or empty IDs
    return { isDuplicate: false };
  }

  const currentUserIdStr = String(currentUserId);
  const normCurrentInst = normalizeInstitution(institution);
  const isSchoolScoped = String(identifierType).toUpperCase().includes('STUDENT');

  // Helper: check if institution allows collision (same school or either unknown)
  const isInstitutionConflict = (candidateInst) => {
    if (!isSchoolScoped) return true; // LRN, National ID are global nationwide scope
    const normCandInst = normalizeInstitution(candidateInst);
    if (!normCurrentInst || !normCandInst) return true; // At least one unknown -> treat as collision to be safe
    return normCurrentInst === normCandInst; // Conflict only if schools match
  };

  // 1. Check in-memory users & student profiles
  if (Array.isArray(db.data?.student_profiles)) {
    const conflict = db.data.student_profiles.find((p) => {
      const ownerId = String(p.user_id || p.userId || '');
      if (!ownerId || ownerId === currentUserIdStr) return false;

      const pStudentNum = normalizeIdentifier(p.studentNumber || p.studentNo || p.studentIdNumber || '');
      const pLrn = normalizeIdentifier(p.lrn || p.lrnNumber || '');
      const pNationalId = normalizeIdentifier(p.nationalId || p.idNumber || '');

      const matchesId = (pStudentNum && pStudentNum === normId) ||
             (pLrn && pLrn === normId) ||
             (pNationalId && pNationalId === normId);
      if (!matchesId) return false;

      const candInst = p.schoolName || p.school || p.university || '';
      return isInstitutionConflict(candInst);
    });

    if (conflict) {
      return {
        isDuplicate: true,
        conflictingField: identifierType,
        reason: `The credential identifier (${identifierType}) is already associated with another registered student account. Each credential may only be linked to a single applicant.`,
      };
    }
  }

  // 2. Check in-memory extracted OCR document records
  if (Array.isArray(db.data?.documents)) {
    const conflict = db.data.documents.find((d) => {
      const ownerId = String(d.user_id || d.studentId || '');
      if (!ownerId || ownerId === currentUserIdStr) return false;

      const extractedId = normalizeIdentifier(
        d.extractedFields?.idNumber ||
        d.extractedFields?.studentNumber ||
        d.ocr_result?.extracted_fields?.id_number ||
        d.ocrData?.extractedFields?.idNumber ||
        ''
      );

      if (!extractedId || extractedId !== normId) return false;

      const candInst = d.extractedFields?.institution ||
        d.extractedFields?.schoolName ||
        d.ocr_result?.extracted_fields?.institution ||
        d.ocrData?.extractedFields?.institution ||
        '';
      return isInstitutionConflict(candInst);
    });

    if (conflict) {
      return {
        isDuplicate: true,
        conflictingField: identifierType,
        reason: `The credential identifier (${identifierType}) extracted from this document has already been submitted by another applicant. Duplicate credentials across accounts cannot be associated.`,
      };
    }
  }

  // 3. Check MongoDB Student and Document models
  const mongoose = require('mongoose');
  if (mongoose.connection?.readyState === 1) {
    try {
      const { Student, Document } = require('../models');

      if (Student) {
        const studentConflict = await Student.findOne({
          $or: [
            { studentNumber: identifier },
            { lrn: identifier },
            { idNumber: identifier },
          ],
          userId: { $ne: Number(currentUserId) },
        }).lean().catch(() => null);

        if (studentConflict && String(studentConflict.userId) !== currentUserIdStr) {
          return {
            isDuplicate: true,
            conflictingField: identifierType,
            reason: `The credential identifier (${identifierType}) is already associated with another registered student account. Each credential may only be linked to a single applicant.`,
          };
        }
      }

      if (Document) {
        const docConflict = await Document.findOne({
          $or: [
            { 'extractedFields.idNumber': identifier },
            { 'extractedFields.studentNumber': identifier },
          ],
          studentId: { $ne: Number(currentUserId) },
        }).lean().catch(() => null);

        if (docConflict && String(docConflict.studentId) !== currentUserIdStr) {
          return {
            isDuplicate: true,
            conflictingField: identifierType,
            reason: `The credential identifier (${identifierType}) extracted from this document has already been submitted by another applicant. Duplicate credentials across accounts cannot be associated.`,
          };
        }
      }

      const { ScholarshipApplication } = require('../models');
      if (ScholarshipApplication) {
        const appConflict = await ScholarshipApplication.findOne({
          $or: [
            { credentialIdentifier: identifier },
            { 'documentMetadata.credentialIdentifier': identifier },
          ],
        }).lean().catch(() => null);

        if (appConflict) {
          const ownerId = String(appConflict.studentId || appConflict.userId || appConflict.applicantId || '');
          if (ownerId && ownerId !== currentUserIdStr) {
            return {
              isDuplicate: true,
              conflictingField: identifierType,
              reason: `The credential identifier (${identifierType}) extracted from this document has already been submitted by another applicant account. Duplicate credentials across accounts cannot be associated.`,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[DuplicateDetection] Mongo identifier check error:', err.message);
    }
  }

  return { isDuplicate: false };
}

// Concurrency Guard: In-flight upload hash lock (prevents simultaneous duplicate upload races)
const inFlightUploadHashes = new Map();
const IN_FLIGHT_HASH_TTL_MS = 20000;

function cleanExpiredInFlightHashes() {
  const now = Date.now();
  for (const [hash, entry] of inFlightUploadHashes.entries()) {
    if (now - entry.timestamp > IN_FLIGHT_HASH_TTL_MS) {
      inFlightUploadHashes.delete(hash);
    }
  }
}

/**
 * Combined verification: Checks both file hash and reliable extracted identifiers.
 * 
 * @param {object} params
 * @param {Buffer} [params.buffer] - Raw uploaded file buffer
 * @param {string} [params.fileHash] - Pre-computed SHA-256
 * @param {string|number} params.currentUserId - Current user ID
 * @param {object} [params.extractedFields] - Fields extracted by OCR or form
 * @param {string} [params.documentType] - Type of document
 * @returns {Promise<{ allowed: boolean, statusCode?: number, message?: string, code?: string }>}
 */
async function validateUploadUniqueness({
  buffer,
  fileHash,
  currentUserId,
  extractedFields = {},
  documentType = 'DOCUMENT',
}) {
  const hash = fileHash || computeSha256(buffer);

  // 0. Concurrency in-flight lock (prevents simultaneous race condition)
  if (hash && currentUserId) {
    cleanExpiredInFlightHashes();
    const normalizedHash = hash.toLowerCase();
    const inFlight = inFlightUploadHashes.get(normalizedHash);
    const currentUserIdStr = String(currentUserId);
    if (inFlight && inFlight.ownerId !== currentUserIdStr) {
      return {
        allowed: false,
        statusCode: 409,
        code: 'DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS',
        message: 'This document file has already been submitted by another applicant. The same credential document cannot be associated with multiple applicant accounts. If you believe this is an error, please contact administrative support.',
      };
    }
    inFlightUploadHashes.set(normalizedHash, { ownerId: currentUserIdStr, timestamp: Date.now() });
  }

  // 1. File Hash Duplicate Check (across accounts)
  if (hash) {
    const hashCheck = await checkDuplicateFileHash({
      fileHash: hash,
      currentUserId,
      documentType,
    });

    if (hashCheck.isDuplicate) {
      return {
        allowed: false,
        statusCode: 409,
        code: 'DUPLICATE_DOCUMENT_ACROSS_ACCOUNTS',
        message: 'This document file has already been submitted by another applicant. The same credential document cannot be associated with multiple applicant accounts. If you believe this is an error, please contact administrative support.',
      };
    }
  }

  // 2. Extracted / Declared Credential Identifier Check (across accounts)
  const idNumber = extractedFields.idNumber || extractedFields.studentNumber || extractedFields.lrn || extractedFields.nationalId;
  const institution = extractedFields.institution || extractedFields.schoolName || extractedFields.university || '';
  if (idNumber) {
    const idCheck = await checkDuplicateCredentialIdentifier({
      identifier: idNumber,
      identifierType: extractedFields.lrn ? 'LRN' : (extractedFields.nationalId ? 'National ID' : 'Student ID'),
      institution,
      currentUserId,
    });

    if (idCheck.isDuplicate) {
      return {
        allowed: false,
        statusCode: 409,
        code: 'DUPLICATE_CREDENTIAL_IDENTIFIER_ACROSS_ACCOUNTS',
        message: 'This credential identifier has already been registered or submitted by another applicant. The same credential cannot be associated with multiple applicants. If you believe this is an error, please contact administrative support.',
      };
    }
  }

  return { allowed: true, fileHash: hash };
}

module.exports = {
  computeSha256,
  normalizeIdentifier,
  checkDuplicateFileHash,
  checkDuplicateCredentialIdentifier,
  validateUploadUniqueness,
};
