const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING ARCHIVE AND RESTORE FULL LIFECYCLE TEST');
  const env = await startTestServer();
  try {
    const admin = { id: 14301, email: 'admin.archlife@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const provider = { id: 14302, email: 'provider.archlife@iskolar.test', role: 'provider', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![14301, 14302].includes(u.id));
    db.data.users.push(admin, provider);
    await db.write();

    const adminToken = signToken(admin);
    const providerToken = signToken(provider);

    // 1. Initial access works
    const res1 = await env.request('GET', '/api/auth/me', null, providerToken);
    assert.strictEqual(res1.status, 200);

    // 2. Admin archives account
    const archRes = await env.request('PATCH', `/api/admin/accounts/${provider.id}/archive`, {
      reason: 'Partner foundation inactive for current academic year.'
    }, adminToken);
    assert.strictEqual(archRes.status, 200);
    assert.strictEqual(archRes.body.account.accountStatus, 'ARCHIVED');

    // 3. Access denied while archived
    const res2 = await env.request('GET', '/api/auth/me', null, providerToken);
    assert.strictEqual(res2.status, 403);

    // 4. Admin restores account
    const restRes = await env.request('POST', `/api/admin/accounts/${provider.id}/restore`, {
      reason: 'Partner foundation renewed partnership agreement.'
    }, adminToken);
    assert.strictEqual(restRes.status, 200);
    assert.strictEqual(restRes.body.account.accountStatus, 'ACTIVE');

    console.log('✅ [PASS] test_archive_restore_lifecycle passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_archive_restore_lifecycle:', err);
  process.exit(1);
});
