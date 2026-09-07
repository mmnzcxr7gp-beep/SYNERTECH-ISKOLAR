const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9871, email: 'admin.susp@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9872, email: 'student.susp@iskolar.test', role: 'student', isSuspended: false, accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9871, 9872].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}/suspend`, { reason: 'Suspected fraudulent documents submitted' }, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'SUSPENDED');
    assert.strictEqual(res.body.account.isSuspended, true);

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'SUSPENDED');
    assert.strictEqual(updated.isSuspended, true);

    console.log('✅ [PASS] test_admin_account_suspension passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_suspension:', err);
  process.exit(1);
});
