/**
 * ISKOLAR Document Extraction & Administrative Verification Service
 * 
 * Complies with Panel Revision Requirements 2 & 3:
 * - Renamed and redesigned from "document authentication" to "document extraction and administrative verification".
 * - Clarifies that OCR processes optical text and structural markers for administrative review;
 *   OCR does NOT independently authenticate document genuineness or legal legitimacy.
 * - Administrators and scholarship providers perform final authenticity review manually.
 * - Identifies supported formats (PNG, JPG, JPEG, WebP for direct OCR optical inspection; PDF for administrative review).
 * - Handles unreadable files, missing fields, processing errors, and low-confidence scans without silent acceptance.
 * - Provides explainable extraction quality metrics and evidence snippets for human reviewers.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   STRUCTURAL MARKER DEFINITIONS PER SUPPORTED DOCUMENT TYPE
   ═══════════════════════════════════════════════════════════════════════════ */

const STRUCTURAL_MARKERS = {
  certificate_of_registration: {
    label: 'Certificate of Registration (COR) / Enrollment Assessment',
    supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    required: [
      { id: 'cor_header', keywords: ['certificate of registration', 'registration form', 'enrollment form', 'registration certificate', 'certificate of enrollment', 'coe'], label: 'Enrollment / Registration Header' },
    ],
    optional: [
      { id: 'semester_info', keywords: ['semester', '1st sem', '2nd sem', 'first semester', 'second semester', 'summer', 'trimester', 'academic year', 'a.y.', 'sy ', 's.y.'], label: 'Semester / Academic Year' },
      { id: 'course_subjects', keywords: ['subject', 'course', 'units', 'credit', 'section', 'schedule', 'lecture', 'laboratory'], label: 'Course / Subject listing' },
      { id: 'student_info', keywords: ['student name', 'student no', 'student number', 'student id', 'id no', 'name:'], label: 'Student identification' },
      { id: 'institution', keywords: ['university', 'college', 'institute', 'school', 'polytechnic', 'academy', 'state u'], label: 'Institution name' },
      { id: 'registrar', keywords: ['registrar', 'registration', 'office of', 'enrollment'], label: 'Registrar office reference' },
    ],
  },

  school_id: {
    label: 'Student / Institutional Identification Card',
    supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
    required: [
      { id: 'school_name', keywords: ['university', 'college', 'institute', 'school', 'polytechnic', 'academy', 'state u', 'technological', 'pamantasan'], label: 'School / Institution name' },
    ],
    optional: [
      { id: 'student_number', keywords: ['student no', 'student number', 'student id', 'id no', 'id number', 'lrn', 's.n.'], label: 'Student identification number' },
      { id: 'student_name', keywords: ['name', 'name:', 'student name', 'pangalan'], label: 'Student name field' },
      { id: 'validity', keywords: ['valid', 'validity', 'expiry', 'expiration', 'expires', 'valid until', 'valid thru', 'academic year', 'a.y.'], label: 'Validity period' },
      { id: 'course_program', keywords: ['course', 'program', 'department', 'bs ', 'b.s.', 'ba ', 'b.a.', 'bsit', 'bscs', 'bsce'], label: 'Course / Program' },
    ],
  },

  transcript_of_records: {
    label: 'Transcript of Records (TOR) / Certificate of Grades (COG)',
    supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    required: [
      { id: 'tor_header', keywords: ['transcript of records', 'official transcript', 'scholastic record', 'certificate of grades', 'report of grades', 'grade slip'], label: 'Academic Transcript Header' },
    ],
    optional: [
      { id: 'gwa_metric', keywords: ['gwa', 'gpa', 'general weighted average', 'grade point average', 'average', 'cumulative'], label: 'GWA / GPA Metric' },
      { id: 'subject_grades', keywords: ['grade', 'mark', 'units', 'remarks', 'passed', 'credit'], label: 'Course grades listing' },
      { id: 'registrar_signature', keywords: ['registrar', 'official', 'sealed', 'certified', 'university registrar'], label: 'Registrar certification notice' },
    ],
  },

  birth_certificate: {
    label: 'Philippine Statistics Authority (PSA) / NSO Birth Certificate',
    supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    required: [
      { id: 'birth_header', keywords: ['certificate of live birth', 'birth certificate', 'certificate of birth', 'civil registry', 'civil registrar', 'republic of the philippines'], label: 'Birth Certificate header' },
    ],
    optional: [
      { id: 'child_name', keywords: ['name of child', 'first name', 'middle name', 'last name', 'child'], label: 'Child name fields' },
      { id: 'parents', keywords: ['father', 'mother', 'parent', 'maiden name', 'ama', 'ina'], label: 'Parent information' },
      { id: 'birth_details', keywords: ['date of birth', 'place of birth', 'time of birth', 'sex', 'citizenship', 'birthplace'], label: 'Birth details' },
      { id: 'registry', keywords: ['registry no', 'lcr', 'local civil registrar', 'municipal', 'city', 'psa', 'nso'], label: 'Registry reference' },
    ],
  },

  national_id: {
    label: 'Philippine Identification System (PhilSys) National ID',
    supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
    required: [
      { id: 'national_header', keywords: ['philippine identification system', 'philsys', 'republika ng pilipinas', 'national id', 'philid'], label: 'PhilSys National ID header' },
    ],
    optional: [
      { id: 'pcn_number', keywords: ['pcn', 'philid card number', 'id number', 'crn'], label: 'PCN / PhilSys Card Number' },
      { id: 'personal_info', keywords: ['apelyido', 'mga pangalan', 'gitnang apelyido', 'petsa ng kapanganakan', 'kasarian', 'tirahan', 'sex', 'date of birth'], label: 'Cardholder demographic fields' },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   STRUCTURAL MARKER INSPECTION
   ═══════════════════════════════════════════════════════════════════════════ */

function checkStructuralMarkers(rawText = '', documentType = 'unknown') {
  const normText = (rawText || '').toLowerCase();
  const docConfig = STRUCTURAL_MARKERS[documentType];

  if (!docConfig) {
    return {
      documentType,
      documentTypeLabel: 'General Document',
      requiredMet: true,
      found: [],
      missing: [],
      score: 50,
      supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    };
  }

  const found = [];
  const missing = [];

  for (const marker of docConfig.required) {
    const matched = marker.keywords.some((kw) => normText.includes(kw));
    if (matched) found.push({ ...marker, isRequired: true });
    else missing.push({ ...marker, isRequired: true });
  }

  for (const marker of docConfig.optional) {
    const matched = marker.keywords.some((kw) => normText.includes(kw));
    if (matched) found.push({ ...marker, isRequired: false });
    else missing.push({ ...marker, isRequired: false });
  }

  const requiredMet = docConfig.required.every((r) =>
    r.keywords.some((kw) => normText.includes(kw))
  );

  const totalMarkers = docConfig.required.length + docConfig.optional.length;
  const score = totalMarkers > 0 ? Math.round((found.length / totalMarkers) * 100) : 50;

  return {
    documentType,
    documentTypeLabel: docConfig.label,
    supportedFormats: docConfig.supportedFormats,
    requiredMet,
    found,
    missing,
    score,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD VALUE SANITY VALIDATION
   ═══════════════════════════════════════════════════════════════════════════ */

function validateFieldValue(fieldName, value, rawContext = '') {
  if (!value || typeof value !== 'string') {
    return { valid: false, reason: 'Empty or missing field value', confidence: 'LOW' };
  }

  const trimmed = value.trim();

  switch (fieldName) {
    case 'fullName':
    case 'studentName': {
      if (trimmed.length < 3) {
        return { valid: false, reason: 'Extracted name is too short (<3 chars)', confidence: 'LOW' };
      }
      if (/[<>{}[\]\\\/=+]/.test(trimmed)) {
        return { valid: false, reason: 'Extracted name contains invalid symbols/formatting artifacts', confidence: 'LOW' };
      }
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (words.length < 2) {
        return { valid: true, reason: 'Single name token extracted; administrator review recommended', confidence: 'MEDIUM' };
      }
      return { valid: true, reason: null, confidence: 'HIGH' };
    }

    case 'idNumber':
    case 'studentNumber': {
      if (trimmed.length < 4) {
        return { valid: false, reason: 'ID number is too short (<4 characters)', confidence: 'LOW' };
      }
      if (!/\d/.test(trimmed)) {
        return { valid: false, reason: 'ID number contains no numeric digits', confidence: 'LOW' };
      }
      return { valid: true, reason: null, confidence: 'HIGH' };
    }

    case 'gpa':
    case 'gwa': {
      const num = parseFloat(trimmed);
      if (Number.isNaN(num) || num <= 0) {
        return { valid: false, reason: 'Invalid numeric GWA/GPA representation', confidence: 'LOW' };
      }
      // Philippine 1.0 - 5.0 scale OR 75% - 100% scale
      if (num >= 1.0 && num <= 5.0) {
        return { valid: true, reason: null, confidence: 'HIGH' };
      }
      if (num >= 70 && num <= 100) {
        return { valid: true, reason: null, confidence: 'HIGH' };
      }
      return { valid: false, reason: 'Extracted GWA value outside recognized Philippine grading scales (1.0-5.0 or 70-100)', confidence: 'LOW' };
    }

    case 'dateOfBirth':
    case 'expirationDate': {
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) {
        return { valid: false, reason: 'Unparseable date format', confidence: 'LOW' };
      }
      return { valid: true, reason: null, confidence: 'HIGH' };
    }

    default:
      return { valid: trimmed.length > 0, reason: null, confidence: 'MEDIUM' };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   OCR READABILITY ASSESSMENT
   ═══════════════════════════════════════════════════════════════════════════ */

function assessOcrQuality(rawText, tesseractConfidence = 0) {
  const text = rawText || '';
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const readableWords = words.filter((w) => (w.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length >= 2);
  const readableRatio = wordCount > 0 ? readableWords.length / wordCount : 0;
  const hasReadableContent = wordCount >= 3 && readableRatio >= 0.3;

  let qualityScore = 0;
  if (wordCount >= 3) qualityScore += 20;
  if (wordCount >= 10) qualityScore += 20;
  if (readableRatio >= 0.5) qualityScore += 30;
  if (tesseractConfidence >= 60) qualityScore += 30;

  return {
    rawTextLength: text.length,
    wordCount,
    confidence: tesseractConfidence,
    hasReadableContent,
    readabilityScore: Math.min(qualityScore, 100),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVIDENCE-BASED FIELD EXTRACTION
   ═══════════════════════════════════════════════════════════════════════════ */

function extractFieldsWithEvidence(rawText, fieldPatterns) {
  const fields = {};
  const evidence = {};

  if (!rawText || !rawText.trim()) {
    return { fields, evidence };
  }

  for (const [fieldName, patterns] of Object.entries(fieldPatterns)) {
    let bestMatch = null;

    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        const validation = validateFieldValue(fieldName, value);

        if (validation.valid) {
          const matchIndex = match.index || 0;
          const matchEnd = matchIndex + match[0].length;
          const contextStart = Math.max(0, matchIndex - 15);
          const contextEnd = Math.min(rawText.length, matchEnd + 15);
          const sourceSnippet = rawText.substring(contextStart, contextEnd).replace(/\n/g, ' ').trim();

          bestMatch = {
            value,
            source: sourceSnippet,
            fullMatch: match[0].trim(),
            confidence: validation.confidence,
            valid: true,
            validationReason: null,
          };
          break;
        } else if (!bestMatch) {
          bestMatch = {
            value,
            source: match[0].trim(),
            fullMatch: match[0].trim(),
            confidence: 'LOW',
            valid: false,
            validationReason: validation.reason,
          };
        }
      }
    }

    if (bestMatch && bestMatch.valid) {
      fields[fieldName] = bestMatch.value;
      evidence[fieldName] = bestMatch;
    } else if (bestMatch && !bestMatch.valid) {
      evidence[fieldName] = {
        ...bestMatch,
        rejected: true,
        rejectionReason: bestMatch.validationReason,
      };
    } else {
      evidence[fieldName] = {
        value: null,
        source: null,
        confidence: null,
        valid: false,
        validationReason: 'Not found in document optical text',
      };
    }
  }

  return { fields, evidence };
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXTRACTION QUALITY & ADMINISTRATIVE VERIFICATION STATUS
   ═══════════════════════════════════════════════════════════════════════════ */

function computeExtractionQuality({ structuralResult, ocrQuality, evidence }) {
  const structuralPart = Math.round((structuralResult.score / 100) * 40);
  const ocrPart = Math.round((ocrQuality.readabilityScore / 100) * 30);

  const evidenceEntries = Object.values(evidence || {});
  const validFields = evidenceEntries.filter((e) => e.valid && e.confidence !== 'LOW');
  const totalExpected = Math.max(evidenceEntries.length, 1);
  const fieldPart = Math.round((validFields.length / totalExpected) * 30);

  const totalScore = Math.min(100, structuralPart + ocrPart + fieldPart);

  let extractionVerdict;
  let verificationRecommendation;

  if (!ocrQuality.hasReadableContent || totalScore < 25) {
    extractionVerdict = 'UNREADABLE_OR_INVALID_FORMAT';
    verificationRecommendation = 'MANUAL_INSPECTION_OR_RESUBMISSION';
  } else if (totalScore < 50) {
    extractionVerdict = 'UNCERTAIN_EXTRACTION';
    verificationRecommendation = 'STUDENT_CONFIRMATION_AND_ADMIN_REVIEW';
  } else if (totalScore < 75) {
    extractionVerdict = 'EXTRACTION_MEDIUM_CONFIDENCE';
    verificationRecommendation = 'ADMINISTRATIVE_VERIFICATION_REQUIRED';
  } else {
    extractionVerdict = 'EXTRACTION_HIGH_CONFIDENCE';
    verificationRecommendation = 'ADMINISTRATIVE_VERIFICATION_READY';
  }

  return {
    extractionQualityScore: totalScore,
    extractionVerdict,
    verificationRecommendation,
    // Administrative notice stating final authority
    verificationNotice: 'OCR extraction assists in automated data entry. Final document validity and qualification are determined exclusively by authorized human administrators.',
    breakdown: {
      structuralMarkers: { score: structuralPart, maxScore: 40, raw: structuralResult.score },
      ocrQuality: { score: ocrPart, maxScore: 30, raw: ocrQuality.readabilityScore },
      fieldExtraction: { score: fieldPart, maxScore: 30, validCount: validFields.length, totalExpected },
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MASTER DOCUMENT EXTRACTION & VERIFICATION ASSESSMENT
   ═══════════════════════════════════════════════════════════════════════════ */

function assessDocumentExtractionAndVerification({
  rawText = '',
  confidence = 0,
  ocrConfidence = 0,
  documentType = 'unknown',
  extractedFields = {},
  evidence = {},
}) {
  const effectiveConfidence = Number(confidence || ocrConfidence || 0);
  const structuralResult = checkStructuralMarkers(rawText, documentType);
  const ocrQuality = assessOcrQuality(rawText, effectiveConfidence);

  const effectiveEvidence = { ...evidence };
  if (Object.keys(effectiveEvidence).length === 0 && Object.keys(extractedFields).length > 0) {
    for (const [key, val] of Object.entries(extractedFields)) {
      if (val != null) {
        const valStr = String(val);
        const idx = rawText.indexOf(valStr);
        const source = idx !== -1 ? rawText.substring(Math.max(0, idx - 20), Math.min(rawText.length, idx + valStr.length + 20)).trim() : valStr;
        const validation = validateFieldValue(key, valStr, rawText);
        effectiveEvidence[key] = {
          value: valStr,
          source,
          confidence: validation.confidence,
          valid: validation.valid,
          validationReason: validation.reason,
        };
      }
    }
  }

  const {
    extractionQualityScore,
    extractionVerdict,
    verificationRecommendation,
    verificationNotice,
    breakdown,
  } = computeExtractionQuality({
    structuralResult,
    ocrQuality,
    evidence: effectiveEvidence,
  });

  const warnings = [];
  if (!structuralResult.requiredMet) {
    warnings.push(`Expected document header for "${structuralResult.documentTypeLabel}" was not detected.`);
  }
  if (!ocrQuality.hasReadableContent) {
    warnings.push('Document optical text is unreadable or blurry; manual entry and administrative inspection are required.');
  }
  if (effectiveConfidence > 0 && effectiveConfidence < 50) {
    warnings.push(`Optical OCR confidence is low (${effectiveConfidence}%); please confirm all extracted values.`);
  }

  const isExtractionUsable = structuralResult.requiredMet && extractionQualityScore >= 25;

  return {
    isExtractionUsable,
    extractionQualityScore,
    extractionVerdict,
    verificationRecommendation,
    verificationNotice,
    breakdown,
    structuralMarkers: {
      found: structuralResult.found,
      missing: structuralResult.missing,
      requiredMet: structuralResult.requiredMet,
      documentTypeLabel: structuralResult.documentTypeLabel,
    },
    ocrQuality,
    extractionEvidence: effectiveEvidence,
    warnings,
    administrativeVerificationStatus: 'PENDING_ADMIN_VERIFICATION',

    // Backward compatibility aliases for existing UI clients
    isCorrectPaper: isExtractionUsable,
    authenticityScore: extractionQualityScore,
    verdict: extractionVerdict === 'EXTRACTION_HIGH_CONFIDENCE'
      ? 'EXTRACTION_HIGH_CONFIDENCE'
      : extractionVerdict,
  };
}

function assessDocumentExtractionQuality(rawText, docType = 'certificate_of_registration', confidence = 85) {
  return assessDocumentExtractionAndVerification({
    rawText,
    documentType: docType,
    ocrConfidence: confidence,
  });
}

function determineVerificationStatus({ studentConfirmed = false, adminApproved = false, reviewedBy = null }) {
  if (adminApproved) {
    return {
      status: 'ADMIN_VERIFIED',
      label: 'Verified by Administrator',
      verifiedBy: reviewedBy || 'admin_evaluator',
    };
  }
  if (studentConfirmed) {
    return {
      status: 'PENDING_ADMIN_VERIFICATION',
      label: 'OCR Confirmed by Student • Pending Admin Review',
      verifiedBy: null,
    };
  }
  return {
    status: 'EXTRACTION_IN_REVIEW',
    label: 'Under Student Review',
    verifiedBy: null,
  };
}

module.exports = {
  STRUCTURAL_MARKERS,
  checkStructuralMarkers,
  validateFieldValue,
  assessOcrQuality,
  extractFieldsWithEvidence,
  computeExtractionQuality,
  assessDocumentExtractionAndVerification,
  assessDocumentExtractionQuality,
  determineVerificationStatus,
  // Alias for backward compatibility
  assessDocumentAuthenticity: assessDocumentExtractionAndVerification,
};
