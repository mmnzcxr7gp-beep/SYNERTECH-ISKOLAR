/**
 * Push Notification Service
 * 
 * Integrates Firebase Admin SDK for sending push notifications.
 * Gracefully degrades when firebase-admin is not configured (no credentials).
 */

const { db } = require('../config/db');

/* ================= FIREBASE ADMIN ================= */
let firebaseAdmin = null;
let messagingInstance = null;

const initFirebase = () => {
  if (firebaseAdmin) return; // Already initialized

  try {
    firebaseAdmin = require('firebase-admin');

    // Check for service account credentials
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      // JSON string (raw or base64 encoded) in env var
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch (e) {
        // Try base64 decoding
        const decoded = Buffer.from(serviceAccountJson, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
      messagingInstance = firebaseAdmin.messaging();
      console.log('✓ Firebase Admin SDK initialized (from JSON env)');
    } else if (serviceAccountPath) {
      // File path to service account key
      const serviceAccount = require(serviceAccountPath);
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
      messagingInstance = firebaseAdmin.messaging();
      console.log('✓ Firebase Admin SDK initialized (from file)');
    } else {
      console.warn('⚠️ Firebase Admin SDK: No credentials configured. Push notifications disabled.');
      console.warn('   Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON env var.');
      firebaseAdmin = null;
    }
  } catch (err) {
    console.warn('⚠️ Firebase Admin SDK not available:', err?.message);
    console.warn('   Push notifications will be disabled. Install: npm install firebase-admin');
    firebaseAdmin = null;
    messagingInstance = null;
  }
};

// Try to init on module load (non-blocking)
try {
  initFirebase();
} catch (e) {
  // Swallow — graceful degradation
}

/* ================= DEVICE TOKEN MANAGEMENT ================= */

/**
 * Ensure device_tokens array exists in the in-memory DB.
 */
const ensureDeviceTokensArray = () => {
  if (!db.data.device_tokens) db.data.device_tokens = [];
};

/**
 * Register or update a device token for a user.
 * @param {number|string} userId 
 * @param {string} token - FCM device token
 * @param {string} platform - 'android' | 'ios' | 'web'
 * @returns {object} The stored token record
 */
const registerDeviceToken = async (userId, token, platform = 'unknown') => {
  ensureDeviceTokensArray();

  // Remove any existing entry with the same token (prevent duplicates)
  db.data.device_tokens = db.data.device_tokens.filter((dt) => dt.token !== token);

  const record = {
    userId,
    token,
    platform,
    updatedAt: new Date().toISOString(),
  };

  db.data.device_tokens.push(record);

  // Persist
  try {
    if (typeof db.write === 'function') await db.write();
  } catch (err) {
    console.error('[PushService] DB write error:', err?.message);
  }

  return record;
};

/**
 * Get all device tokens for a user.
 * @param {number|string} userId 
 * @returns {string[]} Array of FCM tokens
 */
const getUserTokens = (userId) => {
  ensureDeviceTokensArray();
  return db.data.device_tokens
    .filter((dt) => String(dt.userId) === String(userId))
    .map((dt) => dt.token);
};

/**
 * Remove a device token (e.g., on logout or token refresh).
 */
const removeDeviceToken = async (token) => {
  ensureDeviceTokensArray();
  db.data.device_tokens = db.data.device_tokens.filter((dt) => dt.token !== token);
  try {
    if (typeof db.write === 'function') await db.write();
  } catch (err) {
    console.error('[PushService] DB write error:', err?.message);
  }
};

/* ================= SEND PUSH NOTIFICATION ================= */

/**
 * Send a push notification to all devices registered for a user.
 * Gracefully handles missing Firebase credentials or tokens.
 * 
 * @param {number|string} userId - The user to notify
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} [data] - Optional data payload (key-value string pairs)
 * @returns {object} Result with success count and failure details
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
  const tokens = getUserTokens(userId);

  if (tokens.length === 0) {
    return { sent: false, reason: 'no_device_tokens', userId };
  }

  if (!messagingInstance) {
    console.log(`[PushService] Firebase not configured. Would send to user ${userId}: "${title}" — ${tokens.length} token(s)`);
    return { sent: false, reason: 'firebase_not_configured', tokenCount: tokens.length };
  }

  // Convert all data values to strings (FCM requirement)
  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] = String(value);
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: stringData,
      tokens,
    };

    const response = await messagingInstance.sendEachForMulticast(message);

    console.log(`[PushService] Sent to user ${userId}: ${response.successCount}/${tokens.length} succeeded`);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      // Remove invalid tokens
      for (const invalidToken of invalidTokens) {
        await removeDeviceToken(invalidToken);
      }

      if (invalidTokens.length > 0) {
        console.log(`[PushService] Cleaned up ${invalidTokens.length} invalid token(s)`);
      }
    }

    return {
      sent: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('[PushService] Failed to send push notification:', err?.message);
    return { sent: false, reason: 'send_error', error: err?.message };
  }
};

module.exports = {
  initFirebase,
  registerDeviceToken,
  removeDeviceToken,
  getUserTokens,
  sendPushNotification,
};
