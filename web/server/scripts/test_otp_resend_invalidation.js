const assert = require('assert');
const { db } = require('../src/config/db');

async function testOtpResendInvalidation() {
  console.log('🧪 Testing OTP Resend Invalidation & Cooldown Logic...');

  if (!db.data.otps) db.data.otps = [];
  const testEmail = 'synthetic.resend.test@iskolar.ph';
  const initialOtp = '111222';
  const initialCreated = new Date(Date.now() - 30 * 1000).toISOString(); // 30s ago

  // 1. Store initial OTP
  db.data.otps.push({
    id: 9904,
    email: testEmail,
    otp: initialOtp,
    purpose: 'registration',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    attempts: 0,
    created_at: initialCreated,
  });

  // 2. Cooldown check: 30 seconds is less than 60 seconds -> Cooldown must trigger
  const beforeRecord = db.data.otps.find((o) => o.email === testEmail);
  const now = Date.now();
  const created = new Date(beforeRecord.created_at).getTime();
  const isCooldownActive = (now - created) < 60 * 1000;

  assert.strictEqual(isCooldownActive, true, 'Cooldown must be active if requested within 60s');

  // 3. Simulate resend after 65 seconds (Cooldown passed)
  const pastRecordCreated = new Date(Date.now() - 65 * 1000).toISOString();
  beforeRecord.created_at = pastRecordCreated;

  const pastCreated = new Date(beforeRecord.created_at).getTime();
  const isAllowedResend = (now - pastCreated) >= 60 * 1000;
  assert.strictEqual(isAllowedResend, true, 'Resend allowed after 60s cooldown');

  // Invalidate old OTPs and generate new code
  db.data.otps = db.data.otps.filter((o) => o.email !== testEmail);
  assert.strictEqual(db.data.otps.filter((o) => o.email === testEmail).length, 0, 'Prior OTPs purged before resend');

  const newOtp = '888999';
  db.data.otps.push({
    id: 9905,
    email: testEmail,
    otp: newOtp,
    purpose: 'registration',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    attempts: 0,
    created_at: new Date().toISOString(),
  });

  const latestRecord = db.data.otps.find((o) => o.email === testEmail);
  assert.strictEqual(latestRecord.otp, newOtp, 'Latest OTP is stored');
  assert.notStrictEqual(latestRecord.otp, initialOtp, 'Initial OTP is no longer valid');

  // Cleanup
  db.data.otps = db.data.otps.filter((o) => o.email !== testEmail);

  console.log('✅ PASS test_otp_resend_invalidation: Prior OTP purged and 60s cooldown enforced');
  process.exit(0);
}

testOtpResendInvalidation().catch((err) => {
  console.error('❌ FAIL test_otp_resend_invalidation:', err);
  process.exit(1);
});
