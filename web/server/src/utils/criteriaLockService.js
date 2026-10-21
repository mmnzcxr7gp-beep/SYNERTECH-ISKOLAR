/**
 * ISKOLAR Criteria Locking & Auditable Revision Service
 * 
 * Implements Panel Revision Requirement 4:
 * - Locks scholarship eligibility criteria and evaluation parameters once at least one application is submitted.
 * - Enforces restrictions at backend API layer, blocking unauthorized silent mutations.
 * - Preserves historical criteria version used for existing applications.
 * - Provides a controlled, auditable revision workflow with actor identification, mandatory justification,
 *   immutable timestamps, change history logging, and explicit handling of affected applications.
 */

const { db } = require('../config/db');

/**
 * Checks if eligibility criteria and evaluation parameters are locked for a scholarship.
 * Locked condition: At least one application has been submitted.
 * 
 * @param {string|number} scholarshipId 
 * @returns {Promise<{ isLocked: boolean, count: number, lockedReason?: string }>}
 */
async function checkCriteriaLock(scholarshipId) {
  const targetIdStr = String(scholarshipId);
  let count = 0;

  // 1. Check in-memory lowdb
  if (Array.isArray(db.data?.applications)) {
    const memApps = db.data.applications.filter((a) => {
      const aScholarId = String(a.scholarship_id || a.scholarshipId || '');
      return aScholarId === targetIdStr;
    });
    count = Math.max(count, memApps.length);
  }

  // 2. Check MongoDB applications collections
  const mongoose = require('mongoose');
  if (mongoose.connection?.readyState === 1) {
    try {
      if (db.collections?.applications) {
        const num = Number(targetIdStr);
        const query = {
          $or: [
            { scholarship_id: targetIdStr },
            { scholarshipId: targetIdStr },
            ...(!Number.isNaN(num) ? [{ scholarship_id: num }, { scholarshipId: num }] : []),
          ],
        };
        const dbCount = await db.collections.applications.countDocuments(query).catch(() => 0);
        count = Math.max(count, dbCount);
      }

      const { ScholarshipApplication, Scholarship } = require('../models');
      if (ScholarshipApplication && mongoose.Types.ObjectId.isValid(targetIdStr)) {
        const mCount = await ScholarshipApplication.countDocuments({
          scholarshipId: new mongoose.Types.ObjectId(targetIdStr),
        }).catch(() => 0);
        count = Math.max(count, mCount);
      }

      if (Scholarship) {
        let scholarDoc = null;
        if (mongoose.Types.ObjectId.isValid(targetIdStr)) {
          scholarDoc = await Scholarship.findById(targetIdStr).lean().catch(() => null);
        }
        if (!scholarDoc && !Number.isNaN(Number(targetIdStr))) {
          scholarDoc = await Scholarship.findOne({
            $or: [{ id: Number(targetIdStr) }, { id: targetIdStr }],
          }).lean().catch(() => null);
        }
        if (scholarDoc && typeof scholarDoc.applicantsCount === 'number') {
          count = Math.max(count, scholarDoc.applicantsCount);
        }
      }
    } catch (err) {
      console.warn('[CriteriaLockService] DB lock check notice:', err.message);
    }
  }

  const isLocked = count > 0;
  return {
    isLocked,
    count,
    lockedReason: isLocked
      ? `Eligibility criteria and evaluation parameters are locked because ${count} application(s) have already been submitted. Direct modification is prohibited; a controlled, auditable criteria revision must be performed.`
      : null,
  };
}

/**
 * Asserts that a scholarship's criteria are not locked.
 * Throws 403 error if criteria modification is attempted after the first application.
 * 
 * @param {string|number} scholarshipId 
 */
async function assertCriteriaNotLocked(scholarshipId) {
  const lockStatus = await checkCriteriaLock(scholarshipId);
  if (lockStatus.isLocked) {
    const error = new Error(lockStatus.lockedReason);
    error.code = 'CRITERIA_LOCKED_AFTER_SUBMISSION';
    error.statusCode = 403;
    error.isCriteriaLocked = true;
    error.applicationsCount = lockStatus.count;
    throw error;
  }
}

