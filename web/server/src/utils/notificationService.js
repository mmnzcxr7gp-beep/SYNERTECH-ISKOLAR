const { createNotification } = require('../controllers/notificationController');

let _io = null;

/**
 * Initialize the notification service with a Socket.IO server instance.
 * Should be called once during server startup after setupSocketIO().
 */
const init = (io) => {
  _io = io;
  // Also set global for backward compat
  global._io = io;
};

/**
 * Get the Socket.IO instance. Returns null if not initialized.
 */
const getIO = () => _io || global._io || null;

/* ================= HELPERS ================= */

const emitToUser = (userId, event, data) => {
  const io = getIO();
  if (!io) return;
  // Emit to all room formats for backward compat
  io.to(`user_${userId}`).emit(event, data);
  io.to(`student_room_${userId}`).emit(event, data);
  io.to(`sponsor_room_${userId}`).emit(event, data);
  io.to(`provider_room_${userId}`).emit(event, data);
};

const emitToAdminRoom = (event, data) => {
  const io = getIO();
  if (!io) return;
  io.to('admin_room').emit(event, data);
};

/* ================= NOTIFICATION EMITTERS ================= */

/**
 * Notify a user when their verification status changes.
 */
const notifyVerificationStatusChange = async (userId, status, message) => {
  const title = status === 'approved'
    ? 'Verification Approved!'
    : status === 'rejected'
      ? 'Verification Rejected'
      : 'Verification Update';

  const body = message || (status === 'approved'
    ? 'Your account has been verified. You can now access all features.'
    : status === 'rejected'
      ? 'Your verification was rejected. Please review and resubmit.'
      : 'Your verification status has been updated.');

  const payload = { status, message: body, timestamp: new Date().toISOString() };

  emitToUser(userId, 'verification-status-changed', payload);

  try {
    await createNotification(userId, title, body, `verification_${status}`, { status });
  } catch (err) {
    console.error('[NotificationService] Failed to persist verification notification:', err?.message);
  }
};

/**
 * Notify a user when their transaction status changes.
 */
const notifyTransactionStatusChange = async (userId, transactionId, status, amount) => {
  const title = status === 'completed'
    ? 'Transaction Completed'
    : status === 'failed'
      ? 'Transaction Failed'
      : 'Transaction Updated';

  const body = status === 'completed'
    ? `Your transaction of ₱${amount || 0} has been completed.`
    : status === 'failed'
      ? `Your transaction of ₱${amount || 0} has failed. Please contact support.`
      : `Your transaction status has been updated to ${status}.`;

  const payload = { transactionId, status, amount, message: body, timestamp: new Date().toISOString() };

  emitToUser(userId, 'transaction-status-changed', payload);

  try {
    await createNotification(userId, title, body, `transaction_${status}`, { transactionId, status, amount });
  } catch (err) {
    console.error('[NotificationService] Failed to persist transaction notification:', err?.message);
  }
};

/**
 * Notify admins when a new verification request is submitted.
 */
const notifyAdminNewVerification = (userId, userName) => {
  const payload = {
    type: 'new_verification',
    userId,
    userName: userName || 'Unknown',
    message: `New verification request from ${userName || 'a student'}`,
    timestamp: new Date().toISOString(),
  };

  emitToAdminRoom('new-verification', payload);
};

/**
 * Notify admins about pending verifications count.
 */
const notifyAdminPendingVerifications = (count) => {
  const payload = {
    type: 'pending_verifications',
    count,
    message: `There are ${count} pending verification(s) to review.`,
    timestamp: new Date().toISOString(),
  };

  emitToAdminRoom('pending-verifications', payload);
};

/**
 * Notify a provider when a transaction is created.
 */
const notifyTransactionCreated = async (userId, transactionId, amount) => {
  const payload = {
    transactionId,
    amount,
    message: `Transaction of ₱${amount} has been created successfully.`,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'transaction-created', payload);

  try {
    await createNotification(userId, 'Transaction Created', payload.message, 'transaction_created', { transactionId, amount });
  } catch (err) {
    console.error('[NotificationService] Failed to persist transaction-created notification:', err?.message);
  }
};

/**
 * Notify a student when their allowance is approved.
 */
const notifyAllowanceApproved = async (userId, transactionId, amount) => {
  const body = `Your allowance of ₱${amount} has been approved and is being transferred.`;
  const payload = {
    transactionId,
    amount,
    message: body,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'allowance-approved', payload);

  try {
    await createNotification(userId, 'Allowance Approved', body, 'allowance_approved', { transactionId, amount });
  } catch (err) {
    console.error('[NotificationService] Failed to persist allowance notification:', err?.message);
  }
};

/**
 * Notify relevant parties when an application is created.
 * P1 FIX: Updated signature to match applicationController.js call site.
 * @param {number|string} providerId - The scholarship provider to notify
 * @param {object} application - The application object
 * @param {number|string} studentId - The student who applied
 * @param {number|string} scholarshipId - The scholarship ID
 */
const notifyApplicationCreated = async (providerId, application, studentId, scholarshipId) => {
  // Look up scholarship title from the application or db
  const { db } = require('../config/db');
  const scholarship = (db.data.scholarships || []).find((s) => String(s.id) === String(scholarshipId)) || {};
  const scholarshipTitle = scholarship.title || 'Scholarship';

  // Notify the student that their application was submitted
  const studentBody = `Your application for "${scholarshipTitle}" has been submitted successfully.`;
  emitToUser(studentId, 'application-status-changed', {
    status: 'SUBMITTED',
    scholarshipTitle,
    message: studentBody,
    timestamp: new Date().toISOString(),
  });

  try {
    await createNotification(studentId, 'Application Submitted', studentBody, 'application_submitted', { scholarshipTitle, scholarshipId });
  } catch (err) {
    console.error('[NotificationService] Failed to persist student application notification:', err?.message);
  }

  // Notify the provider that a new application was received
  if (providerId) {
    const providerBody = `New application received for "${scholarshipTitle}".`;
    emitToUser(providerId, 'new-application', {
      applicationId: application?.id,
      studentId,
      scholarshipTitle,
      message: providerBody,
      timestamp: new Date().toISOString(),
    });

    try {
      await createNotification(providerId, 'New Application', providerBody, 'application_submitted', { scholarshipTitle, scholarshipId, studentId });
    } catch (err) {
      console.error('[NotificationService] Failed to persist provider application notification:', err?.message);
    }
  }

  // Also notify admin room
  emitToAdminRoom('new-application', {
    studentId,
    scholarshipTitle,
    message: `New application received for "${scholarshipTitle}".`,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  init,
  getIO,
  createNotification,
  notifyVerificationStatusChange,
  notifyTransactionStatusChange,
  notifyAdminNewVerification,
  notifyAdminPendingVerifications,
  notifyTransactionCreated,
  notifyAllowanceApproved,
  notifyApplicationCreated,
};
