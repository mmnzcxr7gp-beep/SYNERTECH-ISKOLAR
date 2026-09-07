const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9921, email: 'admin.delreq@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9922, email: 'student.delreq@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9921, 9922].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('POST', `/api/admin/accounts/${student.id}/soft-delete`, { reason: 'Student requested account closure' }, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'DELETION_PENDING');
    assert.strictEqual(res.body.account.isDeleted, true);
    assert(res.body.account.retentionUntil);

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'DELETION_PENDING');
    assert.strictEqual(updated.isDeleted, true);

    console.log('✅ [PASS] test_admin_deletion_request passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_deletion_request:', err);
  process.exit(1);
});
