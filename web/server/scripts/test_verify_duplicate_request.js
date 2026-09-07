const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING VERIFY DUPLICATE REQUEST / IDEMPOTENCY TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14201, email: 'admin.vdup@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14202, email: 'student.vdup@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![14201, 14202].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // First verify
    const res1 = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'First verify' }, token);
    assert.strictEqual(res1.status, 200);

    // Duplicate verify -> must return 200 cleanly and maintain ACTIVE state (Idempotent)
    const res2 = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Second verify' }, token);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.account.accountStatus, 'ACTIVE');

    console.log('✅ [PASS] test_verify_duplicate_request passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_verify_duplicate_request:', err);
  process.exit(1);
});
