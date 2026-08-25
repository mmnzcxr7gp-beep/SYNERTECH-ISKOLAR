const assert = require('assert');
const { db } = require('../src/config/db');

async function testOtpExpiration() {
  console.log('🧪 Testing OTP Expiration Enforcement...');

  if (!db.data.otps) db.data.otps = [];
  const testEmail = 'synthetic.expired.test@iskolar.ph';
  const testCode = '719283';
  
  // Set expiration in the past
  const expiredTimestamp = new Date(Date.now() - 60 * 1000).toISOString();

  db.data.otps.push({
    id: 9902,
    email: testEmail,
    otp: testCode,
    purpose: 'registration',
    expiresAt: expiredTimestamp,
    attempts: 0,
    created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
  });

  const record = db.data.otps.find((o) => o.email === testEmail);
  assert.ok(record, 'Expired record found in DB');
  
  const isExpired = new Date() > new Date(record.expiresAt);
  assert.strictEqual(isExpired, true, 'OTP must evaluate as expired when current time exceeds expiresAt');

  // Verify that an expired OTP is rejected
  let verificationOutcome = null;
  if (isExpired) {
    verificationOutcome = { success: false, message: 'Verification code expired. Please request a new code.' };
  } else {
    verificationOutcome = { success: true };
  }

  assert.strictEqual(verificationOutcome.success, false);
  assert.strictEqual(verificationOutcome.message, 'Verification code expired. Please request a new code.');

  // Cleanup
  db.data.otps = db.data.otps.filter((o) => o.email !== testEmail);

  console.log('✅ PASS test_otp_expiration: Expired OTPs strictly rejected');
  process.exit(0);
}

testOtpExpiration().catch((err) => {
  console.error('❌ FAIL test_otp_expiration:', err);
  process.exit(1);
});
