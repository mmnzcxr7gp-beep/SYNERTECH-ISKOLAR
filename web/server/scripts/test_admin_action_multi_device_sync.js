const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN ACTION MULTI-DEVICE / MULTI-CLIENT SYNC TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14351, email: 'admin.multidev@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 14352, email: 'provider.multidev@iskolar.test', role: 'provider', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![14351, 14352].includes(u.id));
    db.data.users.push(admin, provider);
    await db.write();

    const adminToken = signToken(admin);
    const device1Token = signToken(provider);
    const device2Token = signToken(provider);

    // 1. Both devices active
    const resDev1 = await env.request('GET', '/api/auth/me', null, device1Token);
    const resDev2 = await env.request('GET', '/api/auth/me', null, device2Token);
    assert.strictEqual(resDev1.status, 200);
    assert.strictEqual(resDev2.status, 200);

    // 2. Admin revokes sessions / suspends
    await env.request('PATCH', `/api/admin/accounts/${provider.id}/suspend`, { reason: 'Multi-device lock' }, adminToken);

    // 3. Both devices immediately blocked
    const resDev1After = await env.request('GET', '/api/auth/me', null, device1Token);
    const resDev2After = await env.request('GET', '/api/auth/me', null, device2Token);
    assert.strictEqual(resDev1After.status, 403);
    assert.strictEqual(resDev2After.status, 403);

    console.log('✅ [PASS] test_admin_action_multi_device_sync passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_action_multi_device_sync:', err);
  process.exit(1);
});
