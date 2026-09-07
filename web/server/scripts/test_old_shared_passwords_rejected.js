const assert = require('assert');
const { startTestServer, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_old_shared_passwords_rejected...');
  const env = await startTestServer();

  try {
    const knownAccounts = [
      'admin@iskolar.ph',
      'security.admin@iskolar.ph',
      'gokongwei.brothers@iskolar.ph',
      'ayala.foundation@iskolar.ph',
      'sm.foundation@iskolar.ph',
      'aboitiz.foundation@iskolar.ph',
      'megaworld.foundation@iskolar.ph',
      'juan.delacruz@iskolar.ph',
      'maria.santos@iskolar.ph',
      'joshua.reyes@iskolar.ph',
      'angelica.lopez@iskolar.ph',
      'christian.bautista@iskolar.ph',
    ];

    const prohibitedSharedPasswords = [
      'Password123!',
      'password',
      'admin123',
      '12345678',
      'IskolarPass123!',
      'secret',
    ];

    for (const email of knownAccounts) {
      for (const badPassword of prohibitedSharedPasswords) {
        const res = await env.request('POST', '/api/auth/login', {
          email,
          password: badPassword,
        });

        assert.strictEqual(
          res.status,
          401,
          `Expected 401 Unauthorized for ${email} using shared password "${badPassword}", but got ${res.status}`
        );
        assert.strictEqual(
          res.body?.requiresMfa,
          undefined,
          `Shared password must not trigger MFA progression for ${email}`
        );
      }
    }

    console.log('✅ [PASS] test_old_shared_passwords_rejected: All shared passwords strictly rejected for every account');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_old_shared_passwords_rejected:', err);
  process.exit(1);
});
