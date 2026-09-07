const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const student = { id: 9961, email: 'student.cross@iskolar.test', role: 'student', accountStatus: 'ACTIVE' };
    const provider = { id: 9962, email: 'provider.cross@iskolar.test', role: 'provider', accountStatus: 'ACTIVE' };

    db.data.users = (db.data.users || []).filter(u => ![9961, 9962].includes(u.id));
    db.data.users.push(student, provider);
    await db.write();

    const studentToken = signToken(student);
    const providerToken = signToken(provider);

    // Student tries to access admin accounts API
    const sRes = await env.request('GET', '/api/admin/accounts', null, studentToken);
    assert.strictEqual(sRes.status, 403);

    // Provider tries to suspend another account
    const pRes = await env.request('PATCH', `/api/admin/accounts/${student.id}/suspend`, { reason: 'Unauthorized provider action' }, providerToken);
    assert.strictEqual(pRes.status, 403);

    console.log('✅ [PASS] test_cross_role_account_control_denial passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_cross_role_account_control_denial:', err);
  process.exit(1);
});
