const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function testFlutterForegroundNotification() {
  console.log('🧪 Testing Flutter Foreground Notification Architecture...');

  const pushServicePath = path.join(__dirname, '../../../mobile/lib/services/firebase_push_service.dart');
  const notifServicePath = path.join(__dirname, '../../../mobile/lib/services/notification_service.dart');

  const pushContent = fs.readFileSync(pushServicePath, 'utf8');
  const notifContent = fs.readFileSync(notifServicePath, 'utf8');

  // 1. Verify foreground message listener is registered
  assert.ok(
    pushContent.includes('onMessage.listen') || pushContent.includes('_handleRemoteMessage'),
    'FirebasePushService must register onMessage listener for foreground messages'
  );

  // 2. Verify incoming message routing to local notification service
  assert.ok(
    pushContent.includes('NotificationService') && pushContent.includes('addNotification'),
    'Foreground messages must route through NotificationService for in-app display'
  );

  // 3. Verify notification types are supported
  assert.ok(
    notifContent.includes('NotificationType') || notifContent.includes('verificationApproved'),
    'NotificationService must define structured notification types'
  );

  console.log('✅ PASS test_flutter_foreground_notification: Flutter foreground message routing verified');
  process.exit(0);
}

testFlutterForegroundNotification().catch((err) => {
  console.error('❌ FAIL test_flutter_foreground_notification:', err);
  process.exit(1);
});
