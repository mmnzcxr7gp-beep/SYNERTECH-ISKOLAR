const assert = require('assert');
const jwt = require('jsonwebtoken');
const { startTestServer, db, TEST_JWT_SECRET } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_fixed_otp_production_rejection...');

  const nonTestEnvironments = [
    { env: 'production', override: 'false' },
    { env: 'production', override: undefined },
    { env: 'development', override: 'false' },
    { env: 'development', override: undefined },
    { env: 'staging', override: 'false' },
    { env: 'staging', override: undefined },
    { env: 'test', override: 'false' },
    { env: 'test', override: undefined },
  ];

  for (const config of nonTestEnvironments) {
    process.env.NODE_ENV = config.env;
    if (config.override === undefined) {
      delete process.env.ALLOW_TEST_OVERRIDE;
    } else {
      process.env.ALLOW_TEST_OVERRIDE = config.override;
    }

    const env = await startTestServer();
    try {
      const student = { id: 19902, email: 'prod.otp@iskolar.test', role: 'student', password: 'hash' };
      db.data.users = (db.data.users || []).filter(u => u.id !== student.id);
      db.data.users.push(student);
      await db.write();

      const mfaToken = jwt.sign(
        { id: student.id, email: student.email, purpose: 'mfa' },
        TEST_JWT_SECRET,
        { expiresIn: '10m' }
      );

      // Attempt fixed OTPs outside of explicit test override mode
      const testCodes = ['123456', '000000', '999999'];
      for (const code of testCodes) {
        const res = await env.request('POST', '/api/auth/verify-login-otp', {
          mfaToken,
          otp: code,
        });

        assert.strictEqual(
          res.status,
          400,
          `Expected 400 Bad Request in NODE_ENV=${config.env} (ALLOW_TEST_OVERRIDE=${config.override}) for fixed code ${code}, but got ${res.status}`
        );
        assert.strictEqual(
          res.body?.token,
          undefined,
          `Token must not be granted with fixed OTP in ${config.env}`
        );
      }
    } finally {
      await env.close();
    }
  }

  console.log('✅ [PASS] test_fixed_otp_production_rejection: Fixed OTP is rejected across all non-test environments');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_fixed_otp_production_rejection:', err);
  process.exit(1);
});
