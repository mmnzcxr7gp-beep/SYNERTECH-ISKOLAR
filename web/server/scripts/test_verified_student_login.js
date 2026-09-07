const assert = require('assert');
const bcrypt = require('bcrypt');
const { startTestServer, db } = require('./testHelper');

async function run() {
  console.log('🧪 RUNNING VERIFIED STUDENT LOGIN TEST');
  const env = await startTestServer();
  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const student = {
      id: 13031,
      email: 'verified.student@iskolar.test',
      password: passwordHash,
      role: 'student',
      accountStatus: 'ACTIVE',
      isVerified: true,
      student_verified: true,
      verificationStatus: 'verified',
      isSuspended: false,
      isDeleted: false
    };

    db.data.users = (db.data.users || []).filter(u => u.id !== 13031);
    db.data.users.push(student);
    await db.write();

    // Login
    const res = await env.request('POST', '/api/auth/login', {
      email: 'verified.student@iskolar.test',
      password: 'Password123!',
      skipMfa: true
    });

    assert.strictEqual(res.status, 200);
    assert(res.body.token, 'Must return JWT token');

    // Access protected verification status
    const statusRes = await env.request('GET', '/api/verification/status', null, res.body.token);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.verificationStatus.isVerified, true);
    assert.strictEqual(statusRes.body.verificationStatus.status, 'verified');

    console.log('✅ [PASS] test_verified_student_login passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_verified_student_login:', err);
  process.exit(1);
});
