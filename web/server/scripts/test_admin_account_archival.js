const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9901, email: 'admin.arch@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9902, email: 'student.arch@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9901, 9902].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}/archive`, { reason: 'Student graduated and account is being archived' }, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'ARCHIVED');

    await db.read();
    const updated = db.data.users.find(u => u.id === student.id);
    assert.strictEqual(updated.accountStatus, 'ARCHIVED');

    console.log('✅ [PASS] test_admin_account_archival passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_archival:', err);
  process.exit(1);
});
