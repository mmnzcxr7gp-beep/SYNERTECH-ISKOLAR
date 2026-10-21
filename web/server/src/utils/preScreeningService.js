/**
 * ISKOLAR Rule-Based Applicant Pre-Screening Service
 * 
 * Complies with Panel Revision Requirement 5:
 * - Advises applicants not to proceed when submitted information or requirements indicate
 *   that they are incomplete or unqualified.
 * - Connects pre-screening directly to the scholarship's configured requirements & eligibility criteria.
 * - Rigorously distinguishes incomplete requirements from unmet eligibility criteria.
 * - Provides specific, actionable reasons and explains what the applicant can correct where applicable.
 * - Never treats an OCR failure or unreadable document alone as proof of ineligibility;
 *   routes extraction errors to manual review and student self-correction.
 * - Strict deterministic rule evaluation — no black-box or unsupported AI judgments.
 * - Strictly maintains separation between automated pre-screening recommendations and final administrative decisions.
 */

const { db } = require('../config/db');

/**
 * Normalizes text for comparison (case-insensitive, trims extra whitespace)
 */
function cleanStr(s) {
  if (s == null) return '';
  return String(s).trim().toLowerCase();
}

/**
 * Parse Philippine GWA/GPA into a standard float
 */
function parseGwa(val) {
  if (val == null || val === '') return null;
  const num = parseFloat(val);
  return Number.isNaN(num) ? null : num;
}

/**
 * Checks if student GWA satisfies the required GWA threshold.
 * Philippine grading scales:
 * Scale A: 1.0 (Highest) to 5.0 (Lowest/Failing) -> studentGwa <= minGwa (e.g. 1.75 <= 2.00 is PASS)
 * Scale B: 75% to 100% (Percentage) -> studentGwa >= minGwa (e.g. 88 >= 85 is PASS)
 */
function checkGwaEligibility(studentGwa, criteriaMinGwa) {
  if (criteriaMinGwa == null || criteriaMinGwa <= 0) return { passed: true };
  if (studentGwa == null) return { passed: false, reason: 'GWA / academic grade average is not provided or could not be detected.' };

  if (criteriaMinGwa <= 5.0) {
    // 1.0 - 5.0 scale
    const passed = studentGwa <= criteriaMinGwa;
    return {
      passed,
      reason: passed
        ? `Academic requirement satisfied: GWA ${studentGwa} meets the minimum requirement of ${criteriaMinGwa}.`
        : `Applicant GWA of ${studentGwa} does not satisfy the scholarship maximum allowed GWA of ${criteriaMinGwa} (1.0–5.0 scale, where lower is better).`,
    };
  } else {
    // Percentage scale (e.g. 85%)
    const passed = studentGwa >= criteriaMinGwa;
    return {
      passed,
      reason: passed
        ? `Academic requirement satisfied: GWA ${studentGwa}% meets the minimum requirement of ${criteriaMinGwa}%.`
        : `Applicant grade average of ${studentGwa}% is below the minimum required ${criteriaMinGwa}%.`,
    };
  }
}

/**
 * Pre-screens an application against a scholarship's actual configured criteria and requirements.
 * 
 * @param {object} params
 * @param {object} params.scholarship - Scholarship object (criteria_json, requirements, eligibilityRequirements)
 * @param {object} params.studentProfile - Profile object (gpa, school, course, yearLevel, familyIncome)
 * @param {Array<object>} [params.uploadedDocuments] - Documents attached by student
 * @param {object} [params.ocrExtraction] - Optional OCR extraction results
 * @returns {object} Pre-screening assessment report
 */
