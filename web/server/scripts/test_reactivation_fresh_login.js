const assert = require('assert');
const bcrypt = require('bcrypt');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING REACTIVATION FRESH LOGIN TEST');
  const env = await startTestServer();
  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = { id: 14261, email: 'admin.reactlogin@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const user = {
      id: 14262,
      email: 'user.reactlogin@iskolar.test',
      password: passwordHash,
      role: 'student',
      accountStatus: 'SUSPENDED',
      isSuspended: true
    };

    db.data.users = (db.data.users || []).filter(u => ![14261, 14262].includes(u.id));
    db.data.users.push(admin, user);
    await db.write();

    const adminToken = signToken(admin);

    // 1. Login blocked
    const blockedRes = await env.request('POST', '/api/auth/login', {
      email: 'user.reactlogin@iskolar.test',
      password: 'Password123!',
      skipMfa: true
    });
    assert.strictEqual(blockedRes.status, 403);

    // 2. Reactivate via Admin API
    const reactRes = await env.request('PATCH', `/api/admin/accounts/${user.id}/reactivate`, {
      reason: 'Reinstatement approved by administration'
    }, adminToken);
    assert.strictEqual(reactRes.status, 200);

    // 3. Fresh login succeeds
    const loginRes = await env.request('POST', '/api/auth/login', {
      email: 'user.reactlogin@iskolar.test',
      password: 'Password123!',
      skipMfa: true
    });
    assert.strictEqual(loginRes.status, 200);
    assert(loginRes.body.token, 'Fresh login must return JWT token');

    console.log('✅ [PASS] test_reactivation_fresh_login passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_reactivation_fresh_login:', err);
  process.exit(1);
});
