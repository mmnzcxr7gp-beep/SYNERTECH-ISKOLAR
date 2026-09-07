const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9991, email: 'admin.rev@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9992, email: 'student.rev@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9991, 9992].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    const res = await env.request('POST', `/api/admin/accounts/${student.id}/revoke-sessions`, { reason: 'Security incident detected on user device' }, adminToken);
    assert.strictEqual(res.status, 200);

    await db.read();
    const log = (db.data.audit_logs || []).find(l => l.action === 'ADMIN_ACCOUNT_SESSIONS_REVOKED' && String(l.targetId) === String(student.id));
    assert(log, 'Expected session revocation audit log');

    console.log('✅ [PASS] test_account_session_revocation passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_account_session_revocation:', err);
  process.exit(1);
});
