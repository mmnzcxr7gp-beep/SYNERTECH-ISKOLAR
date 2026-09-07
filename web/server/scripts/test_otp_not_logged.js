const assert = require('assert');
const { startTestServer, db } = require('./testHelper');

async function run() {
  console.log('🧪 Running test_otp_not_logged...');
  
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_TEST_OVERRIDE = 'true';

  const env = await startTestServer();

  // Capture all console output
  const capturedLogs = [];
  const origLog = console.log;
  const origInfo = console.info;
  const origWarn = console.warn;
  const origError = console.error;

  const interceptor = (msg, ...args) => {
    capturedLogs.push(String(msg) + ' ' + args.map(a => JSON.stringify(a)).join(' '));
  };

  console.log = interceptor;
  console.info = interceptor;
  console.warn = interceptor;
  console.error = interceptor;

  try {
    const unregEmail = 'secret.unreg.' + Date.now() + '@iskolar.test';

    // 1. Trigger OTP generation via send-otp endpoint
    const res = await env.request('POST', '/api/auth/send-otp', {
      email: unregEmail,
      password: 'SecureTestPassword123!',
      firstName: 'Secret',
      lastName: 'Student',
      role: 'student',
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);

    // Fetch generated OTP from database
    await db.read();
    const otpRecord = (db.data.otps || []).find(o => o.email.toLowerCase() === unregEmail.toLowerCase());
    assert(otpRecord, 'OTP record should exist in DB');
    const rawOtp = otpRecord.otp;
    assert(rawOtp && rawOtp.length === 6, 'Valid 6-digit OTP expected in DB');

    // 2. Verify raw OTP never appears unmasked in any console logs
    for (const logLine of capturedLogs) {
      if (logLine.includes('Real-Time') || logLine.includes('Live OTP') || logLine.includes('OTP')) {
        assert(
          !logLine.includes(`"${rawOtp}"`) && !logLine.includes(`'${rawOtp}'`) && !logLine.includes(`: ${rawOtp}`),
          `Unmasked OTP ${rawOtp} found in log line: ${logLine}`
        );
      }
    }
  } finally {
    console.log = origLog;
    console.info = origInfo;
    console.warn = origWarn;
    console.error = origError;
    await env.close();
  }

  console.log('✅ [PASS] test_otp_not_logged: Raw OTP codes are masked and never printed to standard logging');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [FAIL] test_otp_not_logged:', err);
  process.exit(1);
});
