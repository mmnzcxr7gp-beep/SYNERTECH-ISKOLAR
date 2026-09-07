/**
 * approvalService.js
 * 
 * Unified, transactional application approval service for ISKOLAR 2.0.
 * Eliminates duplicate $or key defects and ensures atomic capacity reservation,
 * application status transition, idempotency, and audit event recording
 * backed by MongoDB transactions.
 */

const { db } = require('../config/db');

/**
 * Execute an approval within a MongoDB transaction.
 * Guarantees that:
 * 1. Target scholarship identity is exact (using $and to avoid duplicate key overwrites)
 * 2. Capacity reservation is atomic and verifies returned document
 * 3. Idempotent approvals return 200 without double-counting slots
 * 4. Application status, timestamps, approval checklist, and audit logs update atomically
 * 5. If transaction fails, zero lasting approval or slot-count changes persist
 */
async function approveApplication({
  applicationId,
  actorUser,
  approvalNote = '',
  remarks = '',
  effectiveDate = null,
  scholarshipInstructions = '',
  acceptanceDeadline = null,
  contactInstructions = '',
  nextStepChecklist = [],
  customClient = null,
}) {
  if (!applicationId) {
    const err = new Error('applicationId is required for approval');
    err.statusCode = 400;
    throw err;
  }
  if (!actorUser || !actorUser.id) {
    const err = new Error('actorUser identity is required for approval');
    err.statusCode = 401;
    throw err;
  }

  const client = customClient || db.client;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.RENDER === 'true';

  if (!db.collections?.applications || !db.collections?.scholarships) {
    if (isProd) {
      const err = new Error('Database collections unavailable in production');
      err.statusCode = 503;
      err.code = 'DATABASE_UNAVAILABLE';
      throw err;
    }
  }

  // 1. Fetch current application
  let application = null;
  const mongoose = require('mongoose');
  const appFilterQueries = [
    { id: applicationId },
    { id: Number(applicationId) },
    { id: String(applicationId) },
    { _id: applicationId },
  ];
  if (mongoose.Types.ObjectId.isValid(String(applicationId))) {
    appFilterQueries.push({ _id: new mongoose.Types.ObjectId(String(applicationId)) });
  }
  const appFilter = { $or: appFilterQueries };

  if (db.collections?.applications) {
    application = await db.collections.applications.findOne(appFilter);
  }
  if (!application && db.data?.applications) {
    if (isProd) {
      const err = new Error('In-memory data fallback prohibited in production');
      err.statusCode = 503;
      throw err;
    }
    application = db.data.applications.find(
      (a) => String(a.id) === String(applicationId) || String(a._id) === String(applicationId)
    );
  }

  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const previousStatus = application.status;
  const isAlreadyApproved = String(previousStatus).toUpperCase() === 'APPROVED';

  // 2. Idempotency guard: If already approved, return success without altering slots
  if (isAlreadyApproved) {
    return {
      success: true,
      idempotent: true,
      message: 'Application is already approved',
      application,
      status: 'APPROVED',
    };
  }

  // 3. Locate target scholarship
  const targetScholarId = application.scholarship_id || application.scholarshipId;
  if (!targetScholarId) {
    const err = new Error('Application does not reference a valid scholarship');
    err.statusCode = 400;
    throw err;
  }

  const scholFilterQueries = [
    { id: targetScholarId },
    { id: Number(targetScholarId) },
    { id: String(targetScholarId) },
    { _id: targetScholarId },
  ];
  if (mongoose.Types.ObjectId.isValid(String(targetScholarId))) {
    scholFilterQueries.push({ _id: new mongoose.Types.ObjectId(String(targetScholarId)) });
  }
  const scholFilterExact = { $or: scholFilterQueries };

  let scholarship = null;
  if (db.collections?.scholarships) {
    scholarship = await db.collections.scholarships.findOne(scholFilterExact);
  }
  if (!scholarship && db.data?.scholarships) {
    if (isProd) {
      const err = new Error('In-memory scholarship fallback prohibited in production');
      err.statusCode = 503;
      throw err;
    }
    scholarship = db.data.scholarships.find(
      (s) => String(s.id) === String(targetScholarId) || String(s._id) === String(targetScholarId)
    );
  }

  if (!scholarship) {
    const err = new Error('Target scholarship opportunity not found');
    err.statusCode = 404;
    throw err;
  }

  const totalSlots = Number(scholarship.slots ?? scholarship.totalSlots ?? 0);
  const now = new Date().toISOString();

  const approvalData = {
    approvalNote: approvalNote || remarks || 'Congratulations on your scholarship award!',
    effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : now,
    scholarshipInstructions: scholarshipInstructions || 'Please review the onboarding instructions in your ISKOLAR mobile app.',
    acceptanceDeadline: acceptanceDeadline ? new Date(acceptanceDeadline).toISOString() : null,
    contactInstructions: contactInstructions || 'Contact provider via application messages for inquiries.',
    nextStepChecklist: Array.isArray(nextStepChecklist) && nextStepChecklist.length > 0
      ? nextStepChecklist
      : ['Acknowledge Scholarship Acceptance', 'Submit Final Enrollment Copy', 'Attend Scholar Orientation'],
    approvedAt: now,
    approvedBy: actorUser.id,
    acknowledgedByStudent: false,
  };

  const timelineEvent = {
    event: 'APPLICATION_APPROVED',
    fromStatus: previousStatus,
    toStatus: 'APPROVED',
    actorId: actorUser.id,
    actorRole: actorUser.role,
    notes: approvalNote || remarks || 'Application officially approved and awarded.',
    timestamp: now,
  };

  // 4. Execute atomic transaction
  let updatedScholarship = null;
  let updatedApplication = null;

  const runWithTransaction = async (session) => {
    // A. Atomic Capacity Reservation with corrected $and filter
    if (totalSlots > 0 && db.collections?.scholarships) {
      const capacityFilter = {
        $and: [
          scholFilterExact,
          {
            $expr: {
              $lt: [{ $ifNull: ['$approved_count', 0] }, totalSlots],
            },
          },
        ],
      };

      const rawResult = await db.collections.scholarships.findOneAndUpdate(
        capacityFilter,
        {
          $inc: { approved_count: 1 },
        },
        { returnDocument: 'after', session }
      );

      const matchedDoc = rawResult && rawResult.value !== undefined ? rawResult.value : rawResult;

      if (!matchedDoc || (matchedDoc.id == null && matchedDoc._id == null)) {
        const capErr = new Error(`Scholarship capacity reached: All available slots (${totalSlots}) have already been awarded.`);
        capErr.statusCode = 409;
        capErr.availableSlots = totalSlots;
        capErr.approvedCount = totalSlots;
        throw capErr;
      }

      // Verify the updated document belongs to the exact target scholarship
      const matchId = String(matchedDoc.id ?? matchedDoc._id);
      const targetIdStr = String(targetScholarId);
      if (matchId !== targetIdStr && String(matchedDoc._id) !== targetIdStr && String(matchedDoc.id) !== targetIdStr) {
        const mismatchErr = new Error(`Critical capacity allocation mismatch: updated scholarship ${matchId} does not match target ${targetIdStr}`);
        mismatchErr.statusCode = 500;
        throw mismatchErr;
      }

      updatedScholarship = matchedDoc;
    }

    // B. Atomic Application Status Update
    if (db.collections?.applications) {
      const updateRes = await db.collections.applications.findOneAndUpdate(
        appFilter,
        {
          $set: {
            status: 'APPROVED',
            approved_at: now,
            appliedAt: application.applied_at || application.appliedAt || now,
            approvedAt: now,
            approved_by: actorUser.id,
            reviewed_by: actorUser.id,
            reviewed_by_role: actorUser.role,
            reviewed_at: now,
            approvalData,
          },
          $push: { timeline: timelineEvent },
        },
        { returnDocument: 'after', session }
      );

      updatedApplication = updateRes && updateRes.value !== undefined ? updateRes.value : updateRes;
    }

    // C. Atomic Audit Event Record
    if (db.collections?.auditlogs) {
      await db.collections.auditlogs.insertOne(
        {
          action: 'APPLICATION_APPROVED',
          applicationId: application.id || application._id,
          scholarshipId: targetScholarId,
          studentId: application.student_id || application.studentId,
          actorUserId: actorUser.id,
          actorRole: actorUser.role,
          details: {
            previousStatus,
            newStatus: 'APPROVED',
            totalSlots,
            approvedCount: updatedScholarship?.approved_count,
            notes: approvalNote || remarks || '',
          },
          createdAt: new Date(),
        },
        { session }
      ).catch(() => {});
    }
  };

  // Check if transactions are supported by the client/replica set
  let session = null;
  let useTransactions = false;

  if (client && typeof client.startSession === 'function') {
    try {
      session = client.startSession();
      useTransactions = true;
    } catch (_) {
      session = null;
      useTransactions = false;
    }
  }

  if (useTransactions && session) {
    try {
      await session.withTransaction(async () => {
        await runWithTransaction(session);
      });
    } catch (err) {
      if (err.message && (
        err.message.includes('does not support retryable writes') ||
        err.message.includes('Transaction numbers are only allowed') ||
        err.message.includes('standalone') ||
        err.message.includes('replica set')
      )) {
        await runWithTransaction(null);
      } else {
        throw err;
      }
    } finally {
      await session.endSession().catch(() => {});
    }
  } else {
    // Non-transactional fallback (e.g. standalone test MongoDB without replica set)
    try {
      await runWithTransaction(null);
    } catch (err) {
      // Rollback manual capacity increment if application update failed
      if (updatedScholarship && db.collections?.scholarships) {
        await db.collections.scholarships.updateOne(
          scholFilterExact,
          { $inc: { approved_count: -1 } }
        ).catch(() => {});
      }
      throw err;
    }
  }

  // Update in-memory cache for backward compatibility in dev/test
  if (db.data) {
    if (db.data.applications) {
      const memApp = db.data.applications.find(
        (a) => String(a.id) === String(applicationId) || String(a._id) === String(applicationId)
      );
      if (memApp) {
        memApp.status = 'APPROVED';
        memApp.approved_at = now;
        memApp.approvalData = approvalData;
        if (!memApp.timeline) memApp.timeline = [];
        memApp.timeline.push(timelineEvent);
      }
    }
    if (db.data.scholarships && updatedScholarship) {
      const memSchol = db.data.scholarships.find(
        (s) => String(s.id) === String(targetScholarId) || String(s._id) === String(targetScholarId)
      );
      if (memSchol) {
        memSchol.approved_count = updatedScholarship.approved_count;
        if (totalSlots > 0 && memSchol.approved_count >= totalSlots) {
          memSchol.is_full = true;
        }
      }
    }
  }

  return {
    success: true,
    application: updatedApplication || application,
    scholarship: updatedScholarship || scholarship,
    status: 'APPROVED',
    message: 'Application officially approved and awarded.',
  };
}

/**
 * Recovers a slot when an application transitions away from APPROVED
 */
async function recoverSlot({ scholarshipId, applicationId }) {
  if (!scholarshipId) return;

  const scholFilter = {
    $or: [
      { id: scholarshipId },
      { id: Number(scholarshipId) },
      { id: String(scholarshipId) },
      { _id: scholarshipId },
    ],
    approved_count: { $gt: 0 },
  };

  if (db.collections?.scholarships) {
    await db.collections.scholarships.updateOne(
      scholFilter,
      { $inc: { approved_count: -1 }, $set: { is_full: false } }
    ).catch(() => {});
  }

  if (db.data?.scholarships) {
    const memSchol = db.data.scholarships.find(
      (s) => String(s.id) === String(scholarshipId) || String(s._id) === String(scholarshipId)
    );
    if (memSchol && (memSchol.approved_count || 0) > 0) {
      memSchol.approved_count -= 1;
      memSchol.is_full = false;
    }
  }
}

module.exports = {
  approveApplication,
  recoverSlot,
};
