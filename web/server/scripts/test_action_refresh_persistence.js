const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ACTION BROWSER REFRESH PERSISTENCE TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 12071, email: 'admin.refresh@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 12072, email: 'student.refresh@iskolar.test', role: 'student', isSuspended: false, accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![12071, 12072].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);

    // Suspend account
    const suspendRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/suspend`, {
      reason: 'Academic violation investigation'
    }, token);
    assert.strictEqual(suspendRes.status, 200);

    // Simulate browser page refresh / re-fetching the account list
    const fetchRes = await env.request('GET', `/api/admin/accounts/${student.id}`, null, token);
    assert.strictEqual(fetchRes.status, 200);
    assert.strictEqual(fetchRes.body.account.accountStatus, 'SUSPENDED');
    assert.strictEqual(fetchRes.body.account.isSuspended, true);

    console.log('✅ [PASS] test_action_refresh_persistence passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_action_refresh_persistence:', err);
  process.exit(1);
});
