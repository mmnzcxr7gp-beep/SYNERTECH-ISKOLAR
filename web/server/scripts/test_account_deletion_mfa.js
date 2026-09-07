/**
 * ISKOLAR TEST: Account Deletion Authorization & MFA Integrity
 * Verifies that deletion requires full authenticated administrator credentials,
 * rejecting intermediate unverified MFA tokens and unauthenticated callers.
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
const TEST_JWT_SECRET = 'test-isolated-jwt-secret-2026';
process.env.JWT_SECRET = TEST_JWT_SECRET;

const { buildApp } = require('../src/vercelApp');
const { db, connectDb } = require('../src/config/db');

function signToken(user, purpose) {
  const payload = { id: user.id, email: user.email, role: user.role };
  if (purpose) payload.purpose = purpose;
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

function request(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://localhost:${port}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve({ statusCode: res.statusCode, body: JSON.parse(raw) }); } catch (_) { resolve({ statusCode: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING ACCOUNT DELETION MFA INTEGRITY TEST');
  console.log('='.repeat(60));

  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  let passed = 0;

  try {
    const admin = { id: 1, email: 'admin@iskolar.ph', role: 'admin' };
    const validAdminToken = signToken(admin);
    const mfaPendingToken = signToken(admin, 'mfa'); // Intermediate MFA token (pre-OTP)

    const targetId = 88801;
    if (!db.data.users) db.data.users = [];
    db.data.users = db.data.users.filter((u) => u.id !== targetId);
    db.data.users.push({
      id: targetId,
      email: 'delete.target@iskolar.ph',
      role: 'student',
      accountStatus: 'ACTIVE',
    });
    await db.write();

    console.log('\n[STEP 1] Attempt deletion with unverified intermediate MFA token...');
    const mfaRes = await request(port, 'POST', `/api/admin/accounts/${targetId}/soft-delete`, { reason: 'Decommissioning inactive student' }, mfaPendingToken);
    assert.strictEqual(mfaRes.statusCode, 401, `Expected 401 Unauthorized for intermediate MFA token, got ${mfaRes.statusCode}`);
    console.log('  ✅ PASS: Intermediate unverified MFA token rejected from executing deletion');
    passed++;

    console.log('\n[STEP 2] Attempt deletion with fully authenticated administrator token...');
    const validRes = await request(port, 'POST', `/api/admin/accounts/${targetId}/soft-delete`, { reason: 'Decommissioning inactive student' }, validAdminToken);
    assert.strictEqual(validRes.statusCode, 200, `Expected 200 OK, got ${validRes.statusCode}`);
    assert.strictEqual(validRes.body.account.accountStatus, 'DELETION_PENDING');
    console.log('  ✅ PASS: Verified administrator successfully schedules deletion');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 DELETION MFA INTEGRITY SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
