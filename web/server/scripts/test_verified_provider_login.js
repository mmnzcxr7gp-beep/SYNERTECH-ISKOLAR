const assert = require('assert');
const bcrypt = require('bcrypt');
const { startTestServer, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING VERIFIED PROVIDER LOGIN TEST');
  const env = await startTestServer();
  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const provider = {
      id: 13021,
      email: 'verified.provider@iskolar.test',
      password: passwordHash,
      role: 'provider',
      accountStatus: 'ACTIVE',
      sponsor_verified: true,
      organization_verified: true,
      isSuspended: false,
      isDeleted: false
    };

    db.data.users = (db.data.users || []).filter(u => u.id !== 13021);
    db.data.users.push(provider);
    await db.write();

    // Login
    const res = await env.request('POST', '/api/auth/login', {
      email: 'verified.provider@iskolar.test',
      password: 'Password123!',
      skipMfa: true
    });

    assert.strictEqual(res.status, 200);
    assert(res.body.token, 'Must return JWT token upon successful login');
    assert.strictEqual(res.body.user.role, 'provider');

    // Access protected provider route
    const meRes = await env.request('GET', '/api/auth/me', null, res.body.token);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.sponsor_verified, true);
    assert.strictEqual(meRes.body.user.verificationStatus, 'verified');

    console.log('✅ [PASS] test_verified_provider_login passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_verified_provider_login:', err);
  process.exit(1);
});
