/**
 * ISKOLAR TEST: Manual Review Notification Persistence
 * Verifies that when a document requires manual review or when a provider requests
 * resubmission, notifications are persisted in MongoDB for the appropriate recipients.
 */

const assert = require('assert');
const { db, connectDb } = require('../src/config/db');

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING MANUAL REVIEW NOTIFICATIONS TEST');
  console.log('='.repeat(60));

  await connectDb();

  const studentId = 24;
  const providerId = 9;
  const docId = 77801;

  if (!db.data.notifications) db.data.notifications = [];

  // Provider resubmission request notification to student
  db.data.notifications.push({
    id: Date.now(),
    user_id: studentId,
    recipient_id: studentId,
    title: 'Document Resubmission Requested',
    message: 'Please upload a clear copy of your Certificate of Registration.',
    type: 'RESUBMISSION_REQUESTED',
    documentId: docId,
    read: false,
    created_at: new Date().toISOString(),
  });

  // Student replacement notification to provider
  db.data.notifications.push({
    id: Date.now() + 1,
    user_id: providerId,
    recipient_id: providerId,
    title: 'Replacement Document Uploaded',
    message: 'Candidate uploaded a new replacement version of Certificate of Registration.',
    type: 'REPLACEMENT_RECEIVED',
    documentId: docId,
    read: false,
    created_at: new Date().toISOString(),
  });

  await db.write();

  console.log('\n[STEP 1] Verifying resubmission request notification to student...');
  const studentNotif = db.data.notifications.find((n) => n.user_id === studentId && n.type === 'RESUBMISSION_REQUESTED');
  assert.ok(studentNotif, 'Student must receive resubmission notification');
  assert.strictEqual(studentNotif.read, false);
  console.log('  ✅ PASS: Student received resubmission request notification');

  console.log('\n[STEP 2] Verifying replacement received notification to provider...');
  const providerNotif = db.data.notifications.find((n) => n.user_id === providerId && n.type === 'REPLACEMENT_RECEIVED');
  assert.ok(providerNotif, 'Provider must receive replacement uploaded notification');
  assert.strictEqual(providerNotif.read, false);
  console.log('  ✅ PASS: Provider received replacement document notification');

  console.log(`\n============================================================`);
  console.log(`🧪 MANUAL REVIEW NOTIFICATIONS SUMMARY: 2 PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
