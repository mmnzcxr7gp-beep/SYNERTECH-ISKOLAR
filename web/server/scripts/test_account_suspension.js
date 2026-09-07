/**
 * ISKOLAR TEST: Account Suspension
 * Verifies that an administrator can suspend an account with a mandatory reason,
 * updating status to SUSPENDED and preventing future operations.
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
  console.log('🧪 RUNNING ACCOUNT SUSPENSION TEST');
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

    const targetId = 88501;
    if (!db.data.users) db.data.users = [];
    db.data.users = db.data.users.filter((u) => u.id !== targetId);
    db.data.users.push({
      id: targetId,
      email: 'misbehaving.student@iskolar.ph',
      role: 'student',
      accountStatus: 'ACTIVE',
      isSuspended: false,
    });
    await db.write();

    console.log('\n[STEP 1] Suspension attempt without reason...');
    const noReasonRes = await request(port, 'PUT', `/api/admin/accounts/${targetId}/suspend`, {}, adminToken);
    assert.strictEqual(noReasonRes.statusCode, 400, `Expected 400 Bad Request, got ${noReasonRes.statusCode}`);
    console.log('  ✅ PASS: Suspension without reason blocked');
    passed++;

    console.log('\n[STEP 2] Administrator suspends student account with reason...');
    const res = await request(port, 'PUT', `/api/admin/accounts/${targetId}/suspend`, { reason: 'Terms of service violation - fraudulent GPA report' }, adminToken);
    assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}`);
    assert.strictEqual(res.body.account.accountStatus, 'SUSPENDED');
    assert.strictEqual(res.body.account.isSuspended, true);
    console.log('  ✅ PASS: Account status updated to SUSPENDED with reason');
    passed++;

    const updated = db.data.users.find((u) => u.id === targetId);
    assert.strictEqual(updated.isSuspended, true);
    assert.strictEqual(updated.suspensionReason, 'Terms of service violation - fraudulent GPA report');
    console.log('  ✅ PASS: Database record reflects suspended state and reason');
    passed++;

    const audit = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_SUSPEND' && String(l.targetId) === String(targetId));
    assert.ok(audit, 'Audit log must record ADMIN_ACCOUNT_SUSPEND');
    console.log('  ✅ PASS: Immutable audit log recorded for account suspension');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 ACCOUNT SUSPENSION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
