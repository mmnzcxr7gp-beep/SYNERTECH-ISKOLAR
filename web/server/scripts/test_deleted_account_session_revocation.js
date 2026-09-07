/**
 * ISKOLAR TEST: Suspended & Deleted Account Session Revocation
 * Verifies that once an account is suspended or soft-deleted, existing JWT tokens
 * are immediately rejected with HTTP 403 upon subsequent API requests.
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
const TEST_JWT_SECRET = 'test-isolated-jwt-secret-2026';
process.env.JWT_SECRET = TEST_JWT_SECRET;

const { buildApp } = require('../src/vercelApp');
const { db, connectDb } = require('../src/config/db');

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, TEST_JWT_SECRET, { expiresIn: '1h' });
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
  console.log('🧪 RUNNING ACCOUNT SESSION REVOCATION TEST');
  console.log('='.repeat(60));

  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  let passed = 0;

  try {
    const student = { id: 88041, email: 'revoked.student@iskolar.ph', role: 'student' };
    const preExistingStudentToken = signToken(student);

    if (!db.data.users) db.data.users = [];
    db.data.users = db.data.users.filter((u) => u.id !== student.id && u.email !== student.email);
    db.data.users.push({
      id: student.id,
      email: student.email,
      role: 'student',
      accountStatus: 'ACTIVE',
      isSuspended: false,
      isDeleted: false,
    });
    await db.write();

    console.log('\n[STEP 1] Valid active student accesses protected endpoint...');
    const activeRes = await request(port, 'GET', '/api/auth/me', null, preExistingStudentToken);
    assert.strictEqual(activeRes.statusCode, 200, `Expected 200 OK, got ${activeRes.statusCode}`);
    console.log('  ✅ PASS: Active student successfully accesses protected API');
    passed++;

    console.log('\n[STEP 2] Suspending student account...');
    let userInDb = db.data.users.find((u) => u.id === student.id);
    userInDb.accountStatus = 'SUSPENDED';
    userInDb.isSuspended = true;
    userInDb.suspensionReason = 'Security investigation';
    await db.write();

    console.log('\n[STEP 3] Suspended student attempts API request with pre-existing JWT...');
    const suspendedRes = await request(port, 'GET', '/api/auth/me', null, preExistingStudentToken);
    assert.strictEqual(suspendedRes.statusCode, 403, `Expected 403 Forbidden for suspended user, got ${suspendedRes.statusCode}`);
    assert.strictEqual(suspendedRes.body.code, 'ACCOUNT_SUSPENDED');
    console.log('  ✅ PASS: Suspended user token immediately rejected with 403 ACCOUNT_SUSPENDED');
    passed++;

    console.log('\n[STEP 4] Soft-deleting student account...');
    // Re-find user after request (db.read() replaces the in-memory array)
    userInDb = db.data.users.find((u) => u.id === student.id);
    userInDb.accountStatus = 'DELETION_PENDING';
    userInDb.isDeleted = true;
    userInDb.isSuspended = false;
    await db.write();

    console.log('\n[STEP 5] Deleted student attempts API request with pre-existing JWT...');
    const deletedRes = await request(port, 'GET', '/api/auth/me', null, preExistingStudentToken);
    assert.strictEqual(deletedRes.statusCode, 403, `Expected 403 Forbidden for deleted user, got ${deletedRes.statusCode}`);
    assert.strictEqual(deletedRes.body.code, 'ACCOUNT_DELETED');
    console.log('  ✅ PASS: Deleted user token immediately rejected with 403 ACCOUNT_DELETED');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 SESSION REVOCATION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
