const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 10011, email: 'admin.aud@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 10012, email: 'student.aud@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![10011, 10012].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const adminToken = signToken(admin);

    await env.request('PATCH', `/api/admin/accounts/${student.id}`, { name: 'Audit Test Student', reason: 'Audit trail verification edit' }, adminToken);

    const res = await env.request('GET', `/api/admin/accounts/${student.id}/history`, null, adminToken);
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body.auditLogs));
    assert(res.body.auditLogs.some(l => l.action === 'ADMIN_ACCOUNT_EDIT'));

    console.log('✅ [PASS] test_admin_account_audit_log passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_audit_log:', err);
  process.exit(1);
});
