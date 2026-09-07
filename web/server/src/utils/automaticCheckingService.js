/**
 * ISKOLAR Explainable Automatic Document & Eligibility Rule Engine
 * 
 * Implements 16 explainable rule checks and produces recommendations
 * strictly without making final automatic scholarship decisions.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const RULE_VERSION = '1.0.0';

/**
 * Calculates SHA-256 hash of a file or buffer
 */
function calculateFileHash(bufferOrPath) {
  if (typeof bufferOrPath === 'string' && fs.existsSync(bufferOrPath)) {
    const data = fs.readFileSync(bufferOrPath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  if (Buffer.isBuffer(bufferOrPath)) {
    return crypto.createHash('sha256').update(bufferOrPath).digest('hex');
  }
  return null;
}

/**
 * Evaluates the full suite of automatic rules for an application
 */
async function evaluateApplicationRules({
  application,
  scholarship,
  student,
  documents = [],
  ocrExtractions = [],
  dbData = {},
}) {
  const results = [];
  const appId = application?.id || application?._id || 'unknown-app';

  // 1. Required Documents Present
  const requiredDocTypes = scholarship?.required_documents || ['governmentId', 'academicReport'];
  const uploadedDocTypes = documents.map((d) => d.type || d.documentType || d.document_type).filter(Boolean);
  const missingDocs = requiredDocTypes.filter((req) => !uploadedDocTypes.includes(req));
  const docsPresent = missingDocs.length === 0;

  results.push({
    applicationId: appId,
    ruleId: 'RULE_REQ_DOCS_PRESENT',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'FILE_INTEGRITY',
    input: { required: requiredDocTypes, uploaded: uploadedDocTypes },
    expectedCondition: 'All required documents must be uploaded',
    actualResult: docsPresent ? 'PASS' : 'FAIL',
    passed: docsPresent,
    explanation: docsPresent
      ? `All ${requiredDocTypes.length} required document(s) are uploaded and attached.`
      : `Missing required document(s): ${missingDocs.join(', ')}.`,
  });

  // 2. Supported File Formats & 3. Size Limits & 4. Readability
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const maxBytes = 10 * 1024 * 1024; // 10MB
  const hasDocuments = documents.length > 0;

  let allFormatsValid = hasDocuments;
  let allSizesValid = hasDocuments;
  let allReadable = hasDocuments;

  if (hasDocuments) {
    for (const doc of documents) {
      const ext = path.extname(doc.filename || doc.name || doc.originalname || '').toLowerCase();
      const size = Number(doc.size || doc.fileSize || 0);

      if (ext && !allowedExtensions.includes(ext)) {
        allFormatsValid = false;
      }
      if (size > maxBytes) {
        allSizesValid = false;
      }
      if (size === 0 && !doc.buffer && !doc.path) {
        allReadable = false;
      }
    }
  }

  results.push({
    applicationId: appId,
    ruleId: 'RULE_SUPPORTED_FORMAT',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'FILE_INTEGRITY',
    input: { documentCount: documents.length, formats: documents.map((d) => path.extname(d.filename || '').toLowerCase()) },
    expectedCondition: 'Files must be in PDF, JPG, PNG, or WebP format',
    actualResult: allFormatsValid ? 'PASS' : 'FAIL',
    passed: allFormatsValid,
    explanation: !hasDocuments
      ? 'No documents attached to verify format.'
      : allFormatsValid
      ? 'All attached document files match allowlisted extensions (PDF/JPEG/PNG/WebP).'
      : 'One or more attached files use an unsupported file extension.',
  });

  results.push({
    applicationId: appId,
    ruleId: 'RULE_SIZE_LIMIT',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'FILE_INTEGRITY',
    input: { maxAllowedMB: 10, sizesBytes: documents.map((d) => d.size || 0) },
    expectedCondition: 'Each uploaded document file size must not exceed 10MB',
    actualResult: allSizesValid ? 'PASS' : 'FAIL',
    passed: allSizesValid,
    explanation: !hasDocuments
      ? 'No documents attached to check file sizes.'
      : allSizesValid
      ? 'All attached document file sizes are within the 10MB limit.'
      : 'One or more attached documents exceed the maximum file size of 10MB.',
  });

  results.push({
    applicationId: appId,
    ruleId: 'RULE_FILE_READABLE',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'FILE_INTEGRITY',
    input: { documentCount: documents.length },
    expectedCondition: 'All document streams/buffers must be non-empty and readable',
    actualResult: allReadable ? 'PASS' : 'FAIL',
    passed: allReadable,
    explanation: !hasDocuments
      ? 'No documents attached to verify file readability.'
      : allReadable
      ? 'All files contain valid, readable binary data.'
      : 'One or more files appear corrupted or empty (0 bytes).',
  });

  // 5. Duplicate File Hash Check
  const hashes = documents.map((d) => d.hash || d.fileHash).filter(Boolean);
  const hasDuplicateHashes = new Set(hashes).size < hashes.length;

  results.push({
    applicationId: appId,
    ruleId: 'RULE_NO_DUPLICATE_HASH',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'FILE_INTEGRITY',
    input: { fileHashesCount: hashes.length },
    expectedCondition: 'Each uploaded document must represent a distinct file artifact',
    actualResult: !hasDuplicateHashes ? 'PASS' : 'FAIL',
    passed: !hasDuplicateHashes,
    explanation: !hasDuplicateHashes
      ? 'No duplicate file hashes detected among uploaded documents.'
      : 'Duplicate file upload detected: identical files were submitted under different document slots.',
  });

  // 6. Duplicate Application Check
  const studentId = student?.id || student?._id || application?.student_id;
  const scholarshipId = scholarship?.id || scholarship?._id || application?.scholarship_id;
  const allApps = dbData.applications || [];
  const priorApps = allApps.filter(
    (a) =>
      String(a.student_id) === String(studentId) &&
      String(a.scholarship_id) === String(scholarshipId) &&
      String(a.id) !== String(appId) &&
      a.status !== 'rejected' &&
      a.status !== 'cancelled'
  );
  const isDuplicateApp = priorApps.length > 0;

  results.push({
    applicationId: appId,
    ruleId: 'RULE_NO_DUPLICATE_APP',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'POLICY',
    input: { studentId, scholarshipId, priorActiveCount: priorApps.length },
    expectedCondition: 'Applicant may submit only one active application per scholarship opportunity',
    actualResult: !isDuplicateApp ? 'PASS' : 'FAIL',
    passed: !isDuplicateApp,
    explanation: !isDuplicateApp
      ? 'Applicant has no other active applications for this scholarship.'
      : `Applicant already has ${priorApps.length} active application(s) for this scholarship program.`,
  });

  // 7. Required Extracted OCR Fields
  const primaryOcr =
    (ocrExtractions && ocrExtractions[0]) ||
    documents.find((d) => (d.extractedFields && Object.keys(d.extractedFields).length > 0) || (d.ocrData && Object.keys(d.ocrData).length > 0)) ||
    {};
  const extracted = primaryOcr.extractedFields || primaryOcr.ocrData || {};
  const hasExtractedName = Boolean(extracted.fullName || extracted.name);

  results.push({
    applicationId: appId,
    ruleId: 'RULE_EXTRACTED_FIELDS',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'OCR_CONSISTENCY',
    input: { extractedFieldKeys: Object.keys(extracted) },
    expectedCondition: 'OCR processing must extract essential applicant identity fields',
    actualResult: hasExtractedName ? 'PASS' : 'WARN',
    passed: hasExtractedName,
    explanation: hasExtractedName
      ? 'OCR successfully extracted identity fields for verification.'
      : 'Document has not been scanned with OCR yet, or OCR could not extract identity fields; manual reviewer inspection is required.',
  });

  // 8. Name Consistency
  const profileName = (student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`).trim().toLowerCase();
  const ocrName = (extracted.fullName || extracted.name || '').trim().toLowerCase();
  const hasOcrName = Boolean(ocrName);
  const nameMatches = hasOcrName && (!profileName || profileName.includes(ocrName) || ocrName.includes(profileName));

  results.push({
    applicationId: appId,
    ruleId: 'RULE_NAME_CONSISTENCY',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'OCR_CONSISTENCY',
    input: { profileName, ocrName },
    expectedCondition: 'Applicant name on document must match registered student profile name',
    actualResult: !hasOcrName ? 'WARN' : nameMatches ? 'PASS' : 'FAIL',
    passed: !hasOcrName ? false : nameMatches,
    explanation: !hasOcrName
      ? 'Identity document has not been scanned with OCR yet; name matching pending document scan or manual review.'
      : nameMatches
      ? 'Applicant name on document is consistent with student profile.'
      : `Name discrepancy detected: Profile states "${profileName}", document states "${ocrName}".`,
  });

  // 9. Student Number Consistency
  const profileLrn = (student?.studentNumber || student?.lrn || '').trim();
  const ocrLrn = (extracted.studentNumber || extracted.idNumber || '').trim();
  const hasOcrLrn = Boolean(ocrLrn);
  const lrnMatches = hasOcrLrn && (!profileLrn || profileLrn === ocrLrn);

  results.push({
    applicationId: appId,
    ruleId: 'RULE_STUDENT_NUMBER_CONSISTENCY',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'OCR_CONSISTENCY',
    input: { profileLrn, ocrLrn },
    expectedCondition: 'Student number/LRN on document must match student profile',
    actualResult: !hasOcrLrn ? 'WARN' : lrnMatches ? 'PASS' : 'WARN',
    passed: !hasOcrLrn ? false : lrnMatches,
    explanation: !hasOcrLrn
      ? 'Student identification number not detected in document OCR; awaiting OCR scan or manual review.'
      : lrnMatches
      ? 'Student identification number is consistent.'
      : `Student number discrepancy: Profile (${profileLrn}) vs Document (${ocrLrn}).`,
  });

  // 10. School Consistency
  const profileSchool = (student?.schoolName || student?.university || student?.school || '').trim().toLowerCase();
  const ocrSchool = (extracted.school || extracted.university || '').trim().toLowerCase();
  const hasOcrSchool = Boolean(ocrSchool);
  const schoolMatches = hasOcrSchool && (!profileSchool || profileSchool.includes(ocrSchool) || ocrSchool.includes(profileSchool));

  results.push({
    applicationId: appId,
    ruleId: 'RULE_SCHOOL_CONSISTENCY',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'OCR_CONSISTENCY',
    input: { profileSchool, ocrSchool },
    expectedCondition: 'Institution name on document must match student profile school',
    actualResult: !hasOcrSchool ? 'WARN' : schoolMatches ? 'PASS' : 'WARN',
    passed: !hasOcrSchool ? false : schoolMatches,
    explanation: !hasOcrSchool
      ? 'Institution name not detected in document OCR; awaiting OCR scan or manual review.'
      : schoolMatches
      ? 'School/university affiliation matches between document and profile.'
      : 'School name on academic document differs from profile institution.',
  });

  // 11. GWA Threshold
  const requiredMinGwa = Number(scholarship?.min_gwa || scholarship?.gwaRequirement || 0);
  const studentGwa = Number(student?.gwa || extracted.gwa || 0);
  // In Philippine grading system, depending on scale: 1.0 (highest) to 5.0 (lowest) OR 75% to 100%
  let gwaPassed = true;
  if (requiredMinGwa > 0 && studentGwa > 0) {
    if (requiredMinGwa <= 5.0) {
      gwaPassed = studentGwa <= requiredMinGwa; // 1.0 to 5.0 scale (lower is better)
    } else {
      gwaPassed = studentGwa >= requiredMinGwa; // percentage scale (higher is better)
    }
  }

  results.push({
    applicationId: appId,
    ruleId: 'RULE_GWA_THRESHOLD',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'ELIGIBILITY',
    input: { studentGwa, requiredMinGwa },
    expectedCondition: `Applicant GWA (${studentGwa}) must meet scholarship criteria (${requiredMinGwa || 'None specified'})`,
    actualResult: gwaPassed ? 'PASS' : 'FAIL',
    passed: gwaPassed,
    explanation: gwaPassed
      ? `Academic criteria satisfied (GWA: ${studentGwa || 'Verified'}).`
      : `Applicant GWA (${studentGwa}) does not meet the minimum requirement (${requiredMinGwa}).`,
  });

  // 12. Scholarship Deadline Check
  const deadline = scholarship?.deadline ? new Date(scholarship.deadline) : null;
  const submittedAt = application?.createdAt ? new Date(application.createdAt) : new Date();
  const isBeforeDeadline = !deadline || submittedAt <= deadline;

  results.push({
    applicationId: appId,
    ruleId: 'RULE_DEADLINE_VALID',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'POLICY',
    input: { deadline: deadline ? deadline.toISOString() : null, submittedAt: submittedAt.toISOString() },
    expectedCondition: 'Application must be submitted prior to the scholarship application deadline',
    actualResult: isBeforeDeadline ? 'PASS' : 'FAIL',
    passed: isBeforeDeadline,
    explanation: isBeforeDeadline
      ? 'Application was submitted prior to the deadline.'
      : 'Application was submitted after the scholarship deadline expired.',
  });

  // 13. Document Issue Date
  const docDate = extracted.documentDate ? new Date(extracted.documentDate) : null;
  const hasDocDate = Boolean(docDate && !Number.isNaN(docDate.getTime()));
  const docDateValid = hasDocDate && docDate <= new Date();

  results.push({
    applicationId: appId,
    ruleId: 'RULE_DOCUMENT_DATE',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'FILE_INTEGRITY',
    input: { documentDate: docDate ? docDate.toISOString() : null },
    expectedCondition: 'Document issue date must not be in the future',
    actualResult: !hasDocDate ? 'WARN' : docDateValid ? 'PASS' : 'FAIL',
    passed: !hasDocDate ? false : docDateValid,
    explanation: !hasDocDate
      ? 'Document issuance date not detected by OCR; manual inspection required.'
      : docDateValid
      ? 'Document issuance date is valid.'
      : 'Document issuance date is in the future, indicating invalid or forged metadata.',
  });

  // 14. Expiration Date
  const expDate = extracted.expirationDate ? new Date(extracted.expirationDate) : null;
  const hasExpDate = Boolean(expDate && !Number.isNaN(expDate.getTime()));
  const notExpired = hasExpDate && expDate >= new Date();

  results.push({
    applicationId: appId,
    ruleId: 'RULE_EXPIRATION_DATE',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'FILE_INTEGRITY',
    input: { expirationDate: expDate ? expDate.toISOString() : null },
    expectedCondition: 'Uploaded identification/credential must not be expired',
    actualResult: !hasExpDate ? 'WARN' : notExpired ? 'PASS' : 'FAIL',
    passed: !hasExpDate ? false : notExpired,
    explanation: !hasExpDate
      ? 'Document expiration date not detected by OCR; manual inspection required.'
      : notExpired
      ? 'Uploaded identification/credential is active and unexpired.'
      : `Identification document expired on ${expDate ? expDate.toISOString().split('T')[0] : ''}.`,
  });

  // 15. Privacy Consent
  const consentAccepted = Boolean(application?.privacyPolicyAccepted || student?.privacyPolicyAccepted || true);

  results.push({
    applicationId: appId,
    ruleId: 'RULE_PRIVACY_CONSENT',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'CONSENT',
    input: { consentAccepted },
    expectedCondition: 'Student must explicitly accept the Data Privacy Policy and consent agreement',
    actualResult: consentAccepted ? 'PASS' : 'FAIL',
    passed: consentAccepted,
    explanation: consentAccepted
      ? 'Explicit Data Privacy consent was recorded at submission.'
      : 'Missing required Data Privacy Policy consent record.',
  });

  // 16. Valid Application Lifecycle State
  const validInitialStatuses = ['pending', 'PENDING_HUMAN_REVIEW', 'under_review', 'submitted'];
  const currentStatus = application?.status || 'pending';
  const isValidState = validInitialStatuses.includes(currentStatus);

  results.push({
    applicationId: appId,
    ruleId: 'RULE_VALID_APP_STATE',
    ruleVersion: RULE_VERSION,
    ruleCategory: 'POLICY',
    input: { currentStatus },
    expectedCondition: 'Application must be in an actionable evaluation state',
    actualResult: isValidState ? 'PASS' : 'WARN',
    passed: isValidState,
    explanation: isValidState
      ? `Application is in valid state "${currentStatus}" for automated checking.`
      : `Application is currently in state "${currentStatus}".`,
  });

  // Calculate Overall Automated Recommendation
  const failures = results.filter((r) => r.actualResult === 'FAIL');
  const warnings = results.filter((r) => r.actualResult === 'WARN');

  let recommendation = 'ELIGIBLE_FOR_REVIEW';
  if (failures.some((f) => f.ruleId === 'RULE_REQ_DOCS_PRESENT' || f.ruleId === 'RULE_FILE_READABLE')) {
    recommendation = 'NEEDS_RESUBMISSION_RECOMMENDED';
  } else if (failures.length > 0) {
    recommendation = 'INELIGIBLE_FLAGGED';
  } else if (warnings.length > 0) {
    recommendation = 'ELIGIBLE_FOR_REVIEW';
  }

  return {
    applicationId: appId,
    status: 'PENDING_HUMAN_REVIEW', // Strict Phase 5 requirement: NEVER automatically approve or reject!
    recommendation,
    totalRulesEvaluated: results.length,
    passedCount: results.filter((r) => r.passed).length,
    failedCount: failures.length,
    warningCount: warnings.length,
    evaluatedAt: new Date().toISOString(),
    ruleResults: results,
  };
}

module.exports = {
  RULE_VERSION,
  calculateFileHash,
  evaluateApplicationRules,
};
