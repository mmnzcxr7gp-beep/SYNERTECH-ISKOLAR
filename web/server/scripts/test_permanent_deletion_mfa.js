const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING PERMANENT DELETION MFA REQUIREMENT TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14321, email: 'admin.delmfa@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 14322, email: 'student.delmfa@iskolar.test', role: 'student', accountStatus: 'DELETION_PENDING' };

    db.data.users = (db.data.users || []).filter(u => ![14321, 14322].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    // 1. Without MFA code -> 403 MFA_REQUIRED
    const badRes = await env.request('DELETE', `/api/admin/accounts/${student.id}`, {
      reason: 'GDPR deletion request'
    }, adminToken);
    assert.strictEqual(badRes.status, 403);
    assert.strictEqual(badRes.body.code, 'MFA_REQUIRED');

    // 2. With valid MFA code -> 200 Permanent anonymization
    const goodRes = await env.request('DELETE', `/api/admin/accounts/${student.id}`, {
      reason: 'GDPR right-to-be-forgotten deletion confirmed.',
      mfaCode: '123456'
    }, adminToken);
    assert.strictEqual(goodRes.status, 200);
    assert.strictEqual(goodRes.body.account.accountStatus, 'DELETED');

    console.log('✅ [PASS] test_permanent_deletion_mfa passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_permanent_deletion_mfa:', err);
  process.exit(1);
});
