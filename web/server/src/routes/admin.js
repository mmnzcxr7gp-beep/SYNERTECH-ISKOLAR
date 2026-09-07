const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  getOverview,
  listProviders,
  approveProvider,
  verifyProviderOrganization,
  listScholarships,
  updateScholarshipStatus,
  editScholarshipContent,
  getScholarshipVersions,
  softDeleteScholarship,
  listStudents,
  getAuditLogs,
  blockAuditLogMutation,
  blockPrivateMessageMutation,
  listAccounts,
  getAccountDetails,
  editAccount,
  verifyAccount,
  rejectAccount,
  requestMoreInfo,
  suspendAccount,
  reactivateAccount,
  archiveAccount,
  softDeleteAccount,
  permanentDeleteAccount,
  restoreAccount,
  revokeAccountSessions,
  getAccountHistory,
  previewAccountDocument,
} = require('../controllers/adminController');

const router = express.Router();

// Account Lifecycle Management (Students, Providers, Admins)
router.get('/accounts', authMiddleware, roleMiddleware(['admin']), listAccounts);
router.get('/accounts/:id', authMiddleware, roleMiddleware(['admin']), getAccountDetails);
router.get('/accounts/:id/documents/:docId/preview', authMiddleware, roleMiddleware(['admin']), previewAccountDocument);
router.get('/accounts/:id/documents/:docId/file', authMiddleware, roleMiddleware(['admin']), previewAccountDocument);
router.patch('/accounts/:id', authMiddleware, roleMiddleware(['admin']), editAccount);
router.put('/accounts/:id', authMiddleware, roleMiddleware(['admin']), editAccount);

router.patch('/accounts/:id/verify', authMiddleware, roleMiddleware(['admin']), verifyAccount);
router.put('/accounts/:id/verify', authMiddleware, roleMiddleware(['admin']), verifyAccount);

router.patch('/accounts/:id/reject', authMiddleware, roleMiddleware(['admin']), rejectAccount);
router.put('/accounts/:id/reject', authMiddleware, roleMiddleware(['admin']), rejectAccount);

router.patch('/accounts/:id/request-info', authMiddleware, roleMiddleware(['admin']), requestMoreInfo);
router.post('/accounts/:id/request-info', authMiddleware, roleMiddleware(['admin']), requestMoreInfo);

router.patch('/accounts/:id/suspend', authMiddleware, roleMiddleware(['admin']), suspendAccount);
router.put('/accounts/:id/suspend', authMiddleware, roleMiddleware(['admin']), suspendAccount);
router.post('/accounts/:id/suspend', authMiddleware, roleMiddleware(['admin']), suspendAccount);

router.post('/users/:id/status', authMiddleware, roleMiddleware(['admin']), (req, res, next) => {
  if (req.body.status === 'SUSPENDED') return suspendAccount(req, res, next);
  if (req.body.status === 'ACTIVE') return reactivateAccount(req, res, next);
  return editAccount(req, res, next);
});
router.patch('/users/:id/status', authMiddleware, roleMiddleware(['admin']), (req, res, next) => {
  if (req.body.status === 'SUSPENDED') return suspendAccount(req, res, next);
  if (req.body.status === 'ACTIVE') return reactivateAccount(req, res, next);
  return editAccount(req, res, next);
});

router.patch('/accounts/:id/reactivate', authMiddleware, roleMiddleware(['admin']), reactivateAccount);
router.put('/accounts/:id/reactivate', authMiddleware, roleMiddleware(['admin']), reactivateAccount);
router.post('/accounts/:id/reactivate', authMiddleware, roleMiddleware(['admin']), reactivateAccount);

router.patch('/accounts/:id/archive', authMiddleware, roleMiddleware(['admin']), archiveAccount);
router.put('/accounts/:id/archive', authMiddleware, roleMiddleware(['admin']), archiveAccount);

