const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9891, email: 'admin.react@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9892, email: 'student.react@iskolar.test', role: 'student', isSuspended: true, accountStatus: 'SUSPENDED' };

    db.data.users = (db.data.users || []).filter(u => ![9891, 9892].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}/reactivate`, { reason: 'Student submitted authentic identity verification' }, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res.body.account.isSuspended, false);

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.isSuspended, false);

    console.log('✅ [PASS] test_admin_account_reactivation passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_reactivation:', err);
  process.exit(1);
});
