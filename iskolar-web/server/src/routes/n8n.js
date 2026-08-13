const express = require('express');
const { handleN8nWebhookResponse } = require('../controllers/n8nController');
const n8nService = require('../utils/n8nService');

const router = express.Router();

// Allow both GET and POST for easy browser and n8n testing
router.get('/webhook', (req, res) => {
  res.json({
    status: 'ISKOLAR_N8N_WEBHOOK_READY',
    message: 'n8n Webhook Receiver is Active! Send HTTP POST requests to trigger workflows.',
    target_cloud_webhook: process.env.N8N_WEBHOOK_URL || 'https://sammy2323.app.n8n.cloud/webhook/iskolar-events',
    timestamp: new Date().toISOString(),
  });
});

router.post('/webhook', handleN8nWebhookResponse);
router.post('/events', handleN8nWebhookResponse);

// Manual Test Trigger Endpoint - test sending an event to sammy2323.app.n8n.cloud
router.get('/test-trigger', async (req, res) => {
  const result = await n8nService.notifyStudentAccepted({
    studentEmail: 'samgarciavillaluna@gmail.com',
    studentName: 'Sam Villaluna',
    scholarshipTitle: 'CHED Merit Scholarship Grant 2026',
    providerName: 'Commission on Higher Education (CHED)',
    maxAmount: 50000,
    allowance: 5000,
  });

  res.json({
    status: result.success ? 'TEST_TRIGGER_DELIVERED' : 'TEST_TRIGGER_FAILED',
    result,
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'n8n_integration_active',
    webhook_url: process.env.N8N_WEBHOOK_URL || 'https://sammy2323.app.n8n.cloud/webhook/iskolar-events',
    webhook_test_url: 'https://sammy2323.app.n8n.cloud/webhook-test/iskolar-events',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