function preScreenApplicant({
  scholarship,
  studentProfile = {},
  uploadedDocuments = [],
  ocrExtraction = {},
}) {
  if (!scholarship) {
    throw new Error('Scholarship program reference is required for pre-screening evaluation.');
  }

  // 1. Extract Configured Requirements & Criteria
  const rawCriteria = scholarship.criteria_json
    ? (typeof scholarship.criteria_json === 'string' ? JSON.parse(scholarship.criteria_json) : scholarship.criteria_json)
    : (scholarship.criteria || {});

  const configuredRequirements = Array.isArray(scholarship.requirements)
    ? scholarship.requirements.map((r) => (typeof r === 'object' ? (r.requirementName || r.name || '') : String(r)).trim()).filter(Boolean)
    : [];

  const eligibilityText = scholarship.eligibilityRequirements || scholarship.eligibility_requirements || '';

  // Rule evaluations
  const incompleteReasons = [];
  const unmetCriteriaReasons = [];
  const extractionNotices = [];
  const actionableCorrections = [];
  const passedRules = [];

  // =========================================================================
  // RULE SET 1: DOCUMENT COMPLETENESS CHECK
  // =========================================================================
  const attachedDocNames = uploadedDocuments.map((d) =>
    cleanStr(d.requirementName || d.requirement || d.type || d.fieldname || d.originalname || '')
  );

  const missingRequirements = [];
  if (configuredRequirements.length > 0) {
    for (const req of configuredRequirements) {
      const normReq = cleanStr(req);
      const found = attachedDocNames.some((att) => att.includes(normReq) || normReq.includes(att));
      if (!found) {
        missingRequirements.push(req);
      }
    }
  }

  if (missingRequirements.length > 0) {
    incompleteReasons.push({
      type: 'MISSING_DOCUMENTS',
      title: 'Incomplete Required Documents',
      details: `The following required document(s) have not been attached: ${missingRequirements.join(', ')}.`,
      missingItems: missingRequirements,
    });
    actionableCorrections.push(`Please upload the missing document(s): ${missingRequirements.join(', ')}.`);
  } else if (configuredRequirements.length > 0) {
    passedRules.push({
      rule: 'REQUIRED_DOCUMENTS_ATTACHED',
      description: `All ${configuredRequirements.length} required document slot(s) are attached.`,
    });
  }

  // Check if zero documents uploaded at all
  if (uploadedDocuments.length === 0 && configuredRequirements.length > 0) {
    incompleteReasons.push({
      type: 'NO_DOCUMENTS_ATTACHED',
      title: 'No Documents Attached',
      details: 'You must upload the required academic credentials and identification files before proceeding.',
    });
  }

  // =========================================================================
  // RULE SET 2: OCR EXTRACTION & READABILITY (NON-DISQUALIFYING)
  // =========================================================================
  // "Do not treat an OCR failure alone as proof of ineligibility."
  if (ocrExtraction && ocrExtraction.hasError) {
    extractionNotices.push({
      type: 'OCR_PROCESSING_UNRESOLVED',
      title: 'Automated OCR Scan Incomplete',
      details: 'The optical scanner could not read text from one or more uploaded files clearly. This does NOT disqualify your application; an administrator will inspect the document manually.',
      canManualOverride: true,
    });
    actionableCorrections.push('Verify or manually correct your form fields to ensure all required details are accurate.');
  }

  // =========================================================================
  // RULE SET 3: GWA / ACADEMIC THRESHOLD ELIGIBILITY
  // =========================================================================
  const requiredMinGwa = parseGwa(rawCriteria.min_gwa || rawCriteria.gpa || scholarship.min_gwa);
  const studentGwa = parseGwa(studentProfile.gpa ?? studentProfile.gwa ?? ocrExtraction.extractedFields?.gpa);

  if (requiredMinGwa !== null && requiredMinGwa > 0) {
    if (studentGwa === null) {
      incompleteReasons.push({
        type: 'MISSING_ACADEMIC_METRIC',
        title: 'Missing GWA / GPA Record',
        details: 'A Grade Weighted Average (GWA) is required to evaluate eligibility for this scholarship.',
      });
      actionableCorrections.push('Enter your current cumulative GWA in your student profile or application form.');
    } else {
      const gwaCheck = checkGwaEligibility(studentGwa, requiredMinGwa);
      if (!gwaCheck.passed) {
        unmetCriteriaReasons.push({
          criterion: 'MINIMUM_GWA_THRESHOLD',
          title: 'Unmet GWA Qualification Threshold',
          details: gwaCheck.reason,
          applicantValue: studentGwa,
          requiredValue: requiredMinGwa,
        });
        actionableCorrections.push(`This scholarship requires a minimum GWA of ${requiredMinGwa}. You are advised not to submit if your grades do not meet this standard.`);
      } else {
        passedRules.push({
          rule: 'GWA_ELIGIBILITY_MET',
          description: gwaCheck.reason,
        });
      }
    }
  }

  // =========================================================================
  // RULE SET 4: YEAR LEVEL / COURSE / SCHOOL RESTRICTIONS (IF CONFIGURED)
  // =========================================================================
  // Course / Strand check
  const allowedCourses = Array.isArray(rawCriteria.allowed_courses) ? rawCriteria.allowed_courses : [];
  if (allowedCourses.length > 0) {
    const studentCourse = cleanStr(studentProfile.course || studentProfile.program);
    if (!studentCourse) {
      incompleteReasons.push({
        type: 'MISSING_COURSE_PROGRAM',
        title: 'Academic Program Not Specified',
        details: 'This scholarship requires enrollment in specific academic degrees or courses.',
      });
      actionableCorrections.push('Update your student profile to declare your current degree/course.');
    } else {
      const courseMatch = allowedCourses.some((c) => studentCourse.includes(cleanStr(c)));
      if (!courseMatch) {
        unmetCriteriaReasons.push({
          criterion: 'COURSE_RESTRICTION',
          title: 'Degree Program / Course Mismatch',
          details: `This scholarship is restricted to students enrolled in: ${allowedCourses.join(', ')}. Your declared program is "${studentProfile.course}".`,
          applicantValue: studentProfile.course,
          requiredValue: allowedCourses,
        });
      } else {
        passedRules.push({
          rule: 'COURSE_ELIGIBILITY_MET',
          description: `Course "${studentProfile.course}" satisfies the program requirements.`,
        });
      }
    }
  }

  // Year level check
  const allowedYearLevels = Array.isArray(rawCriteria.allowed_year_levels) ? rawCriteria.allowed_year_levels : [];
  if (allowedYearLevels.length > 0) {
    const studentYear = cleanStr(studentProfile.yearLevel || studentProfile.year_level);
    if (!studentYear) {
      incompleteReasons.push({
        type: 'MISSING_YEAR_LEVEL',
        title: 'Year Level Not Specified',
        details: 'This scholarship requires verification of your current college year level.',
      });
      actionableCorrections.push('Declare your current academic year level.');
    } else {
      const yearMatch = allowedYearLevels.some((y) => studentYear.includes(cleanStr(y)));
      if (!yearMatch) {
        unmetCriteriaReasons.push({
          criterion: 'YEAR_LEVEL_RESTRICTION',
          title: 'Year Level Ineligible',
          details: `This scholarship is restricted to students in: ${allowedYearLevels.join(', ')}. Your current level is "${studentProfile.yearLevel}".`,
          applicantValue: studentProfile.yearLevel,
          requiredValue: allowedYearLevels,
        });
      } else {
        passedRules.push({
          rule: 'YEAR_LEVEL_ELIGIBILITY_MET',
          description: `Year level "${studentProfile.yearLevel}" is eligible.`,
        });
      }
    }
  }

  // =========================================================================
  // DETERMINE PRE-SCREENING ADVISORY STATUS
  // =========================================================================
  let preScreeningStatus;
  let advisoryTitle;
  let advisoryMessage;
  let canProceedWithSubmission;

  if (unmetCriteriaReasons.length > 0) {
    // Unqualified based on configured criteria
    preScreeningStatus = 'UNQUALIFIED';
    canProceedWithSubmission = false;
    advisoryTitle = '⚠️ Pre-Screening Advisory: Unmet Eligibility Criteria';
    advisoryMessage =
      'Based on the scholarship’s configured eligibility criteria, your qualifications do not meet one or more required standards. We advise you not to proceed with this application, as it is likely to be rejected during administrative review.';
  } else if (incompleteReasons.length > 0) {
    // Missing required items or documents
    preScreeningStatus = 'INCOMPLETE';
    canProceedWithSubmission = false;
    advisoryTitle = '📋 Pre-Screening Advisory: Incomplete Requirements';
    advisoryMessage =
      'Your application is currently missing mandatory documents or profile details. Please complete the missing requirements before submitting.';
  } else if (extractionNotices.length > 0) {
    // Extraction needs manual review, but eligible
    preScreeningStatus = 'ELIGIBLE_WITH_MANUAL_REVIEW';
    canProceedWithSubmission = true;
    advisoryTitle = 'ℹ️ Pre-Screening Advisory: Document Review Needed';
    advisoryMessage =
      'Your declared profile meets preliminary eligibility criteria. However, optical text extraction requires manual inspection. You may proceed with submission; an administrator will verify your credentials manually.';
  } else {
    // Fully eligible and complete
    preScreeningStatus = 'QUALIFIED_AND_COMPLETE';
    canProceedWithSubmission = true;
    advisoryTitle = '✅ Pre-Screening Passed: Qualified to Apply';
    advisoryMessage =
      'Your profile information and uploaded documents satisfy the scholarship’s preliminary criteria. You may proceed to submit your application.';
  }

  return {
    preScreeningStatus,
    canProceedWithSubmission,
    advisoryTitle,
    advisoryMessage,
    // Strict separation: automated pre-screening is advisory only
    finalDecisionAuthority: 'Administrative Authority (Scholarship Provider Evaluators)',
    isAdministrativeFinalDecision: false,
    summary: {
      incompleteCount: incompleteReasons.length,
      unmetCriteriaCount: unmetCriteriaReasons.length,
      passedRulesCount: passedRules.length,
      extractionNoticesCount: extractionNotices.length,
    },
    incompleteRequirements: incompleteReasons,
    incompleteReasons,
    unmetEligibilityCriteria: unmetCriteriaReasons,
    unmetCriteriaReasons,
    extractionNotices,
    actionableCorrections,
    passedRules,
    evaluatedAt: new Date().toISOString(),
  };
}

module.exports = {
  checkGwaEligibility,
  preScreenApplicant,
};
