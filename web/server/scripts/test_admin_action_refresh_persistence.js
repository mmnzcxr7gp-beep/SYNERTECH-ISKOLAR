const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN ACTION REFRESH PERSISTENCE TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14381, email: 'admin.refpers@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 14382, email: 'provider.refpers@iskolar.test', role: 'provider', accountStatus: 'PENDING_ADMIN_REVIEW' };

    db.data.users = (db.data.users || []).filter(u => ![14381, 14382].includes(u.id));
    db.data.users.push(admin, provider);
    await db.write();

    const adminToken = signToken(admin);

    // 1. Admin verifies provider
    const res1 = await env.request('PATCH', `/api/admin/accounts/${provider.id}/verify`, { reason: 'Refresh persistence verify' }, adminToken);
    assert.strictEqual(res1.status, 200);

    // 2. Direct read via listAccounts (simulating page reload / refetch)
    const res2 = await env.request('GET', `/api/admin/accounts/${provider.id}`, null, adminToken);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res2.body.account.sponsor_verified, true);
    assert.strictEqual(res2.body.account.organization_verified, true);

    console.log('✅ [PASS] test_admin_action_refresh_persistence passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_action_refresh_persistence:', err);
  process.exit(1);
});
