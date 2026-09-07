const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 9831, email: 'admin.pver@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = {
      id: 9832,
      email: 'provider.pver@iskolar.test',
      role: 'provider',
      company: 'Ayala Foundation',
      sponsor_verified: false,
      organization_verified: false,
      accountStatus: 'PENDING_ADMIN_REVIEW',
    };

    db.data.users = (db.data.users || []).filter(u => ![9831, 9832].includes(u.id));
    db.data.users.push(admin, provider);
    await db.write();

    const token = signToken(admin);

    const res = await env.request('PATCH', `/api/admin/accounts/${provider.id}/verify`, { reason: 'Corporate SEC registration validated' }, token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res.body.account.sponsor_verified, true);

    await db.read();
    const updated = db.data.users.find(u => u.id === provider.id);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');

    console.log('✅ [PASS] test_admin_provider_verification passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_admin_provider_verification:', err);
  process.exit(1);
});
