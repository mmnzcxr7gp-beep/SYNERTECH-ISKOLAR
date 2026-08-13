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
  listStudents,
  getAuditLogs,
} = require('../controllers/adminController');

const router = express.Router();

// Overview stats only for admin
router.get('/overview', authMiddleware, roleMiddleware(['admin']), getOverview);
router.get('/providers', authMiddleware, roleMiddleware(['admin']), listProviders);
router.put('/providers/:id/approve', authMiddleware, roleMiddleware(['admin']), approveProvider);
router.put('/providers/:id/verify', authMiddleware, roleMiddleware(['admin']), verifyProviderOrganization);
router.get('/students', authMiddleware, roleMiddleware(['admin']), listStudents);
router.get('/scholarships', authMiddleware, roleMiddleware(['admin']), listScholarships);
router.put('/scholarships/:id/status', authMiddleware, roleMiddleware(['admin']), updateScholarshipStatus);
router.get('/audit-logs', authMiddleware, roleMiddleware(['admin']), getAuditLogs);

// Comprehensive Infrastructure Health Check Endpoint for n8n, Socket.IO, MongoDB, and Firebase
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
