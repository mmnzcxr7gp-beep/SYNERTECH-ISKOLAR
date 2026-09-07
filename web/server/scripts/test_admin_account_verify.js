const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 11071, email: 'admin.verify@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 11072, email: 'student.verify@iskolar.test', role: 'student', isVerified: false, accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![11071, 11072].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, {
      reason: 'Identity verification validated against national registrar'
    }, token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res.body.account.isVerified, true);

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.isVerified, true);

    const log = (db.data.audit_logs || []).find(l => l.action === 'ADMIN_ACCOUNT_VERIFY' && String(l.targetId) === String(student.id));
    assert(log, 'Expected ADMIN_ACCOUNT_VERIFY audit log');

    console.log('✅ [PASS] test_admin_account_verify passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_verify:', err);
  process.exit(1);
});
