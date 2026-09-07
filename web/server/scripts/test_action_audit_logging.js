const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ACCOUNT ACTION AUDIT LOGGING TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12051, email: 'admin.auditlog@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12052, email: 'student.auditlog@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![12051, 12052].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // Perform an edit action
    const editRes = await env.request('PATCH', `/api/admin/accounts/${student.id}`, {
      phone: '09171234567',
      reason: 'Updated verified contact phone number for applicant'
    }, token);

    assert.strictEqual(editRes.status, 200);

    // Verify audit log exists
    await db.read();
    const log = (db.data.audit_logs || []).find(l => String(l.targetId) === String(student.id) && l.action === 'ADMIN_ACCOUNT_EDIT');
    assert(log, 'Expected ADMIN_ACCOUNT_EDIT audit entry');
    assert.strictEqual(log.actorRole, 'admin');

    console.log('✅ [PASS] test_action_audit_logging passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_action_audit_logging:', err);
  process.exit(1);
});
