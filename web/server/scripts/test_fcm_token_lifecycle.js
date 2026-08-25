const assert = require('assert');
const {
  registerDeviceToken,
  getUserTokens,
  removeDeviceToken,
} = require('../src/utils/pushNotificationService');
const { db } = require('../src/config/db');

async function testFcmTokenLifecycle() {
  console.log('🧪 Testing FCM Device Token Registration & Invalidation Lifecycle...');

  const testUserId = 8807;
  const token1 = 'fcm_token_pixel7_alpha_991823';
  const token2 = 'fcm_token_ipad_beta_441829';

  // 1. Register device token 1
  const rec1 = await registerDeviceToken(testUserId, token1, 'android');
  assert.strictEqual(rec1.userId, testUserId);
  assert.strictEqual(rec1.token, token1);
  assert.strictEqual(rec1.platform, 'android');

  // 2. Register device token 2 (multi-device user)
  await registerDeviceToken(testUserId, token2, 'ios');

  const userTokens = getUserTokens(testUserId);
  assert.strictEqual(userTokens.length, 2, 'User must have 2 registered device tokens');
  assert.ok(userTokens.includes(token1));
  assert.ok(userTokens.includes(token2));

  // 3. User logs out on Device 1 -> Token 1 removed
  await removeDeviceToken(token1);
  const remainingTokens = getUserTokens(testUserId);
  assert.strictEqual(remainingTokens.length, 1);
  assert.strictEqual(remainingTokens[0], token2);

  // 4. Cleanup token 2
  await removeDeviceToken(token2);
  assert.strictEqual(getUserTokens(testUserId).length, 0);

  console.log('✅ PASS test_fcm_token_lifecycle: Multi-device registration and logout revocation verified');
  process.exit(0);
}

testFcmTokenLifecycle().catch((err) => {
  console.error('❌ FAIL test_fcm_token_lifecycle:', err);
  process.exit(1);
});
