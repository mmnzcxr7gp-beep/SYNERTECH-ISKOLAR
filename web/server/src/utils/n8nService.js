const fetch = require('node-fetch');

/**
 * ISKOLAR n8n Webhook & Workflow Automation Service
 * Handles automated triggers for student acceptances, provider registrations,
 * scholarship announcements, and OTP verifications via n8n workflows.
 */

const getN8nWebhookUrl = () => {
  return process.env.N8N_WEBHOOK_URL || null;
};

/**
 * Trigger an event to n8n Webhook
 * @param {string} eventType - e.g. 'student_accepted', 'student_rejected', 'provider_registered', etc.
 * @param {Object} payload - Event data payload
 */
const triggerN8nWebhook = async (eventType, payload) => {
  const webhookUrl = getN8nWebhookUrl();
  const timestamp = new Date().toISOString();

  const eventData = {
    event_type: eventType,
    timestamp,
    source: 'ISKOLAR_BACKEND_API',
    data: payload,
  };

  const maskEmail = (email) => {
    if (!email || typeof email !== 'string') return 'system';
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}***${name.slice(-1)}`;
    return `${maskedName}@${domain}`;
  };

  const rawTarget = payload?.email || payload?.student_email || payload?.to || 'system';
  console.log(`⚡ [n8n Automation] Triggering Event: "${eventType}" for [${maskEmail(rawTarget)}]`);

  if (process.env.NODE_ENV === 'test' || process.env.N8N_DISABLED === 'true') {
    return { success: true, simulated: true, eventData };
  }

  if (!webhookUrl) {
    console.log(`ℹ️ [n8n Automation] N8N_WEBHOOK_URL is not configured in .env. Event logged to system.`);
    return { success: false, reason: 'N8N_WEBHOOK_URL_NOT_CONFIGURED', eventData };
  }

  try {
    const startTime = Date.now();
    let targetUrl = webhookUrl;

    let response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ISKOLAR-SIGNATURE': process.env.N8N_WEBHOOK_SECRET || 'iskolar_n8n_secret_key_2026',
      },
      body: JSON.stringify(eventData),
      timeout: 8000, // 8 seconds timeout
    });

    // If production webhook URL returned 404 (workflow is in Test mode in n8n dashboard), retry with webhook-test URL
    if (response.status === 404 && targetUrl.includes('/webhook/')) {
      const testUrl = targetUrl.replace('/webhook/', '/webhook-test/');
      console.log(`ℹ️ [n8n Automation] Production Webhook returned 404. Retrying with n8n Test Webhook URL: "${testUrl}"`);
      response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ISKOLAR-SIGNATURE': process.env.N8N_WEBHOOK_SECRET || 'iskolar_n8n_secret_key_2026',
        },
        body: JSON.stringify(eventData),
        timeout: 8000,
      });
      if (response.ok) targetUrl = testUrl;
    }

    const duration = Date.now() - startTime;

    if (response.ok) {
      const responseData = await response.json().catch(() => ({ status: 'OK' }));
      console.log(`✓ [n8n Automation] Webhook Delivered Successfully (${duration}ms) | Event: "${eventType}" | URL: "${targetUrl}" | HTTP ${response.status}`);
      return { success: true, status: response.status, responseData, duration, url: targetUrl };
    } else {
      const errorText = await response.text().catch(() => '');
      console.warn(`⚠️ [n8n Automation] Webhook HTTP Error ${response.status}: ${errorText.substring(0, 150)}`);
      return { success: false, status: response.status, error: errorText };
    }
  } catch (err) {
    console.error(`✗ [n8n Automation] Webhook Delivery Exception:`, err.message || err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Specialized Event Trigger Helpers
 */

const notifyStudentAccepted = async ({ studentEmail, studentName, scholarshipTitle, providerName, maxAmount, allowance }) => {
  return triggerN8nWebhook('student_accepted', {
    email: studentEmail,
    student_name: studentName,
    scholarship_title: scholarshipTitle,
    provider_name: providerName || 'Scholarship Provider',
    max_amount: maxAmount || 0,
    allowance: allowance || 0,
    action_required: 'Please check your ISKOLAR mobile app to confirm award acceptance.',
  });
};

const notifyStudentRejected = async ({ studentEmail, studentName, scholarshipTitle, providerName, reason }) => {
  return triggerN8nWebhook('student_rejected', {
    email: studentEmail,
    student_name: studentName,
    scholarship_title: scholarshipTitle,
    provider_name: providerName || 'Scholarship Provider',
    reason: reason || 'Application did not meet specific provider quota requirements.',
  });
};

const notifyProviderRegistered = async ({ providerEmail, organizationName, name }) => {
  return triggerN8nWebhook('provider_registered', {
    email: providerEmail,
    organization_name: organizationName || name,
    provider_name: name,
    message: 'Welcome to ISKOLAR Provider Network. Your account is pending admin verification.',
  });
};

const notifyScholarshipPublished = async ({ providerEmail, providerName, scholarshipTitle, totalSlots, applicationDeadline }) => {
  return triggerN8nWebhook('scholarship_published', {
    email: providerEmail,
    provider_name: providerName,
    scholarship_title: scholarshipTitle,
    total_slots: totalSlots,
    application_deadline: applicationDeadline,
  });
};

module.exports = {
  triggerN8nWebhook,
  notifyStudentAccepted,
  notifyStudentRejected,
  notifyProviderRegistered,
  notifyScholarshipPublished,
};
