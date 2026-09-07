/**
 * ISKOLAR TEST: Admin Account Verification Authorization
 * Verifies that only authenticated users with the 'admin' role can verify accounts,
 * and Students or Providers attempting verification are blocked with HTTP 403.
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
  console.log('🧪 RUNNING ACCOUNT VERIFICATION AUTHORIZATION TEST');
  console.log('='.repeat(60));

  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  let passed = 0;

  try {
    const student = { id: 24, email: 'student@iskolar.ph', role: 'student' };
    const studentToken = signToken(student);

    const provider = { id: 9, email: 'provider@iskolar.ph', role: 'sponsor' };
    const providerToken = signToken(provider);

    const targetId = 88301;
    if (!db.data.users) db.data.users = [];
    db.data.users.push({
      id: targetId,
      email: 'target.user@iskolar.ph',
      role: 'student',
      accountStatus: 'PENDING_ADMIN_REVIEW',
    });
    await db.write();

    console.log('\n[STEP 1] Student attempts account verification...');
    const studentRes = await request(port, 'PUT', `/api/admin/accounts/${targetId}/verify`, { reason: 'Unauthorized self-verify' }, studentToken);
    assert.strictEqual(studentRes.statusCode, 403, `Expected 403 Forbidden, got ${studentRes.statusCode}`);
    console.log('  ✅ PASS: Student verification attempt blocked with 403 Forbidden');
    passed++;

    console.log('\n[STEP 2] Provider attempts account verification...');
    const providerRes = await request(port, 'PUT', `/api/admin/accounts/${targetId}/verify`, { reason: 'Unauthorized provider verify' }, providerToken);
    assert.strictEqual(providerRes.statusCode, 403, `Expected 403 Forbidden, got ${providerRes.statusCode}`);
    console.log('  ✅ PASS: Provider verification attempt blocked with 403 Forbidden');
    passed++;

    console.log('\n[STEP 3] Unauthenticated request verification attempt...');
    const unauthRes = await request(port, 'PUT', `/api/admin/accounts/${targetId}/verify`, { reason: 'No auth' }, null);
    assert.strictEqual(unauthRes.statusCode, 401, `Expected 401 Unauthorized, got ${unauthRes.statusCode}`);
    console.log('  ✅ PASS: Unauthenticated verification attempt blocked with 401 Unauthorized');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 VERIFICATION AUTHORIZATION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
