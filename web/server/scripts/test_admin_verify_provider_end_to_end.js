const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ADMIN VERIFY PROVIDER END-TO-END TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 13011, email: 'admin.vprov@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 13012, email: 'provider.vprov@iskolar.test', role: 'provider', accountStatus: 'PENDING_ADMIN_REVIEW', sponsor_verified: false, organization_verified: false };

    db.data.users = (db.data.users || []).filter(u => ![13011, 13012].includes(u.id));
    db.data.users.push(admin, provider);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${provider.id}/verify`, {
      reason: 'SEC registration and tax identification verified.'
    }, token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res.body.account.sponsor_verified, true);
    assert.strictEqual(res.body.account.organization_verified, true);

    // Verify DB update
    await db.read();
    const updated = db.data.users.find(u => u.id === provider.id);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.sponsor_verified, true);
    assert.strictEqual(updated.organization_verified, true);

    console.log('✅ [PASS] test_admin_verify_provider_end_to_end passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_admin_verify_provider_end_to_end:', err);
  process.exit(1);
});
