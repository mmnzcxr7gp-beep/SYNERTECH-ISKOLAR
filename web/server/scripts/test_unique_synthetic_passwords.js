const assert = require('assert');
const bcrypt = require('bcrypt');
const { startTestServer, db } = require('./testHelper');
const { getSyntheticCredentialsMap } = require('../src/config/syntheticCredentials');

async function run() {
  console.log('🧪 Running test_unique_synthetic_passwords...');
  const env = await startTestServer();

  try {
    const credMap = getSyntheticCredentialsMap();
    const emails = Object.keys(credMap);
    assert(emails.length >= 12, 'Expected at least 12 synthetic accounts');

    // 1. Verify every account has a unique password value (no two accounts share passwords)
    const passwords = Object.values(credMap);
    const uniquePasswords = new Set(passwords);
    assert.strictEqual(
      passwords.length,
      uniquePasswords.size,
      'Cross-account password reuse detected! Each synthetic account must have a unique password.'
    );

    // 2. Verify each synthetic password is minimum 16 characters and strong
    for (const [email, pwd] of Object.entries(credMap)) {
      assert(
        pwd.length >= 16,
        `Password for ${email} is too short (${pwd.length} chars). Minimum is 16.`
      );
      assert(
        /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd),
        `Password for ${email} does not meet cryptographic complexity criteria.`
      );
    }

    // 3. Verify that each synthetic user in db.data.users has a bcrypt hash that matches its unique password
    for (const email of emails) {
      const user = db.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      assert(user, `User ${email} not found in database`);
      const matches = bcrypt.compareSync(credMap[email], user.password);
      assert(matches, `Unique synthetic password for ${email} did not match stored bcrypt hash`);

      // Verify that another user's password fails
      const otherEmail = emails.find((e) => e !== email);
      const otherMatches = bcrypt.compareSync(credMap[otherEmail], user.password);
      assert(!otherMatches, `Password for ${otherEmail} unexpectedly authenticated ${email}`);
    }

    console.log('✅ [PASS] test_unique_synthetic_passwords: 100% unique cryptographic credentials per account');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_unique_synthetic_passwords:', err);
  process.exit(1);
});
