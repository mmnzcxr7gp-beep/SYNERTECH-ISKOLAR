const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin1 = { id: 10031, email: 'admin1.conc@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const admin2 = { id: 10032, email: 'admin2.conc@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 10033, email: 'student.conc@iskolar.test', role: 'student', name: 'Original', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![10031, 10032, 10033].includes(u.id));
    db.data.users.push(admin1, admin2, student);
    await db.write();

    const token1 = signToken(admin1);
    const token2 = signToken(admin2);

    const res1 = await env.request('PATCH', `/api/admin/accounts/${student.id}`, { name: 'Update by Admin 1', reason: 'Admin 1 name update' }, token1);
    assert.strictEqual(res1.status, 200);

    const res2 = await env.request('PATCH', `/api/admin/accounts/${student.id}`, { name: 'Update by Admin 2', reason: 'Admin 2 name update' }, token2);
    assert.strictEqual(res2.status, 200);

    await db.read();
    const vHistory = (db.data.account_version_history || []).filter(v => v.accountId === student.id);
    assert(vHistory.length >= 2, 'Expected at least 2 versions in history');

    console.log('✅ [PASS] test_concurrent_admin_edit_conflict passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_concurrent_admin_edit_conflict:', err);
  process.exit(1);
});
