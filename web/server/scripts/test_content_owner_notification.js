/**
 * test_content_owner_notification.js
 * Verifies that when an administrator edits managed content, the original content owner
 * receives an automated in-app notification detailing the change and reason.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { db, connectDb } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function run() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING TEST: CONTENT OWNER NOTIFICATION ON ADMIN EDIT');
  console.log('🧪 ====================================================');

  await connectDb();

  const providerOwnerId = 5508;
  const adminId = 9908;

  if (!db.data) db.data = { users: [], scholarships: [], notifications: [] };
  if (!db.data.users) db.data.users = [];
  if (!db.data.scholarships) db.data.scholarships = [];
  if (!db.data.notifications) db.data.notifications = [];

  const providerUser = {
    id: providerOwnerId,
    email: 'sponsor_notify@foundation.org.ph',
    role: 'provider',
    name: 'Foundation Director',
  };
  db.data.users = db.data.users.filter(u => u.id !== providerOwnerId && u.id !== adminId);
  db.data.users.push(providerUser);

  const adminUser = { id: adminId, email: 'admin_notify@iskolar.ph', role: 'admin' };
  db.data.users.push(adminUser);

  const scholarshipId = 7708;
  const scholarship = {
    id: scholarshipId,
    providerId: providerOwnerId,
    sponsor_id: providerOwnerId,
    title: 'Science Foundation Grant 2026',
    description: 'Initial grant text.',
    status: 'open',
    version: 1,
  };
  db.data.scholarships = db.data.scholarships.filter(s => s.id !== scholarshipId);
  db.data.scholarships.push(scholarship);

  // Clear previous notifications for this owner
  db.data.notifications = db.data.notifications.filter(n => Number(n.recipient_id || n.user_id) !== providerOwnerId);
  await db.write();

  const adminToken = jwt.sign({ id: adminId, email: adminUser.email, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // Admin edits the scholarship
  const editReason = 'Updated application deadline per national holiday extension.';
  const res = await request(app)
    .put(`/api/admin/scholarships/${scholarshipId}/content`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      applicationDeadline: '2026-11-30',
      editReason,
    });

  if (res.status !== 200) {
    console.error('❌ FAILED: Edit request returned', res.status);
    process.exit(1);
  }

  // Verify notification was created for Provider Owner
  const ownerNotifications = (db.data.notifications || []).filter(
    n => Number(n.recipient_id || n.user_id) === providerOwnerId
  );

  if (ownerNotifications.length === 0) {
    console.error('❌ FAILED: No notification dispatched to content owner!');
    process.exit(1);
  }

  const latestNotification = ownerNotifications[ownerNotifications.length - 1];
  if (!latestNotification.message.includes(editReason) || latestNotification.type !== 'ADMIN_CONTENT_EDIT') {
    console.error('❌ FAILED: Notification content does not include editReason or correct type:', latestNotification);
    process.exit(1);
  }

  console.log('  ✅ PASS: Content owner notification generated successfully:');
  console.log('     Title:', latestNotification.title);
  console.log('     Message:', latestNotification.message);

  console.log('🧪 ====================================================');
  console.log('🧪 TEST PASSED: CONTENT OWNER NOTIFICATION ON ADMIN EDIT');
  console.log('🧪 ====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
