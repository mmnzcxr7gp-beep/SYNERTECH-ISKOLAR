const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN VERIFY STUDENT END-TO-END TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 13001, email: 'admin.vstud@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 13002, email: 'student.vstud@iskolar.test', role: 'student', accountStatus: 'PENDING_ADMIN_REVIEW', isVerified: false, student_verified: false };

    db.data.users = (db.data.users || []).filter(u => ![13001, 13002].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // Verify student account
    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}/verify`, {
      reason: 'Official student transcript and national ID verified by admin.'
    }, token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res.body.account.isVerified, true);

    // Verify DB update
    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.isVerified, true);
    assert.strictEqual(updated.student_verified, true);
    assert.strictEqual(updated.verificationStatus, 'verified');

    // Verify audit log
    const log = (db.data.audit_logs || []).find(l => String(l.targetId) === String(student.id) && l.action === 'ADMIN_ACCOUNT_VERIFY');
    assert(log, 'Expected ADMIN_ACCOUNT_VERIFY audit event');

    // Verify notification
    const notif = (db.data.notifications || []).find(n => String(n.user_id || n.userId) === String(student.id) && n.type === 'ACCOUNT_VERIFIED');
    assert(notif, 'Expected ACCOUNT_VERIFIED notification record');

    console.log('✅ [PASS] test_admin_verify_student_end_to_end passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_verify_student_end_to_end:', err);
  process.exit(1);
});
