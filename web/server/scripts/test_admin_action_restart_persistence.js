const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN ACTION SERVER RESTART PERSISTENCE TEST');

  const admin = { id: 13251, email: 'admin.restarts@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
  const student = { id: 13252, email: 'student.restarts@iskolar.test', role: 'student', accountStatus: 'ACTIVE', isSuspended: false };

  // Phase 1: Server 1 executes suspension
  const env1 = await startTestServer();
  try {
    db.data.users = (db.data.users || []).filter(u => ![13251, 13252].includes(u.id));
    db.data.users.push(admin, student);
    await db.write();

    const token = signToken(admin);
    const res = await env1.request('PATCH', `/api/admin/accounts/${student.id}/suspend`, {
      reason: 'Administrative disciplinary action'
    }, token);
    assert.strictEqual(res.status, 200);
  } finally {
    await env1.close();
  }

  // Phase 2: Simulated Backend Server Restart
  const env2 = await startTestServer();
  try {
    const token = signToken(admin);
    const res = await env2.request('GET', `/api/admin/accounts/${student.id}`, null, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'SUSPENDED');
    assert.strictEqual(res.body.account.isSuspended, true);

    console.log('✅ [PASS] test_admin_action_restart_persistence passed successfully');
  } finally {
    await env2.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_action_restart_persistence:', err);
  process.exit(1);
});
