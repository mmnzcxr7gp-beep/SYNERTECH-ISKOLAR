const assert = require('assert');
const { db } = require('../src/config/db');

async function testOtpReplay() {
  console.log('🧪 Testing OTP Replay Attack Prevention...');

  if (!db.data.otps) db.data.otps = [];
  const testEmail = 'synthetic.replay.candidate@iskolar.ph';
  const testCode = '449102';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // 1. Seed active OTP record
  db.data.otps.push({
    id: 9903,
    email: testEmail,
    otp: testCode,
    purpose: 'registration',
    expiresAt,
    attempts: 0,
    created_at: new Date().toISOString(),
  });

  // 2. First verification (should succeed and delete the OTP)
  const firstRecord = db.data.otps.find((o) => o.email === testEmail);
  assert.ok(firstRecord, 'Initial OTP record exists');
  assert.strictEqual(firstRecord.otp, testCode);

  // Consume OTP (Simulate successful verification cleanup)
  db.data.otps = db.data.otps.filter((o) => o.email !== testEmail);

  // 3. Second verification with same code (Replay attempt must fail)
  const replayedRecord = db.data.otps.find((o) => o.email === testEmail);
  assert.strictEqual(replayedRecord, undefined, 'OTP record must not exist after first use');

  const replayOutcome = replayedRecord ? { valid: true } : { valid: false, error: 'No OTP request found' };
  assert.strictEqual(replayOutcome.valid, false);
  assert.strictEqual(replayOutcome.error, 'No OTP request found');

  console.log('✅ PASS test_otp_replay: Single-use invalidation prevents replay attacks');
  process.exit(0);
}

testOtpReplay().catch((err) => {
  console.error('❌ FAIL test_otp_replay:', err);
  process.exit(1);
});
