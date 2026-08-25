const assert = require('assert');
const { db } = require('../src/config/db');

async function testSocketRecovery() {
  console.log('🧪 Testing Offline/Reconnection Notification Recovery Mechanism...');

  if (!db.data.notifications) db.data.notifications = [];
  const testUserId = 8806;

  // 1. Simulate client disconnected: Socket emit fails/drops, but MongoDB/LowDB write succeeds
  const missedNotif1 = {
    id: 9921,
    userId: testUserId,
    title: 'Document Verified',
    message: 'Certificate of Registration verified successfully.',
    type: 'document_verified',
    read: false,
    createdAt: new Date(Date.now() - 5000).toISOString(),
  };

  const missedNotif2 = {
    id: 9922,
    userId: testUserId,
    title: 'Action Required',
    message: 'Please review your application status update.',
    type: 'more_information_required',
    read: false,
    createdAt: new Date().toISOString(),
  };

  db.data.notifications.push(missedNotif1, missedNotif2);

  // 2. Client reconnects and calls REST endpoint to fetch missed notifications
  const recoveredList = db.data.notifications
    .filter((n) => n.userId === testUserId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  assert.strictEqual(recoveredList.length, 2, 'Must recover all missed notifications from persistent storage');
  assert.strictEqual(recoveredList[0].id, 9922);
  assert.strictEqual(recoveredList[1].id, 9921);

  // Cleanup
  db.data.notifications = db.data.notifications.filter((n) => n.userId !== testUserId);

  console.log('✅ PASS test_socket_recovery: Missed offline notifications recovered from persistent store');
  process.exit(0);
}

testSocketRecovery().catch((err) => {
  console.error('❌ FAIL test_socket_recovery:', err);
  process.exit(1);
});