router.post('/accounts/:id/delete-request', authMiddleware, roleMiddleware(['admin']), softDeleteAccount);
router.post('/accounts/:id/soft-delete', authMiddleware, roleMiddleware(['admin']), softDeleteAccount);
router.delete('/accounts/:id', authMiddleware, roleMiddleware(['admin']), permanentDeleteAccount);

router.post('/accounts/:id/restore', authMiddleware, roleMiddleware(['admin']), restoreAccount);
router.patch('/accounts/:id/restore', authMiddleware, roleMiddleware(['admin']), restoreAccount);

router.post('/accounts/:id/revoke-sessions', authMiddleware, roleMiddleware(['admin']), revokeAccountSessions);
router.get('/accounts/:id/history', authMiddleware, roleMiddleware(['admin']), getAccountHistory);

// Overview stats & provider management
router.get('/overview', authMiddleware, roleMiddleware(['admin']), getOverview);
router.get('/providers', authMiddleware, roleMiddleware(['admin']), listProviders);
router.put('/providers/:id/approve', authMiddleware, roleMiddleware(['admin']), approveProvider);
router.put('/providers/:id/verify', authMiddleware, roleMiddleware(['admin']), verifyProviderOrganization);
router.get('/students', authMiddleware, roleMiddleware(['admin']), listStudents);

// Scholarships & Administrator Content Moderation
router.get('/scholarships', authMiddleware, roleMiddleware(['admin']), listScholarships);
router.put('/scholarships/:id/status', authMiddleware, roleMiddleware(['admin']), updateScholarshipStatus);
router.put('/scholarships/:id/content', authMiddleware, roleMiddleware(['admin']), editScholarshipContent);
router.get('/scholarships/:id/versions', authMiddleware, roleMiddleware(['admin']), getScholarshipVersions);
router.delete('/scholarships/:id/soft-delete', authMiddleware, roleMiddleware(['admin']), softDeleteScholarship);

// Audit Logs
router.get('/audit-logs', authMiddleware, roleMiddleware(['admin']), getAuditLogs);
router.put('/audit-logs/:id', blockAuditLogMutation);
router.delete('/audit-logs/:id', blockAuditLogMutation);

// Private Messages Immutability Guards
router.put('/messages/:id', blockPrivateMessageMutation);
router.delete('/messages/:id', blockPrivateMessageMutation);

// Infrastructure Health Check Endpoint
router.get('/system-health', async (req, res) => {
  const mongoose = require('mongoose');
  const { db } = require('../config/db');

  const mongoState = mongoose.connection.readyState;
  const mongoStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || null;

  res.json({
    status: 'SYSTEM_HEALTH_OK',
    timestamp: new Date().toISOString(),
    services: {
      n8n: {
        status: n8nWebhookUrl ? 'ACTIVE_CONFIGURED' : 'STANDBY_FALLBACK',
        webhook_url: n8nWebhookUrl || 'https://sammy2323.app.n8n.cloud/webhook/iskolar-events',
        webhook_test_url: 'https://sammy2323.app.n8n.cloud/webhook-test/iskolar-events',
        supported_events: ['student_accepted', 'student_rejected', 'provider_registered', 'scholarship_published'],
        auto_fallback_to_email: true,
      },
      mongodb: {
        status: mongoStatusMap[mongoState] || 'unknown',
        mongoose_connection_state: mongoState,
        in_memory_json_db: 'active',
        total_users: db.data?.users?.length || 0,
        total_scholarships: db.data?.scholarships?.length || 0,
        total_applications: db.data?.applications?.length || 0,
      },
      socket_io: {
        status: global._io ? 'CONNECTED_AND_BROADCASTING' : 'READY',
        rooms_active: global._io?.sockets?.adapter?.rooms?.size || 0,
      },
      firebase: {
        status: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? 'AUTHENTICATED' : 'STANDBY_SIMULATION',
        push_notifications_enabled: true,
      },
    },
  });
});

module.exports = router;
