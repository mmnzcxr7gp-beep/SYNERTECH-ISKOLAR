const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');

async function run() {
  const env = await startTestServer();
  try {
    const student = {
      id: 9882,
      email: 'suspended.student@iskolar.test',
      role: 'student',
      isSuspended: true,
      accountStatus: 'SUSPENDED',
    };

    db.data.users = (db.data.users || []).filter(u => u.id !== 9882);
    db.data.users.push(student);
    await db.write();

    const token = signToken(student);

    const res = await env.request('GET', '/api/auth/me', null, token);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'ACCOUNT_SUSPENDED');

    console.log('✅ [PASS] test_suspended_account_login_denial passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_suspended_account_login_denial:', err);
  process.exit(1);
});
