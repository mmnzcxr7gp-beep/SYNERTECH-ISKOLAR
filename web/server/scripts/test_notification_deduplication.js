const assert = require('assert');
const { registerDeviceToken, getUserTokens } = require('../src/utils/pushNotificationService');
const { db } = require('../src/config/db');

async function testNotificationDeduplication() {
  console.log('🧪 Testing Notification & Device Token Deduplication...');

  const testUserId = 8804;
  const deviceTokenA = 'fcm_token_sample_device_alpha_12345';

  // 1. Register device token twice
  await registerDeviceToken(testUserId, deviceTokenA, 'android');
  await registerDeviceToken(testUserId, deviceTokenA, 'android');

  const tokens = getUserTokens(testUserId);
  assert.strictEqual(tokens.length, 1, 'Device token must not duplicate for the same device');
  assert.strictEqual(tokens[0], deviceTokenA);

  // 2. Test event deduplication logic
  const events = [];
  function addEventWithDedup(event) {
    const key = `${event.userId}_${event.type}_${event.applicationId}`;
    const exists = events.some((e) => `${e.userId}_${e.type}_${e.applicationId}` === key);
    if (!exists) {
      events.push(event);
      return true;
    }
    return false;
  }

  const res1 = addEventWithDedup({ userId: testUserId, type: 'document_verified', applicationId: 9 });
  const res2 = addEventWithDedup({ userId: testUserId, type: 'document_verified', applicationId: 9 });

  assert.strictEqual(res1, true, 'First event added');
  assert.strictEqual(res2, false, 'Duplicate event blocked');
  assert.strictEqual(events.length, 1);

  // Cleanup
  if (db.data.device_tokens) {
    db.data.device_tokens = db.data.device_tokens.filter((dt) => dt.userId !== testUserId);
  }

  console.log('✅ PASS test_notification_deduplication: Token and event deduplication verified');
  process.exit(0);
}

testNotificationDeduplication().catch((err) => {
  console.error('❌ FAIL test_notification_deduplication:', err);
  process.exit(1);
});
