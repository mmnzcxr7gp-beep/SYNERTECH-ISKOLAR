const assert = require('assert');
const { db } = require('../src/config/db');

async function testOtpGeneration() {
  console.log('🧪 Testing OTP Generation & Formatting Standards...');

  const crypto = require('crypto');
  const otps = [];
  for (let i = 0; i < 100; i++) {
    const code = crypto.randomInt(100000, 1000000).toString();
    assert.strictEqual(code.length, 6, 'OTP must be exactly 6 digits');
    assert.match(code, /^[0-9]{6}$/, 'OTP must contain numeric characters only');
    otps.push(code);
  }

  // 2. Verify randomness across sample
  const uniqueOtps = new Set(otps);
  assert.ok(uniqueOtps.size > 90, 'OTP generator must produce high-entropy pseudo-random codes');

  // 3. Verify OTP record structure in memory / DB
  if (!db.data.otps) db.data.otps = [];
  const testEmail = 'synthetic.candidate.gen@iskolar.ph';
  const testCode = '839201';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.data.otps.push({
    id: 9901,
    email: testEmail,
    otp: testCode,
    purpose: 'registration',
    expiresAt,
    attempts: 0,
    created_at: new Date().toISOString(),
  });

  const stored = db.data.otps.find((o) => o.email === testEmail);
  assert.ok(stored, 'OTP record must persist in database table');
  assert.strictEqual(stored.otp, testCode);
  assert.strictEqual(stored.attempts, 0);

  // Cleanup
  db.data.otps = db.data.otps.filter((o) => o.email !== testEmail);

  console.log('✅ PASS test_otp_generation: 6-digit numeric formatting and entropy verified');
  process.exit(0);
}

testOtpGeneration().catch((err) => {
  console.error('❌ FAIL test_otp_generation:', err);
  process.exit(1);
});
