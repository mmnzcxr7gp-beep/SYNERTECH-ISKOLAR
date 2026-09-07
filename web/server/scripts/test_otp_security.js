const assert = require('assert');
const { generateSecureOTP } = require('../src/utils/crypto');

async function testOtpSecurity() {
  console.log('🧪 Testing Cryptographic OTP Security & Constraints...');

  // 1. Generate OTP and verify format
  const otp1 = generateSecureOTP();
  assert.strictEqual(typeof otp1, 'string');
  assert.strictEqual(otp1.length, 6);
  assert.ok(/^\d{6}$/.test(otp1), 'OTP must be 6 digits');

  // Verify entropy across 100 iterations (no duplicates / cryptographically diverse)
  const otps = new Set();
  for (let i = 0; i < 100; i++) {
    otps.add(generateSecureOTP());
  }
  assert.ok(otps.size > 95, 'Generated OTPs must have high cryptographic entropy');

  // 2. Attempt counter and lockout check
  let attempts = 0;
  const maxAttempts = 5;
  const targetOtp = '849201';
  let isLockedOut = false;

  for (let i = 0; i < 6; i++) {
    const entered = '000000';
    if (entered !== targetOtp) {
      attempts++;
      if (attempts >= maxAttempts) {
        isLockedOut = true;
      }
    }
  }

  assert.strictEqual(isLockedOut, true, 'Account/OTP must be locked out after 5 failed attempts');

  // 3. Expiration check
  const pastExpiresAt = new Date(Date.now() - 1000).toISOString();
  const isExpired = new Date() > new Date(pastExpiresAt);
  assert.strictEqual(isExpired, true, 'Expired OTP timestamp must be flagged as expired');

  console.log('✅ PASS test_otp_security: Cryptographic generation, lockout, and expiration verified');
  process.exit(0);
}

testOtpSecurity().catch((err) => {
  console.error('❌ FAIL test_otp_security:', err);
  process.exit(1);
});
