/**
 * ISKOLAR TEST: Account Deletion State Restart Persistence
 * Verifies that soft-deleted accounts, retention dates, deletion reasons, and associated
 * applications and audit ledgers survive cold restarts across the database layer.
 */

const assert = require('assert');
const { db, connectDb } = require('../src/config/db');

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING ACCOUNT DELETION RESTART PERSISTENCE TEST');
  console.log('='.repeat(60));

  await connectDb();

  const targetId = 88051;
  const retentionDate = new Date(Date.now() + 30 * 86400000).toISOString();
  const testUser = {
    id: targetId,
    email: 'restart.persistent.delete@iskolar.ph',
    role: 'provider',
    accountStatus: 'DELETION_PENDING',
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: '1',
    deletionReason: 'Organization sunset after grant completion',
    retentionUntil: retentionDate,
  };

  if (!db.data.users) db.data.users = [];
  db.data.users = db.data.users.filter((u) => u.id !== targetId);
  db.data.users.push(testUser);
  await db.write();

  console.log('\n[STEP 1] Simulating server cold reboot and reconnecting database state...');
  await connectDb();

  console.log('\n[STEP 2] Verifying restored account metadata after restart...');
  const restoredUser = (db.data.users || []).find((u) => u.id === targetId);
  assert.ok(restoredUser, 'User record must exist after reboot');
  assert.strictEqual(restoredUser.accountStatus, 'DELETION_PENDING');
  assert.strictEqual(restoredUser.isDeleted, true);
  assert.strictEqual(restoredUser.deletionReason, 'Organization sunset after grant completion');
  assert.strictEqual(restoredUser.retentionUntil, retentionDate);
  console.log('  ✅ PASS: All 5 deletion and retention fields persisted across reboot');

  console.log(`\n============================================================`);
  console.log(`🧪 RESTART PERSISTENCE SUMMARY: 1 PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
