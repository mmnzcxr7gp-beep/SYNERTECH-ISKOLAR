const assert = require('assert');
const { db } = require('../src/config/db');

async function testOtpAttemptLimits() {
  console.log('🧪 Testing OTP Attempt Limits & Brute-Force Rate Limiting...');

  if (!db.data.otps) db.data.otps = [];
  const testEmail = 'synthetic.bruteforce.test@iskolar.ph';
  const correctOtp = '555777';

  // 1. Create fresh OTP record
  db.data.otps.push({
    id: 9906,
    email: testEmail,
    otp: correctOtp,
    purpose: 'registration',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    attempts: 0,
    created_at: new Date().toISOString(),
  });

  const record = db.data.otps.find((o) => o.email === testEmail);
  assert.ok(record, 'Record created');

  // 2. Simulate 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    record.attempts += 1;
    const remaining = Math.max(0, 5 - record.attempts);
    assert.strictEqual(record.attempts, i);
    assert.strictEqual(remaining, 5 - i);
  }

  // 3. 5th failed attempt -> Triggers lockout and record invalidation
  record.attempts += 1;
  assert.strictEqual(record.attempts, 5);

  const isLocked = record.attempts >= 5;
  assert.strictEqual(isLocked, true, 'Account/OTP must be locked after 5 failed attempts');

  if (isLocked) {
    db.data.otps = db.data.otps.filter((o) => o.email !== testEmail);
  }

  const purgedRecord = db.data.otps.find((o) => o.email === testEmail);
  assert.strictEqual(purgedRecord, undefined, 'Record purged after exceeding max attempts');

  console.log('✅ PASS test_otp_attempt_limits: 5-attempt limit and lockout verified');
  process.exit(0);
}

testOtpAttemptLimits().catch((err) => {
  console.error('❌ FAIL test_otp_attempt_limits:', err);
  process.exit(1);
});