/**
 * Executes a controlled, auditable criteria revision
 * 
 * @param {object} params
 * @param {string|number} params.scholarshipId
 * @param {object} params.actor - Authenticated req.user ({ id, role, name, email })
 * @param {string} params.editReason - Mandatory formal justification
 * @param {object} [params.newCriteria] - Updated evaluation criteria JSON/object
 * @param {Array<string|object>} [params.newRequirements] - Updated required documents
 * @param {string} [params.eligibilityRequirements] - Text description of eligibility
 * @param {string} [params.affectedApplicationsAction] - 'PRESERVE_EXISTING_VERSION' (default) or 'RE_EVALUATE_WITH_AUDIT'
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 */
async function executeAuditedCriteriaRevision({
  scholarshipId,
  actor,
  editReason,
  newCriteria,
  newRequirements,
  eligibilityRequirements,
  affectedApplicationsAction = 'PRESERVE_EXISTING_VERSION',
  ip = '',
  userAgent = '',
}) {
  if (!editReason || typeof editReason !== 'string' || editReason.trim().length < 8) {
    const err = new Error('A formal, audit-compliant justification (minimum 8 characters) is mandatory to modify locked scholarship criteria.');
    err.code = 'AUDIT_REASON_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  const targetIdStr = String(scholarshipId);

  // 1. Locate scholarship in lowdb
  let scholarship = (db.data.scholarships || []).find((s) => String(s.id) === targetIdStr);
  const previousCriteria = scholarship ? (scholarship.criteria_json ? JSON.parse(scholarship.criteria_json) : scholarship.criteria) : null;
  const previousRequirements = scholarship ? [...(scholarship.requirements || [])] : [];
  const previousEligibility = scholarship ? scholarship.eligibilityRequirements : '';
  const currentVersion = Number(scholarship?.criteriaVersion || 1);
  const nextVersion = currentVersion + 1;

  const revisionRecord = {
    version: currentVersion,
    criteria: previousCriteria,
    requirements: previousRequirements,
    eligibilityRequirements: previousEligibility,
    modifiedBy: actor.id,
    editorRole: actor.role || 'provider',
    editReason: editReason.trim(),
    reason: editReason.trim(),
    affectedApplicationsAction,
    modifiedAt: new Date().toISOString(),
  };

  if (scholarship) {
    if (!scholarship.criteriaHistory) scholarship.criteriaHistory = [];
    scholarship.criteriaHistory.push(revisionRecord);
    scholarship.criteriaVersion = nextVersion;
    scholarship.isCriteriaLocked = true;
    scholarship.criteriaLockedAt = scholarship.criteriaLockedAt || new Date().toISOString();

    if (newCriteria !== undefined) {
      scholarship.criteria_json = typeof newCriteria === 'object' ? JSON.stringify(newCriteria) : String(newCriteria);
      scholarship.criteria = typeof newCriteria === 'object' ? newCriteria : JSON.parse(newCriteria || '{}');
    }

    if (newRequirements !== undefined) {
      scholarship.requirements = Array.isArray(newRequirements)
        ? newRequirements.map((r) => (typeof r === 'object' ? (r.requirementName || r.name || '') : String(r)).trim()).filter(Boolean)
        : [];
    }

    if (eligibilityRequirements !== undefined) {
      scholarship.eligibilityRequirements = eligibilityRequirements;
    }

    // Handle affected applications
    if (affectedApplicationsAction === 'RE_EVALUATE_WITH_AUDIT') {
      const { calculateRankingScore } = require('./rankingUtils');
      const apps = (db.data.applications || []).filter((a) => String(a.scholarship_id || a.scholarshipId) === targetIdStr);
      for (const app of apps) {
        const studentProfile = (db.data.student_profiles || []).find((p) => String(p.user_id) === String(app.student_id)) || {};
        const newScore = calculateRankingScore(scholarship.criteria || {}, studentProfile);
        app.previousScore = app.score;
        app.score = newScore;
        app.criteriaVersionUsed = nextVersion;
        app.criteriaRevisionNotice = `Application re-evaluated from criteria v${currentVersion} to v${nextVersion} by ${actor.role} on ${new Date().toLocaleDateString()}. Reason: ${editReason.trim()}`;
      }
    } else {
      // 'PRESERVE_EXISTING_VERSION': ensure existing applications remain locked to their historical version
      const apps = (db.data.applications || []).filter((a) => String(a.scholarship_id || a.scholarshipId) === targetIdStr);
      for (const app of apps) {
        if (!app.criteriaVersionUsed) {
          app.criteriaVersionUsed = currentVersion;
        }
      }
    }

    await db.write();
  }

  // 2. Persist in MongoDB
  const mongoose = require('mongoose');
  if (mongoose.connection?.readyState === 1) {
    try {
      const { Scholarship, ScholarshipOpportunity, AuditLog, ScholarshipApplication } = require('../models');

      // Update Scholarship model
      if (Scholarship) {
        const query = mongoose.Types.ObjectId.isValid(targetIdStr)
          ? { _id: targetIdStr }
          : { $or: [{ id: targetIdStr }, { id: Number(targetIdStr) }] };

        await Scholarship.updateOne(query, {
          $push: {
            criteriaHistory: {
              ...revisionRecord,
              modifiedAt: new Date(),
            },
          },
          $set: {
            criteriaVersion: nextVersion,
            isCriteriaLocked: true,
            criteriaLockedAt: new Date(),
            ...(eligibilityRequirements !== undefined ? { eligibilityRequirements } : {}),
            lastEditedBy: actor.id,
            lastEditReason: editReason.trim(),
          },
        }).catch(() => {});
      }

      // Update ScholarshipOpportunity model
      if (ScholarshipOpportunity) {
        const oppQuery = mongoose.Types.ObjectId.isValid(targetIdStr)
          ? { _id: targetIdStr }
          : { providerId: actor.id };

        await ScholarshipOpportunity.updateOne(oppQuery, {
          $push: {
            criteriaHistory: {
              ...revisionRecord,
              modifiedAt: new Date(),
            },
          },
          $set: {
            criteriaVersion: nextVersion,
            isCriteriaLocked: true,
            criteriaLockedAt: new Date(),
            ...(eligibilityRequirements !== undefined ? { eligibilityRequirements } : {}),
          },
        }).catch(() => {});
      }

      // Write immutable AuditLog entry
      if (AuditLog) {
        await AuditLog.create({
          actorUserId: actor.id,
          actorRole: actor.role || 'provider',
          action: 'SCHOLARSHIP_CRITERIA_CONTROLLED_REVISION',
          targetType: 'Scholarship',
          targetId: targetIdStr,
          beforeSummary: {
            criteriaVersion: currentVersion,
            requirements: previousRequirements,
            criteria: previousCriteria,
          },
          afterSummary: {
            criteriaVersion: nextVersion,
            requirements: scholarship?.requirements || newRequirements,
            criteria: newCriteria,
            affectedApplicationsAction,
          },
          reason: editReason.trim(),
          ip,
          userAgent,
        }).catch((auditErr) => console.warn('[CriteriaLockService] AuditLog error:', auditErr.message));
      }

      // If re-evaluating in MongoDB
      if (affectedApplicationsAction === 'RE_EVALUATE_WITH_AUDIT' && ScholarshipApplication) {
        await ScholarshipApplication.updateMany(
          { scholarshipId: targetIdStr },
          {
            $set: { criteriaVersionUsed: nextVersion },
            $push: {
              timeline: {
                event: 'CRITERIA_RE_EVALUATED',
                fromStatus: 'CURRENT',
                toStatus: 'RE_EVALUATED',
                actorId: actor.id,
                actorRole: actor.role,
                reason: editReason.trim(),
                notes: `Criteria updated from v${currentVersion} to v${nextVersion}.`,
                timestamp: new Date(),
              },
            },
          }
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('[CriteriaLockService] Mongo revision save notice:', err.message);
    }
  }

  return {
    success: true,
    scholarshipId: targetIdStr,
    previousVersion: currentVersion,
    newVersion: nextVersion,
    criteriaVersion: nextVersion,
    isCriteriaLocked: true,
    affectedApplicationsAction,
    revisionRecord,
    message: `Scholarship criteria successfully revised from v${currentVersion} to v${nextVersion} under controlled audit logging.`,
  };
}

module.exports = {
  checkCriteriaLock,
  assertCriteriaNotLocked,
  executeAuditedCriteriaRevision,
};
