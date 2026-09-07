const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9911, email: 'admin.rest@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = {
      id: 9912,
      email: 'student.rest@iskolar.test',
      role: 'student',
      isDeleted: true,
      accountStatus: 'DELETION_PENDING',
      retentionUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
    };

    db.data.users = (db.data.users || []).filter(u => ![9911, 9912].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('POST', `/api/admin/accounts/${student.id}/restore`, { reason: 'Student requested account reactivation within retention period' }, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res.body.account.isDeleted, false);

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.isDeleted, false);

    console.log('✅ [PASS] test_admin_account_restore passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_restore:', err);
  process.exit(1);
});
