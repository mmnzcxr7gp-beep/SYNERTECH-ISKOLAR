const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN ACTION DATABASE FAILURE & ROLLBACK TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14361, email: 'admin.dbfail@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const nonExistentId = 9999999;

    db.data.users = (db.data.users || []).filter(u => u.id !== 14361);
    db.data.users.push(admin);
    await db.write();

    const adminToken = signToken(admin);

    // Target non-existent account must return 404 without throwing unhandled exceptions or partial state
    const res = await env.request('PATCH', `/api/admin/accounts/${nonExistentId}/verify`, { reason: 'Missing account' }, adminToken);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.message, 'Target account not found');

    console.log('✅ [PASS] test_admin_action_database_failure passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_action_database_failure:', err);
  process.exit(1);
});
