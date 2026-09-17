/**
 * ISKOLAR Document Authenticity & Anti-Hallucination Service
 * 
 * Ensures OCR results are grounded in actual document content:
 * - Structural marker validation per document type
 * - Per-field extraction evidence with source snippets
 * - Value sanity checks (names, dates, IDs)
 * - Authenticity scoring (0-100) with verdicts
 * 
 * Verdict scale:
 *   ≥75  GENUINE_DOCUMENT
 *   50–74 LIKELY_GENUINE
 *   25–49 UNCERTAIN
 *   <25  NOT_A_VALID_DOCUMENT
 */

/* ═══════════════════════════════════════════════════════════════════════════
   STRUCTURAL MARKER DEFINITIONS PER DOCUMENT TYPE
   ═══════════════════════════════════════════════════════════════════════════ */

const STRUCTURAL_MARKERS = {
  certificate_of_registration: {
    label: 'Certificate of Registration (COR)',
    required: [
      { id: 'cor_header', keywords: ['certificate of registration', 'registration form', 'enrollment form', 'registration certificate'], label: 'COR Header' },
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
    label: 'School ID',
    required: [
      { id: 'school_name', keywords: ['university', 'college', 'institute', 'school', 'polytechnic', 'academy', 'state u', 'technological'], label: 'School / Institution name' },
    ],
    optional: [
      { id: 'student_number', keywords: ['student no', 'student number', 'student id', 'id no', 'id number', 'lrn', 's.n.'], label: 'Student number' },
      { id: 'student_name', keywords: ['name', 'name:', 'student name', 'pangalan'], label: 'Student name field' },
      { id: 'validity', keywords: ['valid', 'validity', 'expiry', 'expiration', 'expires', 'valid until', 'valid thru', 'academic year', 'a.y.'], label: 'Validity period' },
      { id: 'course_program', keywords: ['course', 'program', 'department', 'bs ', 'b.s.', 'ba ', 'b.a.', 'bsit', 'bscs', 'bsce'], label: 'Course / Program' },
    ],
  },

  birth_certificate: {
    label: 'Birth Certificate',
    required: [
      { id: 'birth_header', keywords: ['certificate of live birth', 'birth certificate', 'certificate of birth', 'civil registry', 'civil registrar'], label: 'Birth Certificate header' },
    ],
    optional: [
      { id: 'child_name', keywords: ['name of child', 'first name', 'middle name', 'last name', 'child'], label: 'Child name fields' },
      { id: 'parents', keywords: ['father', 'mother', 'parent', 'maiden name', 'ama', 'ina'], label: 'Parent information' },
      { id: 'birth_details', keywords: ['date of birth', 'place of birth', 'time of birth', 'sex', 'citizenship', 'birthplace'], label: 'Birth details' },
      { id: 'registry', keywords: ['registry no', 'lcr', 'local civil registrar', 'municipal', 'city', 'psa', 'nso'], label: 'Registry reference' },
    ],
  },

  drivers_license: {
    label: "Driver's License",
    required: [
      { id: 'license_header', keywords: ['driver', 'license', "driver's license", 'lto', 'land transportation'], label: 'License header/agency' },
    ],
    optional: [
      { id: 'license_number', keywords: ['license no', 'license number', 'no.', 'dl no'], label: 'License number' },
      { id: 'personal_info', keywords: ['name', 'nationality', 'date of birth', 'address', 'sex', 'height', 'weight', 'blood type'], label: 'Personal information' },
      { id: 'expiry', keywords: ['expiration', 'expiry', 'valid until', 'valid thru'], label: 'Expiration date' },
      { id: 'restrictions', keywords: ['restriction', 'condition', 'class', 'category'], label: 'Restrictions / Category' },
    ],
  },

  passport: {
    label: 'Passport',
    required: [
      { id: 'passport_header', keywords: ['passport', 'republic of the philippines', 'republika ng pilipinas', 'department of foreign affairs'], label: 'Passport header' },
    ],
    optional: [
      { id: 'passport_number', keywords: ['passport no', 'passport number'], label: 'Passport number' },
      { id: 'personal_info', keywords: ['surname', 'given name', 'nationality', 'date of birth', 'sex', 'place of birth'], label: 'Personal information' },
      { id: 'expiry', keywords: ['date of expiry', 'expiration', 'valid until'], label: 'Expiry date' },
      { id: 'mrz', keywords: ['p<phl', 'p<phi'], label: 'Machine Readable Zone (MRZ)' },
    ],
  },

  philhealth_id: {
    label: 'PhilHealth ID',
    required: [
      { id: 'philhealth_header', keywords: ['philhealth', 'philippine health insurance', 'phic'], label: 'PhilHealth header' },
    ],
    optional: [
      { id: 'member_info', keywords: ['member', 'pin', 'philhealth number', 'id no', 'name'], label: 'Member information' },
      { id: 'category', keywords: ['category', 'member type', 'dependent', 'principal'], label: 'Membership category' },
    ],
  },

  voters_id: {
    label: "Voter's ID",
    required: [
      { id: 'voter_header', keywords: ['voter', 'comelec', 'commission on elections', "voter's", 'registration'], label: "Voter's ID / COMELEC header" },
    ],
    optional: [
      { id: 'vin', keywords: ['vin', 'voter identification', 'voter id no', 'voter no'], label: 'Voter Identification Number' },
      { id: 'precinct', keywords: ['precinct', 'barangay', 'municipality', 'city'], label: 'Precinct / Barangay' },
    ],
  },

  sss_id: {
    label: 'SSS ID',
    required: [
      { id: 'sss_header', keywords: ['sss', 'social security system', 'social security'], label: 'SSS header' },
    ],
    optional: [
      { id: 'sss_number', keywords: ['ss no', 'ss number', 'sss no', 'sss number', 'crn'], label: 'SSS number' },
      { id: 'member_name', keywords: ['name', 'member'], label: 'Member name' },
    ],
  },

  umid: {
    label: 'Unified Multi-Purpose ID (UMID)',
    required: [
      { id: 'umid_header', keywords: ['unified', 'multi-purpose', 'umid', 'multipurpose'], label: 'UMID header' },
    ],
    optional: [
      { id: 'crn', keywords: ['crn', 'common reference', 'reference number'], label: 'Common Reference Number' },
      { id: 'personal_info', keywords: ['name', 'date of birth', 'sex', 'address'], label: 'Personal information' },
    ],
  },

  national_id: {
    label: 'National ID (PhilSys)',
    required: [
      { id: 'philsys_header', keywords: ['national id', 'philsys', 'philippine identification', 'republic act 11055', 'philippine statistics authority', 'psa'], label: 'PhilSys / National ID header' },
    ],
    optional: [
      { id: 'pcn', keywords: ['pcn', 'philsys card number', 'philsys number', 'psn'], label: 'PhilSys Card Number' },
      { id: 'personal_info', keywords: ['name', 'date of birth', 'place of birth', 'sex', 'blood type', 'address'], label: 'Personal information' },
    ],
  },

  transcript_of_records: {
    label: 'Transcript of Records (TOR)',
    required: [
      { id: 'tor_header', keywords: ['transcript of records', 'transcript', 'official transcript', 'academic record', 'scholastic record'], label: 'TOR header' },
    ],
    optional: [
      { id: 'grades', keywords: ['grade', 'rating', 'final grade', 'midterm', 'prelim', 'gwa', 'gpa', 'weighted average'], label: 'Grade records' },
      { id: 'subjects', keywords: ['subject', 'course', 'description', 'units', 'credit'], label: 'Subject / Course listing' },
      { id: 'semester', keywords: ['semester', '1st sem', '2nd sem', 'summer', 'academic year', 'a.y.', 'sy ', 's.y.'], label: 'Semester / Academic year' },
      { id: 'institution', keywords: ['university', 'college', 'institute', 'school', 'registrar'], label: 'Institution name' },
      { id: 'student_info', keywords: ['student name', 'student no', 'student number', 'name:', 'course:', 'program:'], label: 'Student identification' },
    ],
  },

  certificate_of_grades: {
    label: 'Certificate of Grades (COG)',
    required: [
      { id: 'cog_header', keywords: ['certificate of grades', 'grades', 'grade report', 'grade slip', 'academic evaluation'], label: 'COG header' },
    ],
    optional: [
      { id: 'grades', keywords: ['grade', 'rating', 'final grade', 'gwa', 'gpa', 'weighted average', 'general average'], label: 'Grade records' },
      { id: 'subjects', keywords: ['subject', 'course', 'description', 'units', 'credit'], label: 'Subject / Course listing' },
      { id: 'semester', keywords: ['semester', '1st sem', '2nd sem', 'academic year', 'a.y.', 'trimester'], label: 'Semester / Academic year' },
      { id: 'institution', keywords: ['university', 'college', 'institute', 'school', 'registrar'], label: 'Institution name' },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   STRUCTURAL MARKER CHECKING
   ═══════════════════════════════════════════════════════════════════════════ */

function checkStructuralMarkers(rawText, documentType) {
  const lower = (rawText || '').toLowerCase();
  const definition = STRUCTURAL_MARKERS[documentType];

  if (!definition) {
    return {
      found: [],
      missing: [],
      expected: [],
      score: 0,
      requiredMet: false,
      documentTypeLabel: 'Unknown Document',
    };
  }

  const allMarkers = [...(definition.required || []), ...(definition.optional || [])];
  const found = [];
  const missing = [];

  for (const marker of allMarkers) {
    const isFound = marker.keywords.some((kw) => lower.includes(kw));
    if (isFound) {
      found.push({ id: marker.id, label: marker.label, status: 'FOUND' });
    } else {
      missing.push({ id: marker.id, label: marker.label, status: 'NOT_FOUND' });
    }
  }

  const requiredMet = (definition.required || []).every((marker) =>
    marker.keywords.some((kw) => lower.includes(kw))
  );

  const totalMarkers = allMarkers.length;
  const score = totalMarkers > 0 ? Math.round((found.length / totalMarkers) * 100) : 0;

  return {
    found,
    missing,
    expected: allMarkers.map((m) => ({ id: m.id, label: m.label })),
    score,
    requiredMet,
    documentTypeLabel: definition.label,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD VALUE SANITY VALIDATION (Anti-Hallucination)
   ═══════════════════════════════════════════════════════════════════════════ */

function validateFieldValue(fieldName, value) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { valid: false, reason: 'Empty or missing value', confidence: 'LOW' };
  }

  const trimmed = value.trim();

  switch (fieldName) {
    case 'fullName':
    case 'fatherName':
    case 'motherName': {
      const nonWs = trimmed.replace(/\s+/g, '');
      const alphaCount = (nonWs.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
      const totalChars = nonWs.length;
      const alphaRatio = totalChars > 0 ? alphaCount / totalChars : 0;

      if (trimmed.length < 2) {
        return { valid: false, reason: 'Name too short (less than 2 characters)', confidence: 'LOW' };
      }
      if (alphaRatio < 0.5) {
        return { valid: false, reason: 'Name contains too many non-alphabet characters — likely OCR noise', confidence: 'LOW' };
      }
      if (trimmed.length > 100) {
        return { valid: false, reason: 'Name suspiciously long — possible multi-line capture', confidence: 'LOW' };
      }
      if (/(.)\1{4,}/.test(trimmed)) {
        return { valid: false, reason: 'Repeating characters detected — likely OCR artifact', confidence: 'LOW' };
      }
      return {
        valid: true,
        reason: null,
        confidence: alphaRatio >= 0.85 && trimmed.length >= 4 ? 'HIGH' : 'MEDIUM',
      };
    }

    case 'idNumber': {
      const alnumCount = (trimmed.match(/[a-zA-Z0-9]/g) || []).length;
      const alnumRatio = trimmed.length > 0 ? alnumCount / trimmed.length : 0;

      if (trimmed.length < 3) {
        return { valid: false, reason: 'ID number too short', confidence: 'LOW' };
      }
      if (alnumRatio < 0.5) {
        return { valid: false, reason: 'ID number contains too many special characters — likely OCR noise', confidence: 'LOW' };
      }
      return {
        valid: true,
        reason: null,
        confidence: alnumRatio > 0.8 ? 'HIGH' : 'MEDIUM',
      };
    }

    case 'dateOfBirth':
    case 'expirationDate': {
      const dateAttempt = new Date(trimmed);
      if (Number.isNaN(dateAttempt.getTime())) {
        const datePatterns = [
          /\d{4}[-/]\d{1,2}[-/]\d{1,2}/,
          /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/,
          /\w+\s+\d{1,2},?\s*\d{4}/,
        ];
        const matchesPattern = datePatterns.some((p) => p.test(trimmed));
        if (!matchesPattern) {
          return { valid: false, reason: 'Does not look like a valid date', confidence: 'LOW' };
        }
        return { valid: true, reason: null, confidence: 'MEDIUM' };
      }
      const year = dateAttempt.getFullYear();
      if (year < 1900 || year > 2100) {
        return { valid: false, reason: `Year ${year} is out of plausible range (1900-2100)`, confidence: 'LOW' };
      }
      return { valid: true, reason: null, confidence: 'HIGH' };
    }

    case 'sex': {
      const sexNorm = trimmed.toLowerCase();
      if (['male', 'female', 'm', 'f'].includes(sexNorm)) {
        return { valid: true, reason: null, confidence: 'HIGH' };
      }
      return { valid: false, reason: 'Unrecognized sex/gender value', confidence: 'LOW' };
    }

    case 'birthplace':
    case 'address': {
      if (trimmed.length < 3) {
        return { valid: false, reason: 'Location value too short', confidence: 'LOW' };
      }
      const alphaCount = (trimmed.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
      const alphaRatio = trimmed.length > 0 ? alphaCount / trimmed.length : 0;
      if (alphaRatio < 0.3) {
        return { valid: false, reason: 'Location contains too few alphabet characters', confidence: 'LOW' };
      }
      return { valid: true, reason: null, confidence: alphaRatio > 0.6 ? 'HIGH' : 'MEDIUM' };
    }

    default:
      return { valid: trimmed.length > 0, reason: null, confidence: 'MEDIUM' };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   OCR TEXT QUALITY ASSESSMENT
   ═══════════════════════════════════════════════════════════════════════════ */

function assessOcrQuality(rawText, tesseractConfidence = 0) {
  const text = rawText || '';
  const rawTextLength = text.length;
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  const readableWords = words.filter((w) => (w.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length >= 2);
  const readableRatio = wordCount > 0 ? readableWords.length / wordCount : 0;

  const hasReadableContent = wordCount >= 3 && readableRatio >= 0.3;

  let readabilityScore = 0;
  if (wordCount >= 3) readabilityScore += 20;
  if (wordCount >= 10) readabilityScore += 15;
  if (wordCount >= 25) readabilityScore += 10;
  if (readableRatio >= 0.3) readabilityScore += 15;
  if (readableRatio >= 0.6) readabilityScore += 15;
  if (readableRatio >= 0.8) readabilityScore += 10;
  if (tesseractConfidence >= 50) readabilityScore += 5;
  if (tesseractConfidence >= 70) readabilityScore += 5;
  if (tesseractConfidence >= 85) readabilityScore += 5;

  return {
    rawTextLength,
    wordCount,
    confidence: tesseractConfidence,
    hasReadableContent,
    readabilityScore: Math.min(readabilityScore, 100),
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
            matchStart: matchIndex,
            matchEnd,
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
            matchStart: match.index || 0,
            matchEnd: (match.index || 0) + match[0].length,
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
        validationReason: 'Not found in document text',
      };
    }
  }

  return { fields, evidence };
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTHENTICITY SCORE COMPUTATION
   ═══════════════════════════════════════════════════════════════════════════ */

function computeAuthenticityScore({ structuralResult, ocrQuality, evidence }) {
  const structuralScore = Math.round((structuralResult.score / 100) * 40);
  const ocrScore = Math.round((ocrQuality.readabilityScore / 100) * 20);

  const evidenceEntries = Object.values(evidence || {});
  const validFields = evidenceEntries.filter((e) => e.valid && e.confidence !== 'LOW');
  const totalExpectedFields = Math.max(evidenceEntries.length, 1);
  const fieldRatio = validFields.length / totalExpectedFields;
  const fieldScore = Math.round(fieldRatio * 25);

  const requiredScore = structuralResult.requiredMet ? 15 : 0;

  const total = structuralScore + ocrScore + fieldScore + requiredScore;
  const clampedTotal = Math.min(100, Math.max(0, total));

  let verdict;
  if (clampedTotal >= 75) {
    verdict = 'GENUINE_DOCUMENT';
  } else if (clampedTotal >= 50) {
    verdict = 'LIKELY_GENUINE';
  } else if (clampedTotal >= 25) {
    verdict = 'UNCERTAIN';
  } else {
    verdict = 'NOT_A_VALID_DOCUMENT';
  }

  return {
    authenticityScore: clampedTotal,
    verdict,
    breakdown: {
      structuralMarkers: { score: structuralScore, maxScore: 40, raw: structuralResult.score },
      ocrQuality: { score: ocrScore, maxScore: 20, raw: ocrQuality.readabilityScore },
      fieldExtraction: { score: fieldScore, maxScore: 25, validCount: validFields.length, totalExpected: totalExpectedFields },
      requiredMarkers: { score: requiredScore, maxScore: 15, met: structuralResult.requiredMet },
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MASTER ASSESSMENT FUNCTION
   ═══════════════════════════════════════════════════════════════════════════ */

function assessDocumentAuthenticity({
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
          matchIndex: idx,
          matchLength: valStr.length,
          confidence: validation.confidence,
          valid: validation.valid,
          validationReason: validation.reason,
        };
      }
    }
  }

  const { authenticityScore, verdict, breakdown } = computeAuthenticityScore({
    structuralResult,
    ocrQuality,
    evidence: effectiveEvidence,
    documentType,
  });

  const warnings = [];

  if (!structuralResult.requiredMet) {
    warnings.push('Required document header not detected — this may not be a valid ' + (structuralResult.documentTypeLabel || documentType));
  }
  if (!ocrQuality.hasReadableContent) {
    warnings.push('Document text is not readable — image may be blurry, rotated, or too low quality');
  }
  if (confidence > 0 && confidence < 50) {
    warnings.push('OCR confidence is very low (' + confidence + '%) — extracted data may be unreliable');
  }

  for (const [fieldName, ev] of Object.entries(evidence)) {
    if (ev.rejected) {
      warnings.push('"' + fieldName + '" was found but rejected: ' + ev.rejectionReason);
    } else if (!ev.valid && ev.validationReason === 'Not found in document text') {
      warnings.push('"' + fieldName + '" was not found on the document');
    }
  }

  const isCorrectPaper = structuralResult.requiredMet && authenticityScore >= 25;

  return {
    isCorrectPaper,
    authenticityScore,
    verdict,
    breakdown,
    structuralMarkers: {
      found: structuralResult.found,
      missing: structuralResult.missing,
      expected: structuralResult.expected,
      score: structuralResult.score,
      requiredMet: structuralResult.requiredMet,
      documentTypeLabel: structuralResult.documentTypeLabel,
    },
    extractionEvidence: effectiveEvidence,
    ocrQuality,
    warnings,
    ocrActuallyScanned: Boolean(rawText && rawText.trim().length > 0),
  };
}

module.exports = {
  STRUCTURAL_MARKERS,
  checkStructuralMarkers,
  validateFieldValue,
  assessOcrQuality,
  extractFieldsWithEvidence,
  computeAuthenticityScore,
  assessDocumentAuthenticity,
};
