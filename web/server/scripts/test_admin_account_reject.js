const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 11081, email: 'admin.reject@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 11082, email: 'student.reject@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![11081, 11082].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // 1. Fail when mandatory reason is missing
    const failRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/reject`, {}, token);
    assert.strictEqual(failRes.status, 400);

    // 2. Succeed with valid rejection reason
    const successRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/reject`, {
      reason: 'Incomplete academic credentials and unverified enrollment certification'
    }, token);

    assert.strictEqual(successRes.status, 200);
    assert.strictEqual(successRes.body.account.accountStatus, 'REJECTED');

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'REJECTED');

    console.log('✅ [PASS] test_admin_account_reject passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_reject:', err);
  process.exit(1);
});
