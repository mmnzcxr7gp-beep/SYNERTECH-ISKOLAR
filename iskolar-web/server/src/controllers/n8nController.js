const { db } = require('../config/db');
const emailService = require('../utils/emailService');
const n8nService = require('../utils/n8nService');

/**
 * Handle incoming webhooks from n8n workflows
 * Allows n8n to trigger bulk email notifications, status updates, or custom automated responses.
 */

const handleN8nWebhookResponse = async (req, res, next) => {
  try {
    const signature = req.headers['x-iskolar-signature'];
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET || 'iskolar_n8n_secret_key_2026';

    if (signature && signature !== expectedSecret) {
      return res.status(401).json({ message: 'Invalid n8n Webhook Secret Signature' });
    }

    const { action, data } = req.body;
    console.log(`📥 [n8n Webhook Incoming] Action: "${action}"`, data);

    if (action === 'send_email') {
      const { to, subject, html } = data;
      const success = await emailService.sendMail({ to, subject, html });
      return res.json({ success, message: `Email dispatched to ${to}` });
    }

    if (action === 'batch_accept_students') {
      const { application_ids } = data;
      let count = 0;

      if (Array.isArray(application_ids)) {
        for (const appId of application_ids) {
          const app = db.data.applications?.find((a) => String(a.id) === String(appId));
          if (app) {
            app.status = 'approved';
            count++;
          }
        }
        await db.write();
      }
      return res.json({ success: true, count, message: `Accepted ${count} applications via n8n automation.` });
    }

    if (action === 'ping') {
      return res.json({
        success: true,
        status: 'ISKOLAR_N8N_AUTOMATION_ACTIVE',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    }

    return res.json({ success: true, message: 'n8n Webhook payload processed successfully.', receivedAction: action });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleN8nWebhookResponse,
};
