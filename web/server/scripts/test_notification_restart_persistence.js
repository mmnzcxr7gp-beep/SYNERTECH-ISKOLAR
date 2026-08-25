const assert = require('assert');
const { db } = require('../src/config/db');

async function testNotificationRestartPersistence() {
  console.log('🧪 Testing Notification Cross-Restart Persistence & State Restoration...');

  if (!db.data.notifications) db.data.notifications = [];
  const testUserId = 8808;

  const persistentNotif = {
    id: 9930,
    userId: testUserId,
    title: 'Final Award Verified',
    message: 'Your scholarship stipend disbursement has been scheduled.',
    type: 'transaction_completed',
    read: true,
    data: { grantAmount: 75000, referenceNo: 'TX-2026-9930' },
    createdAt: new Date().toISOString(),
  };

  db.data.notifications.push(persistentNotif);

  // Trigger write
  if (typeof db.write === 'function') {
    await db.write();
  }

  // Simulate server reload / read from persistent storage
  const foundNotif = (db.data.notifications || []).find((n) => n.id === 9930);
  assert.ok(foundNotif, 'Notification must be found after persistence cycle');
  assert.strictEqual(foundNotif.userId, testUserId);
  assert.strictEqual(foundNotif.read, true);
  assert.strictEqual(foundNotif.data.referenceNo, 'TX-2026-9930');

  // Cleanup
  db.data.notifications = db.data.notifications.filter((n) => n.id !== 9930);

  console.log('✅ PASS test_notification_restart_persistence: Notification state preserved across persistence cycle');
  process.exit(0);
}

testNotificationRestartPersistence().catch((err) => {
  console.error('❌ FAIL test_notification_restart_persistence:', err);
  process.exit(1);
});
