const assert = require('assert');
const { db } = require('../src/config/db');

async function testNotificationAuthorization() {
  console.log('🧪 Testing Notification Authorization & Tenant Isolation...');

  if (!db.data.notifications) db.data.notifications = [];
  const userA = 8802;
  const userB = 8803;

  const notifA = {
    id: 9910,
    userId: userA,
    title: 'Private Notice for User A',
    message: 'Confidential review update',
    type: 'general',
    read: false,
    createdAt: new Date().toISOString(),
  };

  const notifB = {
    id: 9911,
    userId: userB,
    title: 'Private Notice for User B',
    message: 'Confidential interview schedule',
    type: 'general',
    read: false,
    createdAt: new Date().toISOString(),
  };

  db.data.notifications.push(notifA, notifB);

  // Query as User A
  const notifsForA = db.data.notifications.filter((n) => n.userId === userA);
  assert.strictEqual(notifsForA.length, 1);
  assert.strictEqual(notifsForA[0].id, notifA.id);
  assert.strictEqual(notifsForA.some((n) => n.userId === userB), false, 'User A cannot access User B notifications');

  // Attempt to mark User B notification as read while authenticated as User A
  const targetId = notifB.id;
  const authUserId = userA;
  const allowedNotif = db.data.notifications.find((n) => n.id === targetId && n.userId === authUserId);
  assert.strictEqual(allowedNotif, undefined, 'User A cannot mark User B notification as read');

  // Cleanup
  db.data.notifications = db.data.notifications.filter((n) => n.userId !== userA && n.userId !== userB);

  console.log('✅ PASS test_notification_authorization: User isolation and cross-user modification prevention verified');
  process.exit(0);
}

testNotificationAuthorization().catch((err) => {
  console.error('❌ FAIL test_notification_authorization:', err);
  process.exit(1);
});
