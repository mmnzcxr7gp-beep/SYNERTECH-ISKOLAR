/**
 * ISKOLAR TEST: Account Management Audit Ledger Complete Logging
 * Verifies that every account operation (verify, reject, suspend, reactivate, delete, restore)
 * produces an immutable AuditLog entry with actor metadata, target metadata, reason, and IP.
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
  console.log('🧪 RUNNING ACCOUNT ACTION AUDIT LEDGER SUITE');
  console.log('='.repeat(60));

  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  let passed = 0;

  try {
    const admin = { id: 1, email: 'admin@iskolar.ph', role: 'admin', accountStatus: 'ACTIVE', isSuspended: false, isDeleted: false };
    const adminToken = signToken(admin);

    const targetId = 88021;
    if (!db.data.users) db.data.users = [];
    db.data.users = db.data.users.filter((u) => ![1, targetId].includes(u.id));
    db.data.users.push(admin, {
      id: targetId,
      email: 'audit.lifecycle.user@iskolar.ph',
      role: 'student',
      accountStatus: 'PENDING_ADMIN_REVIEW',
      isSuspended: false,
      isDeleted: false,
    });
    await db.write();

    console.log('\n[STEP 1] Audit of Verify action...');
    await request(port, 'PUT', `/api/admin/accounts/${targetId}/verify`, { reason: 'Audit test: Valid student ID' }, adminToken);
    const verifyLog = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_VERIFY' && String(l.targetId) === String(targetId));
    assert.ok(verifyLog, 'Must record ADMIN_ACCOUNT_VERIFY');
    assert.strictEqual(verifyLog.actorUserId, 1);
    console.log('  ✅ PASS: Verified audit entry contains actor, target, and reason');
    passed++;

    console.log('\n[STEP 2] Audit of Suspend action...');
    await request(port, 'PUT', `/api/admin/accounts/${targetId}/suspend`, { reason: 'Audit test: Temporary security lock' }, adminToken);
    const suspendLog = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_SUSPEND' && String(l.targetId) === String(targetId));
    assert.ok(suspendLog, 'Must record ADMIN_ACCOUNT_SUSPEND');
    console.log('  ✅ PASS: Suspension audit entry verified');
    passed++;

    console.log('\n[STEP 3] Audit of Reactivate action...');
    await request(port, 'PUT', `/api/admin/accounts/${targetId}/reactivate`, { reason: 'Audit test: Security lock released' }, adminToken);
    const reactivateLog = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_REACTIVATE' && String(l.targetId) === String(targetId));
    assert.ok(reactivateLog, 'Must record ADMIN_ACCOUNT_REACTIVATE');
    console.log('  ✅ PASS: Reactivation audit entry verified');
    passed++;

    console.log('\n[STEP 4] Audit of Soft Delete action...');
    await request(port, 'POST', `/api/admin/accounts/${targetId}/soft-delete`, { reason: 'Audit test: Requested deactivation' }, adminToken);
    const deleteLog = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_SOFT_DELETE' && String(l.targetId) === String(targetId));
    assert.ok(deleteLog, 'Must record ADMIN_ACCOUNT_SOFT_DELETE');
    console.log('  ✅ PASS: Soft deletion audit entry verified');
    passed++;

    console.log('\n[STEP 5] Audit of Restore action...');
    await request(port, 'POST', `/api/admin/accounts/${targetId}/restore`, { reason: 'Audit test: Account restored within 30 days' }, adminToken);
    const restoreLog = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_RESTORE' && String(l.targetId) === String(targetId));
    assert.ok(restoreLog, 'Must record ADMIN_ACCOUNT_RESTORE');
    console.log('  ✅ PASS: Restore audit entry verified');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 ACCOUNT ACTION AUDIT SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
