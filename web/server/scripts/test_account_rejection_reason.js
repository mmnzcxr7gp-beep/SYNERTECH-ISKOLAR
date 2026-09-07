/**
 * ISKOLAR TEST: Account Rejection Mandatory Reason
 * Verifies that account rejection requires a mandatory reason (minimum 5 chars),
 * sets status to REJECTED, and records audit trail.
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
  console.log('🧪 RUNNING ACCOUNT REJECTION REASON TEST');
  console.log('='.repeat(60));

  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  let passed = 0;

  try {
    const admin = { id: 1, email: 'admin@iskolar.ph', role: 'admin' };
    const adminToken = signToken(admin);

    const targetId = 88401;
    if (!db.data.users) db.data.users = [];
    db.data.users = db.data.users.filter((u) => u.id !== targetId);
    db.data.users.push({
      id: targetId,
      email: 'fraudulent.provider@iskolar.ph',
      role: 'provider',
      accountStatus: 'PENDING_ADMIN_REVIEW',
    });
    await db.write();

    console.log('\n[STEP 1] Rejection attempt without reason...');
    const noReasonRes = await request(port, 'PUT', `/api/admin/accounts/${targetId}/reject`, {}, adminToken);
    assert.strictEqual(noReasonRes.statusCode, 400, `Expected 400 Bad Request, got ${noReasonRes.statusCode}`);
    console.log('  ✅ PASS: Rejection without mandatory reason rejected with 400');
    passed++;

    console.log('\n[STEP 2] Rejection attempt with too short reason (< 5 chars)...');
    const shortReasonRes = await request(port, 'PUT', `/api/admin/accounts/${targetId}/reject`, { reason: 'No' }, adminToken);
    assert.strictEqual(shortReasonRes.statusCode, 400, `Expected 400 Bad Request, got ${shortReasonRes.statusCode}`);
    console.log('  ✅ PASS: Rejection with short reason rejected with 400');
    passed++;

    console.log('\n[STEP 3] Valid rejection with descriptive reason...');
    const validRes = await request(port, 'PUT', `/api/admin/accounts/${targetId}/reject`, { reason: 'Invalid SEC registration certificate provided' }, adminToken);
    assert.strictEqual(validRes.statusCode, 200, `Expected 200 OK, got ${validRes.statusCode}`);
    assert.strictEqual(validRes.body.account.accountStatus, 'REJECTED');
    console.log('  ✅ PASS: Account status updated to REJECTED');
    passed++;

    const updated = db.data.users.find((u) => u.id === targetId);
    assert.strictEqual(updated.rejectionReason, 'Invalid SEC registration certificate provided');
    console.log('  ✅ PASS: Rejection reason persisted in database record');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 ACCOUNT REJECTION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
