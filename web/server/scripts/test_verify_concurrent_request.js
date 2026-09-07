const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING CONCURRENT VERIFY REQUESTS TEST');
  const env = await startTestServer();
  try {
    const admin1 = { id: 14211, email: 'admin1.vcon@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const admin2 = { id: 14212, email: 'admin2.vcon@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14213, email: 'student.vcon@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![14211, 14212, 14213].includes(u.id));
    db.data.users.push(admin1, admin2, student);
    await db.write();

    const token1 = signToken(admin1);
    const token2 = signToken(admin2);

    const [res1, res2] = await Promise.all([
      env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Admin 1 verify' }, token1),
      env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, { reason: 'Admin 2 verify' }, token2),
    ]);

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res2.status, 200);

    // Verify DB integrity is single ACTIVE state
    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.isVerified, true);

    console.log('✅ [PASS] test_verify_concurrent_request passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_verify_concurrent_request:', err);
  process.exit(1);
});
