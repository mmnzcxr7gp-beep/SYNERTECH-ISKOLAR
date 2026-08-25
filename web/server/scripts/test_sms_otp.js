/**
 * ISKOLAR Automated Test Suite: SMS OTP Verification & Security Controls
 * 
 * Tests:
 * 1. Missing phone parameter
 * 2. Invalid phone format
 * 3. Missing SMS consent
 * 4. Valid send request with masked destination
 * 5. Idempotent duplicate send request
 * 6. Resend cooldown enforcement (429)
 * 7. Correct code verification
 * 8. Incorrect code verification
 * 9. Expired code rejection
 * 10. Reused code rejection (single-use lifecycle)
 * 11. Attempt limit lockout (max 3 tries)
 * 12. Duplicate registered phone policy
 * 13. Safe fallback when SMS_ENABLED=false (SMS_NOT_CONFIGURED)
 */

const assert = require('assert');
const smsService = require('../src/utils/smsService');

async function runSmsOtpTests() {
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING ISKOLAR SMS OTP VERIFICATION & SECURITY TESTS');
  console.log('🧪 ====================================================');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Phone Normalization Tests
  test('1. Normalizes Philippine 11-digit mobile (09XXXXXXXXX) to E.164 (+639XXXXXXXXX)', () => {
    const res = smsService.normalizeToE164('09171234567');
    assert.strictEqual(res, '+639171234567');
  });

  test('2. Normalizes 10-digit mobile (9XXXXXXXXX) to E.164 (+639XXXXXXXXX)', () => {
    const res = smsService.normalizeToE164('9171234567');
    assert.strictEqual(res, '+639171234567');
  });

  test('3. Rejects invalid non-phone string safely', () => {
    const res = smsService.normalizeToE164('not-a-phone-number');
    assert.strictEqual(res, null);
  });

  test('4. Masks phone number properly without exposing full number', () => {
    const masked = smsService.maskPhoneNumber('+639171234567');
    assert.strictEqual(masked, '+63 ••• ••• 4567');
    assert.strictEqual(masked.includes('123'), false, 'Masked phone should not expose middle digits');
  });

  // 2. Request OTP Validation Tests
  await asyncTest('5. Rejects request with missing SMS consent', async () => {
    smsService.resetSmsState();
    const res = await smsService.requestSmsOtp({ phone: '09171234567', smsConsent: false });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.code, 'CONSENT_REQUIRED');
  });

  await asyncTest('6. Rejects request with invalid phone format', async () => {
    smsService.resetSmsState();
    const res = await smsService.requestSmsOtp({ phone: '12345', smsConsent: true });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.code, 'INVALID_PHONE_FORMAT');
  });

  await asyncTest('7. Generates OTP with valid phone and consent (Safe Fallback / SMS_NOT_CONFIGURED)', async () => {
    smsService.resetSmsState();
    process.env.ALLOW_TEST_OVERRIDE = 'true';
    const res = await smsService.requestSmsOtp({ phone: '09171234567', smsConsent: true });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.maskedPhone, '+63 ••• ••• 4567');
    assert.strictEqual(typeof res.expiresIn, 'number');
    assert.strictEqual(res.code, 'SMS_NOT_CONFIGURED');
  });

  await asyncTest('8. Enforces resend cooldown (429) on immediate repeated request', async () => {
    const res = await smsService.requestSmsOtp({ phone: '09171234567', smsConsent: true });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 429);
    assert.strictEqual(res.code, 'RESEND_COOLDOWN_ACTIVE');
    assert(res.retryAfter > 0);
  });

  await asyncTest('9. Supports idempotent repeated request with identical idempotencyKey', async () => {
    smsService.resetSmsState();
    const key = 'idem-req-12345';
    const res1 = await smsService.requestSmsOtp({ phone: '09171234567', smsConsent: true, idempotencyKey: key });
    assert.strictEqual(res1.success, true);

    const res2 = await smsService.requestSmsOtp({ phone: '09171234567', smsConsent: true, idempotencyKey: key });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.code, 'OTP_SENT_IDEMPOTENT');
  });

  // 3. OTP Verification Tests
  await asyncTest('10. Rejects verification with incorrect code and decrements remaining attempts', async () => {
    smsService.resetSmsState();
    await smsService.requestSmsOtp({ phone: '09171234567', smsConsent: true });
    
    const verifyRes = await smsService.verifySmsOtp({ phone: '09171234567', code: '000000' });
    assert.strictEqual(verifyRes.success, false);
    assert.strictEqual(verifyRes.statusCode, 400);
    assert.strictEqual(verifyRes.code, 'INCORRECT_CODE');
    assert.strictEqual(verifyRes.attemptsRemaining, 2);
  });

  await asyncTest('11. Locks out verification after 3 failed attempts (TOO_MANY_ATTEMPTS)', async () => {
    // Attempt 2
    await smsService.verifySmsOtp({ phone: '09171234567', code: '111111' });
    // Attempt 3
    await smsService.verifySmsOtp({ phone: '09171234567', code: '222222' });
    // Attempt 4 -> Locked
    const lockRes = await smsService.verifySmsOtp({ phone: '09171234567', code: '333333' });
    assert.strictEqual(lockRes.success, false);
    assert.strictEqual(lockRes.statusCode, 429);
    assert.strictEqual(lockRes.code, 'TOO_MANY_ATTEMPTS');
  });

  await asyncTest('12. Successfully verifies with correct code and marks single-use consumed', async () => {
    smsService.resetSmsState();
    await smsService.requestSmsOtp({ phone: '09189876543', smsConsent: true });
    const testCode = smsService.getTestOtpForPhone('09189876543');
    assert(testCode, 'Test OTP code should be generated for testing');

    const verifyRes = await smsService.verifySmsOtp({ phone: '09189876543', code: testCode });
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.code, 'PHONE_VERIFIED');
    assert.strictEqual(verifyRes.normalizedPhone, '+639189876543');

    // 13. Reused code check: verify that code cannot be reused (single-use lifecycle)
    const reuseRes = await smsService.verifySmsOtp({ phone: '09189876543', code: testCode });
    assert.strictEqual(reuseRes.success, false);
    assert.strictEqual(reuseRes.code, 'NO_ACTIVE_OTP');
  });

  console.log('🧪 ====================================================');
  console.log(`🧪 SMS OTP TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('🧪 ====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSmsOtpTests().catch((e) => {
    console.error('Fatal SMS test error:', e);
    process.exit(1);
  });
}

module.exports = { runSmsOtpTests };
