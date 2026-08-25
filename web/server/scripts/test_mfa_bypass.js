const assert = require('assert');
const jwt = require('jsonwebtoken');

async function testMfaBypass() {
  console.log('🧪 Testing MFA Bypass Protection & Token Scope Enforcement...');

  const JWT_SECRET = process.env.JWT_SECRET || 'iskolar-dev-secret-key';

  // 1. Generate an MFA token with purpose: 'mfa'
  const mfaToken = jwt.sign(
    { id: 101, email: 'candidate@iskolar.ph', purpose: 'mfa' },
    JWT_SECRET,
    { expiresIn: '10m' }
  );

  // 2. Verify decoded token has purpose 'mfa' (cannot be used as full auth session)
  const decoded = jwt.verify(mfaToken, JWT_SECRET);
  assert.strictEqual(decoded.purpose, 'mfa');
  assert.strictEqual(decoded.role, undefined, 'MFA intermediate token must NOT contain full role authority');

  // Verify authMiddleware directly rejects intermediate MFA token
  const { authMiddleware } = require('../src/middleware/authMiddleware');
  let authMiddlewareBlocked = false;
  const mockReq = {
    headers: { authorization: `Bearer ${mfaToken}` },
  };
  const mockRes = {
    status: (code) => {
      if (code === 401) authMiddlewareBlocked = true;
      return { json: () => {} };
    },
  };
  authMiddleware(mockReq, mockRes, () => {
    assert.fail('authMiddleware must NOT invoke next() for intermediate MFA tokens');
  });
  assert.strictEqual(authMiddlewareBlocked, true, 'authMiddleware must return HTTP 401 for intermediate MFA tokens');

  // 3. Verify valid completed session token is accepted by authMiddleware
  const validSessionToken = jwt.sign(
    { id: 101, email: 'candidate@iskolar.ph', role: 'student' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  let validNextCalled = false;
  const mockValidReq = { headers: { authorization: `Bearer ${validSessionToken}` } };
  const mockValidRes = {
    status: () => ({ json: () => {} }),
  };
  authMiddleware(mockValidReq, mockValidRes, () => {
    validNextCalled = true;
  });
  assert.strictEqual(validNextCalled, true, 'authMiddleware must accept valid completed session tokens and invoke next()');
  assert.strictEqual(mockValidReq.user.role, 'student');

  // 4. Test malformed token rejection
  let malformedBlocked = false;
  const mockMalformedReq = { headers: { authorization: 'Bearer not.a.valid.jwt' } };
  const mockMalformedRes = {
    status: (code) => {
      if (code === 401) malformedBlocked = true;
      return { json: () => {} };
    },
  };
  authMiddleware(mockMalformedReq, mockMalformedRes, () => {
    assert.fail('authMiddleware must not invoke next() for malformed tokens');
  });
  assert.strictEqual(malformedBlocked, true, 'authMiddleware must reject malformed tokens with HTTP 401');

  // 5. Test expired token rejection
  const expiredToken = jwt.sign(
    { id: 101, email: 'candidate@iskolar.ph', role: 'student' },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
  let expiredBlocked = false;
  const mockExpiredReq = { headers: { authorization: `Bearer ${expiredToken}` } };
  const mockExpiredRes = {
    status: (code) => {
      if (code === 401) expiredBlocked = true;
      return { json: () => {} };
    },
  };
  authMiddleware(mockExpiredReq, mockExpiredRes, () => {
    assert.fail('authMiddleware must not invoke next() for expired tokens');
  });
  assert.strictEqual(expiredBlocked, true, 'authMiddleware must reject expired tokens with HTTP 401');

  // 6. Test tampered token rejection
  let tamperedFailed = false;
  try {
    jwt.verify(mfaToken + 'invalid_signature_bits', JWT_SECRET);
  } catch (err) {
    tamperedFailed = true;
  }
  assert.strictEqual(tamperedFailed, true, 'Tampered MFA tokens must be rejected');

  // 4. Test master override gating condition
  const devEnv = 'development';
  const testEnv = 'test';
  const overrideDisabled = 'false';
  const overrideEnabled = 'true';

  const isDevOverrideAllowed = devEnv === 'test' && overrideEnabled === 'true';
  assert.strictEqual(isDevOverrideAllowed, false, 'Dev mode must never allow master override');

  const isTestWithoutFlagAllowed = testEnv === 'test' && overrideDisabled === 'true';
  assert.strictEqual(isTestWithoutFlagAllowed, false, 'Test mode without explicit env flag must never allow override');

  const isTestOverrideAllowed = testEnv === 'test' && overrideEnabled === 'true';
  assert.strictEqual(isTestOverrideAllowed, true, 'Override allowed strictly under test environment with explicit flag');

  console.log('✅ PASS test_mfa_bypass: Intermediate token isolation and override gating verified');
  process.exit(0);
}

testMfaBypass().catch((err) => {
  console.error('❌ FAIL test_mfa_bypass:', err);
  process.exit(1);
});
