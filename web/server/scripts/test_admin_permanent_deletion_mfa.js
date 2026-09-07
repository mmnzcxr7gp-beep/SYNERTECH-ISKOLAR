const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9931, email: 'admin.mfa@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9932, email: 'student.perm@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9931, 9932].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // 1. Fail without valid 6-digit MFA
    const failRes = await env.request('DELETE', `/api/admin/accounts/${student.id}`, { reason: 'Permanent deletion test', mfaCode: '123' }, token);
    assert(failRes.status === 400 || failRes.status === 403, 'Expected 400 or 403 when MFA code is invalid');

    // 2. Succeed with valid 6-digit MFA and reason
    const successRes = await env.request('DELETE', `/api/admin/accounts/${student.id}`, { reason: 'Permanent deletion authorized under GDPR right to erasure', mfaCode: '654321' }, token);
    assert.strictEqual(successRes.status, 200);

    await db.read();
    const deleted = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(deleted.accountStatus, 'DELETED');
    assert.strictEqual(deleted.isDeleted, true);
    assert(deleted.email.includes('anonymized'));

    console.log('✅ [PASS] test_admin_permanent_deletion_mfa passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_permanent_deletion_mfa:', err);
  process.exit(1);
});
