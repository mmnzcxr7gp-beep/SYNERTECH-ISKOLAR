const assert = require('assert');
const jwt = require('jsonwebtoken');
const { startTestServer, db, TEST_JWT_SECRET } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_fixed_otp_test_only...');
  
  // Set explicit test override environment
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_TEST_OVERRIDE = 'true';

  const env = await startTestServer();

  try {
    const student = { id: 19901, email: 'otp.test@iskolar.test', role: 'student', password: 'hash' };
    db.data.users = (db.data.users || []).filter(u => u.id !== student.id);
    db.data.users.push(student);
    await db.write();

    const mfaToken = jwt.sign(
      { id: student.id, email: student.email, purpose: 'mfa' },
      TEST_JWT_SECRET,
      { expiresIn: '10m' }
    );

    // When NODE_ENV === 'test' and ALLOW_TEST_OVERRIDE === 'true', fixed test OTP 123456 is allowed for test automation
    const res = await env.request('POST', '/api/auth/verify-login-otp', {
      mfaToken,
      otp: '123456',
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK in test override mode, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body?.token, 'Expected JWT token in test response');
    assert.strictEqual(res.body?.user?.email, student.email);

    console.log('✅ [PASS] test_fixed_otp_test_only: Fixed OTP operates exclusively under test override flag');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_fixed_otp_test_only:', err);
  process.exit(1);
});
