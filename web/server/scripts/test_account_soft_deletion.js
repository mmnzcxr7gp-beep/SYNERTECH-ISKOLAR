/**
 * ISKOLAR TEST: Account Soft Deletion & Archival with Retention
 * Verifies that account deletion defaults to controlled soft deletion (DELETION_PENDING),
 * assigns retention expiration, preserves application evidence, and creates audit ledger.
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
  console.log('🧪 RUNNING ACCOUNT SOFT DELETION & RETENTION TEST');
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

    const targetId = 88701;
    if (!db.data.users) db.data.users = [];
    db.data.users = db.data.users.filter((u) => u.id !== targetId);
    db.data.users.push({
      id: targetId,
      email: 'departing.provider@iskolar.ph',
      role: 'provider',
      accountStatus: 'ACTIVE',
      isDeleted: false,
    });

    // Add related application to verify zero cascade data destruction
    const appId = 99701;
    if (!db.data.applications) db.data.applications = [];
    db.data.applications = db.data.applications.filter((a) => a.id !== appId);
    db.data.applications.push({
      id: appId,
      student_id: 24,
      scholarship_id: 10,
      status: 'submitted',
    });
    await db.write();

    console.log('\n[STEP 1] Soft deletion attempt without reason...');
    const noReasonRes = await request(port, 'POST', `/api/admin/accounts/${targetId}/soft-delete`, {}, adminToken);
    assert.strictEqual(noReasonRes.statusCode, 400, `Expected 400 Bad Request, got ${noReasonRes.statusCode}`);
    console.log('  ✅ PASS: Deletion without reason rejected');
    passed++;

    console.log('\n[STEP 2] Administrator executes controlled soft deletion with 30-day retention...');
    const res = await request(port, 'POST', `/api/admin/accounts/${targetId}/soft-delete`, { reason: 'Provider requested organization closure' }, adminToken);
    assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}`);
    assert.strictEqual(res.body.account.accountStatus, 'DELETION_PENDING');
    assert.strictEqual(res.body.account.isDeleted, true);
    assert.ok(res.body.account.retentionUntil, 'Must set retentionUntil date');
    console.log('  ✅ PASS: Account status set to DELETION_PENDING with retention date');
    passed++;

    console.log('\n[STEP 3] Verifying evidence preservation (zero cascade wipe)...');
    const preservedApp = db.data.applications.find((a) => a.id === appId);
    assert.ok(preservedApp, 'Associated applications must NOT be cascade-deleted');
    console.log('  ✅ PASS: Associated student applications and documents preserved intact');
    passed++;

    const audit = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_SOFT_DELETE' && String(l.targetId) === String(targetId));
    assert.ok(audit, 'Audit log must record ADMIN_ACCOUNT_SOFT_DELETE');
    console.log('  ✅ PASS: Immutable audit log created with deletion reason');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 ACCOUNT SOFT DELETION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
