/**
 * ISKOLAR TEST: Account Restoration During Retention Period
 * Verifies that a soft-deleted account in DELETION_PENDING or ARCHIVED state
 * can be restored by an authorized administrator with a mandatory reason.
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
  console.log('🧪 RUNNING ACCOUNT RESTORATION TEST');
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

    const targetId = 88901;
    if (!db.data.users) db.data.users = [];
    db.data.users = db.data.users.filter((u) => u.id !== targetId);
    db.data.users.push({
      id: targetId,
      email: 'mistakenly.deleted@iskolar.ph',
      role: 'provider',
      accountStatus: 'DELETION_PENDING',
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletionReason: 'Accidental deletion request',
      retentionUntil: new Date(Date.now() + 25 * 86400000).toISOString(),
    });
    await db.write();

    console.log('\n[STEP 1] Restore attempt without reason...');
    const noReasonRes = await request(port, 'POST', `/api/admin/accounts/${targetId}/restore`, {}, adminToken);
    assert.strictEqual(noReasonRes.statusCode, 400, `Expected 400 Bad Request, got ${noReasonRes.statusCode}`);
    console.log('  ✅ PASS: Restore without reason rejected');
    passed++;

    console.log('\n[STEP 2] Administrator restores account during retention period...');
    const res = await request(port, 'POST', `/api/admin/accounts/${targetId}/restore`, { reason: 'User cancelled deletion request within 30 days grace period' }, adminToken);
    assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}`);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    assert.strictEqual(res.body.account.isDeleted, false);
    console.log('  ✅ PASS: Account status restored to ACTIVE');
    passed++;

    const updated = db.data.users.find((u) => u.id === targetId);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.isDeleted, false);
    assert.strictEqual(updated.deletionReason, null);
    console.log('  ✅ PASS: Database record cleared soft-deletion flags');
    passed++;

    const audit = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_RESTORE' && String(l.targetId) === String(targetId));
    assert.ok(audit, 'Audit log must record ADMIN_ACCOUNT_RESTORE');
    console.log('  ✅ PASS: Restoration audit log verified');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 ACCOUNT RESTORATION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
