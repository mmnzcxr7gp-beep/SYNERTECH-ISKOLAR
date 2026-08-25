const AuditLog = require('../models/AuditLog');

/**
 * Log a sensitive system action into the audit trail.
 * @param {Object} params
 * @param {String} params.actorUserId - User ID performing the action
 * @param {String} params.actorRole - Role of the user
 * @param {String} params.action - Action name (e.g. 'APPLICATION_STATUS_UPDATE', 'DOCUMENT_VERIFY')
 * @param {String} params.targetType - Target entity type (e.g. 'Application', 'User')
 * @param {String} params.targetId - ID of the target entity
 * @param {Object} [params.beforeSummary] - Summary of state before change
 * @param {Object} [params.afterSummary] - Summary of state after change
 * @param {String} [params.reason] - Remarks or justification
 * @param {Object} [params.req] - Express request object for IP and userAgent
 */
const logAuditEvent = async ({
  actorUserId,
  actorRole = 'system',
  action,
  targetType,
  targetId,
  beforeSummary = null,
  afterSummary = null,
  reason = '',
  req = null,
}) => {
  try {
    const ip = req ? req.ip || req.headers['x-forwarded-for'] || '' : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    await AuditLog.create({
      actorUserId: actorUserId || '000000000000000000000000',
      actorRole: (actorRole || 'system').toLowerCase(),
      action,
      targetType,
      targetId: String(targetId),
      beforeSummary,
      afterSummary,
      reason,
      ip: String(ip),
      userAgent: String(userAgent),
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }
};

module.exports = { logAuditEvent };
