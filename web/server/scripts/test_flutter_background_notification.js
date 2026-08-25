const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testFlutterBackgroundNotification() {
  console.log('🧪 Testing Flutter Background & Terminated Notification Handlers...');

  const pushServicePath = path.join(__dirname, '../../../mobile/lib/services/firebase_push_service.dart');
  const content = fs.readFileSync(pushServicePath, 'utf8');

  // 1. Verify background message handler registration
  assert.ok(
    content.includes('onBackgroundMessage') || content.includes('_firebaseMessagingBackgroundHandler'),
    'Must register background message handler callback'
  );

  // 2. Verify notification tap handling when app is in background
  assert.ok(
    content.includes('onMessageOpenedApp') || content.includes('getInitialMessage'),
    'Must handle notification tap events for background/terminated app states'
  );

  // 3. Verify notification permission request
  assert.ok(
    content.includes('requestPermission') || content.includes('AuthorizationStatus'),
    'Must request explicit user notification permission'
  );

  console.log('✅ PASS test_flutter_background_notification: Background handlers and tap listeners verified');
  process.exit(0);
}

testFlutterBackgroundNotification().catch((err) => {
  console.error('❌ FAIL test_flutter_background_notification:', err);
  process.exit(1);
});
