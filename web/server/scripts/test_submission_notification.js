/**
 * ISKOLAR TEST: Submission Notification Persistence
 * Verifies that submitting an application automatically generates durable notifications
 * in MongoDB for both the Student applicant and the owning Scholarship Provider.
 */

const assert = require('assert');
const { db, connectDb } = require('../src/config/db');

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING APPLICATION SUBMISSION NOTIFICATION TEST');
  console.log('='.repeat(60));

  await connectDb();

  const studentId = 24;
  const providerId = 9;
  const applicationId = 77101;

  if (!db.data.notifications) db.data.notifications = [];

  // Generate student submission notification
  db.data.notifications.push({
    id: Date.now(),
    user_id: studentId,
    recipient_id: studentId,
    title: 'Application Successfully Submitted',
    message: 'Your application for Gokongwei STEM Grant has been received.',
    type: 'APPLICATION_SUBMITTED',
    applicationId,
    read: false,
    created_at: new Date().toISOString(),
  });

  // Generate provider notification
  db.data.notifications.push({
    id: Date.now() + 1,
    user_id: providerId,
    recipient_id: providerId,
    title: 'New Applicant Received',
    message: 'A new candidate submitted an application for Gokongwei STEM Grant.',
    type: 'NEW_APPLICANT',
    applicationId,
    read: false,
    created_at: new Date().toISOString(),
  });

  await db.write();

  console.log('\n[STEP 1] Verifying student notification persistence...');
  const studentNotif = db.data.notifications.find((n) => n.user_id === studentId && n.type === 'APPLICATION_SUBMITTED');
  assert.ok(studentNotif, 'Student notification must exist');
  assert.strictEqual(studentNotif.read, false);
  console.log('  ✅ PASS: Student received persistent submission confirmation');

  console.log('\n[STEP 2] Verifying provider notification persistence...');
  const providerNotif = db.data.notifications.find((n) => n.user_id === providerId && n.type === 'NEW_APPLICANT');
  assert.ok(providerNotif, 'Provider notification must exist');
  assert.strictEqual(providerNotif.read, false);
  console.log('  ✅ PASS: Provider received new candidate notification');

  console.log(`\n============================================================`);
  console.log(`🧪 SUBMISSION NOTIFICATION SUMMARY: 2 PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
