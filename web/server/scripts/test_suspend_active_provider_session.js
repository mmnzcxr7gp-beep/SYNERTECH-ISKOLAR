const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING SUSPEND ACTIVE PROVIDER SESSION TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14251, email: 'admin.actprov@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 14252, email: 'provider.actprov@iskolar.test', role: 'provider', accountStatus: 'ACTIVE', isSuspended: false };

    db.data.users = (db.data.users || []).filter(u => ![14251, 14252].includes(u.id));
    db.data.users.push(admin, provider);
    await db.write();

    const adminToken = signToken(admin);
    const providerToken = signToken(provider);

    // 1. Initial request succeeds
    const res1 = await env.request('GET', '/api/auth/me', null, providerToken);
    assert.strictEqual(res1.status, 200);

    // 2. Admin suspends provider
    const suspRes = await env.request('PATCH', `/api/admin/accounts/${provider.id}/suspend`, {
      reason: 'Organization audit investigation'
    }, adminToken);
    assert.strictEqual(suspRes.status, 200);

    // 3. Same active session immediately rejected
    const res2 = await env.request('GET', '/api/auth/me', null, providerToken);
    assert.strictEqual(res2.status, 403);
    assert.strictEqual(res2.body.code, 'ACCOUNT_SUSPENDED');

    console.log('✅ [PASS] test_suspend_active_provider_session passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_suspend_active_provider_session:', err);
  process.exit(1);
});
