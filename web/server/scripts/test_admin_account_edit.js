const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9841, email: 'admin.edit@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 9842, email: 'student.edit@iskolar.test', role: 'student', name: 'Old Student Name', schoolName: 'UST', gpa: 1.5, accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9841, 9842].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${student.id}`, {
      name: 'New Student Name',
      schoolName: 'DLSU Manila',
      gpa: 1.25,
      reason: 'Administrative update based on student transcript'
    }, token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.name, 'New Student Name');
    assert.strictEqual(res.body.account.schoolName, 'DLSU Manila');
    assert.strictEqual(res.body.account.gpa, 1.25);

    await db.read();
    const vHistory = (db.data.account_version_history || []).filter(v => v.accountId === student.id);
    assert(vHistory.length > 0, 'Expected version history entry');

    console.log('✅ [PASS] test_admin_account_edit passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_account_edit:', err);
  process.exit(1);
});
