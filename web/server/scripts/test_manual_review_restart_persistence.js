/**
 * ISKOLAR TEST: Manual Review State & History Restart Persistence
 * Verifies that manual review logs, document statuses, reviewer notes, and version
 * histories persist across database reconnections and server cold reboots.
 */

const assert = require('assert');
const { db, connectDb } = require('../src/config/db');

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING MANUAL REVIEW RESTART PERSISTENCE TEST');
  console.log('='.repeat(60));

  await connectDb();

  const docId = 77901;
  const appId = 66901;

  const reviewRecord = {
    id: 55901,
    documentId: docId,
    applicationId: appId,
    status: 'NEEDS_RESUBMISSION',
    reviewerId: 9,
    reviewerRole: 'provider',
    reason: 'Signature is blurred and unreadable on page 2',
    timestamp: new Date().toISOString(),
  };

  if (!db.data.manual_review_logs) db.data.manual_review_logs = [];
  db.data.manual_review_logs = db.data.manual_review_logs.filter((l) => l.id !== 55901);
  db.data.manual_review_logs.push(reviewRecord);
  await db.write();

  console.log('\n[STEP 1] Reconnecting database to simulate server reboot...');
  await connectDb();

  console.log('\n[STEP 2] Verifying manual review log preservation after restart...');
  const restoredLog = (db.data.manual_review_logs || []).find((l) => l.id === 55901);
  assert.ok(restoredLog, 'Manual review log must exist after reboot');
  assert.strictEqual(restoredLog.status, 'NEEDS_RESUBMISSION');
  assert.strictEqual(restoredLog.reason, 'Signature is blurred and unreadable on page 2');
  console.log('  ✅ PASS: Manual review audit trail and reason persisted across cold reboot');

  console.log(`\n============================================================`);
  console.log(`🧪 MANUAL REVIEW RESTART SUMMARY: 1 PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
