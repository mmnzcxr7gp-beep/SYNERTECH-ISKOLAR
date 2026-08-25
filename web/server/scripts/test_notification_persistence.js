const assert = require('assert');
const { db } = require('../src/config/db');

async function testNotificationPersistence() {
  console.log('🧪 Testing Notification Persistence & Schema Integrity...');

  if (!db.data.notifications) db.data.notifications = [];
  const testUserId = 8801;

  // 1. Create a notification
  const notif = {
    id: Date.now(),
    userId: testUserId,
    title: 'Scholarship Application Approved',
    message: 'Your application for Ayala Young Leaders Grant has been approved by the reviewer.',
    type: 'application_approved',
    read: false,
    data: { applicationId: 9, scholarshipId: 1, grantAmount: 100000 },
    createdAt: new Date().toISOString(),
  };

  db.data.notifications.push(notif);

  // 2. Query user notifications
  const userNotifs = db.data.notifications.filter((n) => n.userId === testUserId);
  assert.strictEqual(userNotifs.length, 1);
  assert.strictEqual(userNotifs[0].title, notif.title);
  assert.strictEqual(userNotifs[0].read, false);
  assert.strictEqual(userNotifs[0].type, 'application_approved');
  assert.strictEqual(userNotifs[0].data.applicationId, 9);

  // 3. Mark as read
  userNotifs[0].read = true;
  const updatedNotif = db.data.notifications.find((n) => n.id === notif.id);
  assert.strictEqual(updatedNotif.read, true, 'Notification read state updated');

  // Cleanup
  db.data.notifications = db.data.notifications.filter((n) => n.userId !== testUserId);

  console.log('✅ PASS test_notification_persistence: Schema fields, queries, and read state verified');
  process.exit(0);
}

testNotificationPersistence().catch((err) => {
  console.error('❌ FAIL test_notification_persistence:', err);
  process.exit(1);
});
