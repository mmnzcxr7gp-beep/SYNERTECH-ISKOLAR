/**
 * Canonical Application Status State Machine & Transition Validator
 */

const CANONICAL_STATUSES = [
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
];

const STATUS_SYNONYMS = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  under_automatic_check: 'UNDER_AUTOMATIC_CHECK',
  pending: 'PENDING_HUMAN_REVIEW',
  pending_human_review: 'PENDING_HUMAN_REVIEW',
  pending_manual_review: 'PENDING_MANUAL_REVIEW',
  'pending review': 'PENDING_HUMAN_REVIEW',
  under_review: 'PENDING_HUMAN_REVIEW',
  more_information_required: 'MORE_INFORMATION_REQUIRED',
  more_info_required: 'MORE_INFORMATION_REQUIRED',
  resubmission_required: 'RESUBMISSION_REQUIRED',
  needs_resubmission: 'RESUBMISSION_REQUIRED',
  interview_scheduled: 'INTERVIEW_SCHEDULED',
  examination_scheduled: 'EXAMINATION_SCHEDULED',
  exam_scheduled: 'EXAMINATION_SCHEDULED',
  qualified_for_final_review: 'QUALIFIED_FOR_FINAL_REVIEW',
  approved: 'APPROVED',
  accepted: 'APPROVED',
  rejected: 'REJECTED',
  denied: 'REJECTED',
  disqualified: 'REJECTED',
  cancelled: 'CANCELLED',
  closed: 'CLOSED',
};

const ALLOWED_TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_AUTOMATIC_CHECK', 'PENDING_HUMAN_REVIEW', 'PENDING_MANUAL_REVIEW', 'CANCELLED'],
  UNDER_AUTOMATIC_CHECK: ['PENDING_HUMAN_REVIEW', 'PENDING_MANUAL_REVIEW', 'CANCELLED'],
  PENDING_HUMAN_REVIEW: [
    'MORE_INFORMATION_REQUIRED',
    'RESUBMISSION_REQUIRED',
    'INTERVIEW_SCHEDULED',
    'EXAMINATION_SCHEDULED',
    'QUALIFIED_FOR_FINAL_REVIEW',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
  ],
  PENDING_MANUAL_REVIEW: [
    'MORE_INFORMATION_REQUIRED',
    'RESUBMISSION_REQUIRED',
    'INTERVIEW_SCHEDULED',
    'EXAMINATION_SCHEDULED',
    'QUALIFIED_FOR_FINAL_REVIEW',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
  ],
  MORE_INFORMATION_REQUIRED: ['PENDING_HUMAN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  RESUBMISSION_REQUIRED: ['PENDING_HUMAN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  INTERVIEW_SCHEDULED: ['QUALIFIED_FOR_FINAL_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'PENDING_HUMAN_REVIEW'],
  EXAMINATION_SCHEDULED: ['QUALIFIED_FOR_FINAL_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'PENDING_HUMAN_REVIEW'],
  QUALIFIED_FOR_FINAL_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED', 'PENDING_HUMAN_REVIEW'],
  APPROVED: ['CLOSED', 'CANCELLED'],
  REJECTED: ['CLOSED', 'RESUBMISSION_REQUIRED', 'MORE_INFORMATION_REQUIRED'],
  CANCELLED: ['CLOSED'],
  CLOSED: [],
};

/**
 * Normalizes any string or synonym into canonical uppercase status
 */
function normalizeStatus(status) {
  if (!status) return 'SUBMITTED';
  const clean = String(status).trim().toLowerCase();
  return STATUS_SYNONYMS[clean] || (CANONICAL_STATUSES.includes(status.toUpperCase()) ? status.toUpperCase() : null);
}

/**
 * Validates if transition from `currentStatus` to `nextStatus` is allowed.
 * Returns { valid: boolean, from: string, to: string, error?: string }
 */
function validateStatusTransition(currentStatus, nextStatus, actorRole = 'provider') {
  const from = normalizeStatus(currentStatus) || 'PENDING_HUMAN_REVIEW';
  const to = normalizeStatus(nextStatus);

  if (!to || !CANONICAL_STATUSES.includes(to)) {
    return {
      valid: false,
      from,
      to,
      error: `Invalid target status "${nextStatus}". Allowed statuses: ${CANONICAL_STATUSES.join(', ')}`,
    };
  }

  // Automation / System must NEVER assign APPROVED or REJECTED
  if ((to === 'APPROVED' || to === 'REJECTED') && actorRole === 'system') {
    return {
      valid: false,
      from,
      to,
      error: 'Automated processes are strictly forbidden from assigning final APPROVED or REJECTED statuses.',
    };
  }

  // Students cannot assign decision statuses
  if (actorRole === 'student' && !['SUBMITTED', 'PENDING_HUMAN_REVIEW', 'CANCELLED'].includes(to)) {
    return {
      valid: false,
      from,
      to,
      error: 'Students are not authorized to assign provider review or decision statuses.',
    };
  }

  // Same status is a no-op / allowed for re-saving metadata
  if (from === to) {
    return { valid: true, from, to };
  }

  // Administrator authority override: Admins have oversight authority to transition any active application
  if (actorRole === 'admin' && from !== 'CLOSED') {
    return { valid: true, from, to };
  }

  const allowedNext = ALLOWED_TRANSITIONS[from] || [];
  if (!allowedNext.includes(to)) {
    return {
      valid: false,
      from,
      to,
      error: `Illegal state transition from "${from}" to "${to}". Allowed next statuses: ${allowedNext.join(', ') || 'none (terminal state)'}`,
    };
  }

  return { valid: true, from, to };
}

module.exports = {
  CANONICAL_STATUSES,
  STATUS_SYNONYMS,
  ALLOWED_TRANSITIONS,
  normalizeStatus,
  validateStatusTransition,
};
