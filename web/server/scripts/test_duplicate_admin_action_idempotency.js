const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 10021, email: 'admin.idem@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 10022, email: 'student.idem@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![10021, 10022].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    const res1 = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Initial verification' }, adminToken);
    assert.strictEqual(res1.status, 200);

    const res2 = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Duplicate verification attempt' }, adminToken);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.account.accountStatus, 'ACTIVE');

    console.log('✅ [PASS] test_duplicate_admin_action_idempotency passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_duplicate_admin_action_idempotency:', err);
  process.exit(1);
});
