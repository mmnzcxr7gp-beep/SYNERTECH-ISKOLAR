/**
 * test_sec01_sec02_sec03_remediation.js
 * Comprehensive regression test suite proving resolution of:
 * - SEC-01: Universal/backdoor password rejection across all roles and NODE_ENV modes
 * - SEC-02: Server-driven MFA enforcement and complete neutralization of client-side bypasses
 * - SEC-03: Android release signing keystore protection, Git ignore rules, and placeholder template
 */

const assert = require('assert');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execSync } = require('child_process');
const { startTestServer } = require('./testHelper');

function customRequest(port, method, reqPath, body, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://127.0.0.1:${port}${reqPath}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...customHeaders,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, statusCode: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
          } catch (_) {
            resolve({ status: res.statusCode, statusCode: res.statusCode, headers: res.headers, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('🛡️  RUNNING HIGH-SEVERITY SECURITY REMEDIATION VERIFICATION');
  console.log('   Testing SEC-01, SEC-02, and SEC-03 fixes and regressions');
  console.log('================================================================\n');

  const env = await startTestServer();
  const port = env.port;
  let passedCount = 0;
  let totalCount = 0;

  function recordPass(testName) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
    totalCount++;
  }

  function recordFail(testName, err) {
    console.error(`  ❌ [FAIL] ${testName}:`, err?.message || err);
    totalCount++;
    throw err;
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'iskolar-dev-secret-key';

  try {
    const { db } = require('../src/config/db');

    // Setup synthetic test users for distinct roles
    const realStudentPassword = 'StudentStrongPassword2026!';
    const realProviderPassword = 'ProviderStrongPassword2026!';
    const realAdminPassword = 'AdminStrongPassword2026!';

    const studentUser = {
      id: 9801,
      name: 'Remediation Test Student',
      email: 'sec.student@iskolar.test',
      password: bcrypt.hashSync(realStudentPassword, 10),
      role: 'student',
      mfaEnabled: false,
      isSuspended: false,
      accountStatus: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    const providerUser = {
      id: 9802,
      name: 'Remediation Test Provider',
      email: 'sec.provider@iskolar.test',
      password: bcrypt.hashSync(realProviderPassword, 10),
      role: 'provider',
      mfaEnabled: true, // explicit 2FA enabled
      isSuspended: false,
      accountStatus: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    const adminUser = {
      id: 9803,
      name: 'Remediation Test Admin',
      email: 'sec.admin@iskolar.test',
      password: bcrypt.hashSync(realAdminPassword, 10),
      role: 'admin', // mandatory 2FA by role policy
      mfaEnabled: false,
      isSuspended: false,
      accountStatus: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    const suspendedUser = {
      id: 9804,
      name: 'Remediation Suspended User',
      email: 'sec.suspended@iskolar.test',
      password: bcrypt.hashSync('AnyValidPassword2026!', 10),
      role: 'student',
      mfaEnabled: false,
      isSuspended: true,
      accountStatus: 'SUSPENDED',
      suspensionReason: 'Policy violation',
      created_at: new Date().toISOString(),
    };

    // Push test users into db
    db.data.users = (db.data.users || []).filter((u) => !u.email.endsWith('@iskolar.test'));
    db.data.users.push(studentUser, providerUser, adminUser, suspendedUser);

    // ──────────────────────────────────────────────────────────────────────────
    // PART 1: SEC-01 BACKDOOR PASSWORD REMOVAL
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- PART 1: SEC-01 BACKDOOR PASSWORD REMOVAL ---');

    // 1.1 Correct password is accepted for student
    try {
      const res = await customRequest(port, 'POST', '/api/auth/login', {
        email: studentUser.email,
        password: realStudentPassword,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert(!!res.body.token, 'Expected session token in response');
      assert.strictEqual(res.body.user.email, studentUser.email);
      recordPass('1.1 Correct account password is accepted');
    } catch (e) {
      recordFail('1.1 Correct account password is accepted', e);
    }

    // 1.2 Incorrect password is rejected
    try {
      const res = await customRequest(port, 'POST', '/api/auth/login', {
        email: studentUser.email,
        password: 'CompletelyWrongPassword!',
      });
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
      assert.strictEqual(res.body.token, undefined);
      recordPass('1.2 Incorrect password is rejected');
    } catch (e) {
      recordFail('1.2 Incorrect password is rejected', e);
    }

    // 1.3 Backdoor Password123! is strictly rejected when not the user password
    try {
      const res = await customRequest(port, 'POST', '/api/auth/login', {
        email: studentUser.email,
        password: 'Password123!',
      });
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
      assert.strictEqual(res.body.token, undefined);
      recordPass('1.3 Backdoor Password123! is rejected on student account');
    } catch (e) {
      recordFail('1.3 Backdoor Password123! is rejected on student account', e);
    }

    // 1.4 Backdoor Password123! is strictly rejected across multiple NODE_ENV modes
    const envModes = ['development', 'test', 'staging', 'preview', 'production', ''];
    for (const mode of envModes) {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = mode;
        const res = await customRequest(port, 'POST', '/api/auth/login', {
          email: studentUser.email,
          password: 'Password123!',
        });
        assert.strictEqual(res.status, 401, `NODE_ENV="${mode}": Expected 401, got ${res.status}`);
        assert.strictEqual(res.body.token, undefined);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    }
    recordPass('1.4 Backdoor Password123! rejected under development, test, staging, preview, and production modes');

    // 1.5 Backdoor Password123! rejected on provider and admin accounts
    try {
      const pRes = await customRequest(port, 'POST', '/api/auth/login', {
        email: providerUser.email,
        password: 'Password123!',
      });
      assert.strictEqual(pRes.status, 401, `Expected 401 on provider, got ${pRes.status}`);

      const aRes = await customRequest(port, 'POST', '/api/auth/login', {
        email: adminUser.email,
        password: 'Password123!',
      });
      assert.strictEqual(aRes.status, 401, `Expected 401 on admin, got ${aRes.status}`);
      recordPass('1.5 Backdoor Password123! rejected across provider and admin accounts');
    } catch (e) {
      recordFail('1.5 Backdoor Password123! rejected across provider and admin accounts', e);
    }

    // 1.6 Suspended account handling remains strictly enforced
    try {
      const res = await customRequest(port, 'POST', '/api/auth/login', {
        email: suspendedUser.email,
        password: 'AnyValidPassword2026!',
      });
      assert.strictEqual(res.status, 403, `Expected 403 for suspended user, got ${res.status}`);
      assert.strictEqual(res.body.code, 'ACCOUNT_SUSPENDED');
      recordPass('1.6 Suspended accounts remain blocked');
    } catch (e) {
      recordFail('1.6 Suspended accounts remain blocked', e);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PART 2: SEC-02 CLIENT-CONTROLLED MFA BYPASS REMOVAL
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- PART 2: SEC-02 CLIENT-CONTROLLED MFA BYPASS REMOVAL ---');

    // 2.1 Provider with mfaEnabled: true requires MFA challenge; skipMfa: true is IGNORED
    let mfaTokenForTest = null;
    let devOtpForTest = null;
    try {
      const res = await customRequest(port, 'POST', '/api/auth/login', {
        email: providerUser.email,
        password: realProviderPassword,
        skipMfa: true, // Malicious bypass payload
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.token, undefined, 'Server MUST NOT issue full access token when skipMfa: true is sent');
      assert.strictEqual(res.body.requiresMfa, true, 'Server must return requiresMfa: true');
      assert(!!res.body.mfaToken, 'Server must return intermediate mfaToken');
      mfaTokenForTest = res.body.mfaToken;
      devOtpForTest = res.body.devOtp;
      recordPass('2.1 skipMfa: true in request body is ignored; MFA challenge returned');
    } catch (e) {
      recordFail('2.1 skipMfa: true in request body is ignored; MFA challenge returned', e);
    }

    // 2.2 skipMfa: false does not alter server policy
    try {
      const res = await customRequest(port, 'POST', '/api/auth/login', {
        email: providerUser.email,
        password: realProviderPassword,
        skipMfa: false,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.requiresMfa, true);
      assert.strictEqual(res.body.token, undefined);
      recordPass('2.2 skipMfa: false does not alter server policy');
    } catch (e) {
      recordFail('2.2 skipMfa: false does not alter server policy', e);
    }

    // 2.3 Bypass parameters in query strings, headers, and alternate body fields do not work
    const bypassAttempts = [
      { body: { skipOTP: true }, path: '/api/auth/login', headers: {} },
      { body: { bypassMfa: true }, path: '/api/auth/login?skipMfa=true', headers: { 'x-skip-mfa': 'true' } },
      { body: { disableMfa: true }, path: '/api/auth/login?bypassMfa=true', headers: { 'x-bypass-mfa': 'true' } },
    ];

    for (let i = 0; i < bypassAttempts.length; i++) {
      const attempt = bypassAttempts[i];
      const res = await customRequest(
        port,
        'POST',
        attempt.path,
        {
          email: providerUser.email,
          password: realProviderPassword,
          ...attempt.body,
        },
        attempt.headers
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        res.body.token,
        undefined,
        `Bypass attempt ${i + 1} (${JSON.stringify(attempt)}) must NOT return a session token`
      );
      assert.strictEqual(res.body.requiresMfa, true);
    }
    recordPass('2.3 Query string, header, and alternate body bypass parameters are neutralized');

    // 2.4 Intermediate MFA token cannot access authenticated routes
    try {
      const res = await customRequest(port, 'GET', '/api/auth/me', null, {
        Authorization: `Bearer ${mfaTokenForTest}`,
      });
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
      recordPass('2.4 Intermediate MFA token cannot access authenticated routes');
    } catch (e) {
      recordFail('2.4 Intermediate MFA token cannot access authenticated routes', e);
    }

    // 2.5 Admin role requires mandatory MFA
    try {
      const res = await customRequest(port, 'POST', '/api/auth/login', {
        email: adminUser.email,
        password: realAdminPassword,
        skipMfa: true,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.requiresMfa, true, 'Admin account must require MFA');
      assert.strictEqual(res.body.token, undefined, 'Admin login must not return full token prior to OTP verification');
      recordPass('2.5 Administrator role enforces mandatory MFA');
    } catch (e) {
      recordFail('2.5 Administrator role enforces mandatory MFA', e);
    }

    // 2.6 Incorrect OTP is rejected
    try {
      const res = await customRequest(port, 'POST', '/api/auth/verify-login-otp', {
        mfaToken: mfaTokenForTest,
        otp: '000000',
      });
      assert.strictEqual(res.status, 400, `Expected 400 for incorrect OTP, got ${res.status}`);
      recordPass('2.6 Incorrect OTP is rejected');
    } catch (e) {
      recordFail('2.6 Incorrect OTP is rejected', e);
    }

    // 2.7 Expired OTP is rejected
    try {
      const expiredOtpToken = jwt.sign(
        { id: providerUser.id, email: providerUser.email, purpose: 'mfa' },
        JWT_SECRET,
        { expiresIn: '10m' }
      );
      db.data.otps.push({
        id: 99991,
        email: providerUser.email,
        otp: '777888',
        purpose: 'login_mfa',
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // expired 1m ago
        attempts: 0,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      });

      const res = await customRequest(port, 'POST', '/api/auth/verify-login-otp', {
        mfaToken: expiredOtpToken,
        otp: '777888',
      });
      assert.strictEqual(res.status, 400, `Expected 400 for expired OTP, got ${res.status}`);
      recordPass('2.7 Expired OTP is rejected');
    } catch (e) {
      recordFail('2.7 Expired OTP is rejected', e);
    }

    // 2.8 Valid OTP succeeds and issues authorized access token
    let validToken = null;
    try {
      const activeOtpRecord = db.data.otps.find(
        (o) => o.email === providerUser.email && o.purpose === 'login_mfa' && new Date() < new Date(o.expiresAt)
      );
      assert(activeOtpRecord, 'Active OTP record must exist in db');

      const res = await customRequest(port, 'POST', '/api/auth/verify-login-otp', {
        mfaToken: mfaTokenForTest,
        otp: activeOtpRecord.otp,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert(!!res.body.token, 'Expected session token upon successful OTP verification');
      assert.strictEqual(res.body.user.email, providerUser.email);
      validToken = res.body.token;
      recordPass('2.8 Valid OTP succeeds and issues authorized session token');
    } catch (e) {
      recordFail('2.8 Valid OTP succeeds and issues authorized session token', e);
    }

    // 2.9 OTP Replay is blocked (single-use constraint)
    try {
      const res = await customRequest(port, 'POST', '/api/auth/verify-login-otp', {
        mfaToken: mfaTokenForTest,
        otp: devOtpForTest || '123456',
      });
      assert.strictEqual(res.status, 400, `Expected 400 on replay attempt, got ${res.status}`);
      recordPass('2.9 Reused OTP is rejected (single-use enforced)');
    } catch (e) {
      recordFail('2.9 Reused OTP is rejected (single-use enforced)', e);
    }

    // 2.10 Authenticated token obtained after MFA works on protected routes
    try {
      const res = await customRequest(port, 'GET', '/api/auth/me', null, {
        Authorization: `Bearer ${validToken}`,
      });
      assert.strictEqual(res.status, 200, `Expected 200 for authenticated user, got ${res.status}`);
      assert.strictEqual(res.body.user.email, providerUser.email);
      recordPass('2.10 Authenticated session token functions on protected routes');
    } catch (e) {
      recordFail('2.10 Authenticated session token functions on protected routes', e);
    }

    // 2.11 OTP attempt limit triggers lockout (5 failed attempts -> 429)
    try {
      const adminLoginRes = await customRequest(port, 'POST', '/api/auth/login', {
        email: adminUser.email,
        password: realAdminPassword,
      });
      const adminMfaToken = adminLoginRes.body.mfaToken;

      for (let attempt = 1; attempt <= 4; attempt++) {
        const attemptRes = await customRequest(port, 'POST', '/api/auth/verify-login-otp', {
          mfaToken: adminMfaToken,
          otp: '999999', // wrong OTP
        });
        assert.strictEqual(attemptRes.status, 400, `Attempt ${attempt}: expected 400`);
      }

      // 5th attempt triggers rate limit lockout
      const fifthAttempt = await customRequest(port, 'POST', '/api/auth/verify-login-otp', {
        mfaToken: adminMfaToken,
        otp: '999999',
      });
      assert.strictEqual(fifthAttempt.status, 429, `5th attempt: expected 429, got ${fifthAttempt.status}`);
      recordPass('2.11 OTP attempt limits enforce 429 lockout after 5 failures');
    } catch (e) {
      recordFail('2.11 OTP attempt limits enforce 429 lockout after 5 failures', e);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PART 3: SEC-03 ANDROID SIGNING KEY PROTECTION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- PART 3: SEC-03 ANDROID SIGNING KEY REPOSITORY AUDIT ---');

    // 3.1 Verify upload-keystore.jks is NOT tracked by Git
    try {
      const gitTracked = execSync('git ls-files -- mobile/android/app/upload-keystore.jks', { encoding: 'utf8' }).trim();
      assert.strictEqual(gitTracked, '', 'upload-keystore.jks must NOT be tracked in Git index');
      recordPass('3.1 upload-keystore.jks is not tracked in Git index');
    } catch (e) {
      recordFail('3.1 upload-keystore.jks is not tracked in Git index', e);
    }

    // 3.2 Verify key.properties is NOT tracked by Git
    try {
      const gitTrackedProps = execSync('git ls-files -- mobile/android/key.properties', { encoding: 'utf8' }).trim();
      assert.strictEqual(gitTrackedProps, '', 'key.properties must NOT be tracked in Git index');
      recordPass('3.2 key.properties is not tracked in Git index');
    } catch (e) {
      recordFail('3.2 key.properties is not tracked in Git index', e);
    }

    // 3.3 Verify .gitignore contains signing exclusions
    try {
      const repoRoot = path.resolve(__dirname, '../../..');
      const rootGitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
      assert(rootGitignore.includes('*.jks'), 'Root .gitignore must include *.jks');
      assert(rootGitignore.includes('*.keystore'), 'Root .gitignore must include *.keystore');
      assert(rootGitignore.includes('key.properties'), 'Root .gitignore must include key.properties');

      const mobileGitignore = fs.readFileSync(path.join(repoRoot, 'mobile/.gitignore'), 'utf8');
      assert(mobileGitignore.includes('*.jks'), 'mobile/.gitignore must include *.jks');
      assert(mobileGitignore.includes('key.properties'), 'mobile/.gitignore must include key.properties');
      recordPass('3.3 Both root and mobile .gitignore files enforce *.jks and key.properties exclusion');
    } catch (e) {
      recordFail('3.3 Both root and mobile .gitignore files enforce *.jks and key.properties exclusion', e);
    }

    // 3.4 Verify key.properties.example exists and contains safe placeholders only
    try {
      const repoRoot = path.resolve(__dirname, '../../..');
      const examplePath = path.join(repoRoot, 'mobile/android/key.properties.example');
      assert(fs.existsSync(examplePath), 'key.properties.example must exist');
      const exampleContent = fs.readFileSync(examplePath, 'utf8');
      assert(exampleContent.includes('storePassword=YourKeystorePasswordHere'), 'Template must use safe placeholder');
      assert(exampleContent.includes('keyPassword=YourKeyPasswordHere'), 'Template must use safe placeholder');
      assert(!exampleContent.includes('/Users/'), 'Template must not contain absolute paths');
      recordPass('3.4 key.properties.example template contains safe placeholders only');
    } catch (e) {
      recordFail('3.4 key.properties.example template contains safe placeholders only', e);
    }

    // 3.5 Verify zero signing secrets in Git tracked files
    try {
      const trackedSecrets = execSync(
        'git grep -E "storePassword=[^Y]|keyPassword=[^Y]" 2>/dev/null || true',
        { encoding: 'utf8' }
      ).trim();
      assert.strictEqual(trackedSecrets, '', 'No real signing passwords may be tracked in Git');
      recordPass('3.5 Zero plaintext signing passwords or keystores tracked across repository');
    } catch (e) {
      recordFail('3.5 Zero plaintext signing passwords or keystores tracked across repository', e);
    }

    console.log('\n================================================================');
    console.log(`🎓 ALL REMEDIATION TESTS PASSED: ${passedCount}/${totalCount}`);
    console.log('================================================================\n');

  } finally {
    await env.close();
    process.exit(passedCount === totalCount ? 0 : 1);
  }
}

run().catch((err) => {
  console.error('\n❌ REMEDIATION TEST SUITE FAILED:', err);
  process.exit(1);
});
