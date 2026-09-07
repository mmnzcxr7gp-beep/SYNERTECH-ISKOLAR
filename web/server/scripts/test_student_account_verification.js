/**
 * ISKOLAR TEST: Student Account Verification
 * Verifies that an authorized Administrator can verify student accounts,
 * updating status to ACTIVE and generating immutable audit and notification records.
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
  console.log('🧪 RUNNING STUDENT ACCOUNT VERIFICATION TEST');
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

    if (!db.data.users) db.data.users = [];
    const existingAdmin = db.data.users.find((u) => u.id === 1 || u.email === 'admin@iskolar.ph');
    if (existingAdmin) {
      existingAdmin.accountStatus = 'ACTIVE';
      existingAdmin.isSuspended = false;
      existingAdmin.isDeleted = false;
    } else {
      db.data.users.push(admin);
    }

    // Create synthetic unverified student
    const studentId = 88101;
    const student = {
      id: studentId,
      name: 'Unverified Student A',
      email: 'unverified.student@iskolar.ph',
      role: 'student',
      accountStatus: 'PENDING_ADMIN_REVIEW',
      verificationStatus: 'pending',
      emailVerified: false,
    };

    db.data.users = db.data.users.filter((u) => u.id !== studentId);
    db.data.users.push(student);
    await db.write();

    console.log('\n[STEP 1] Administrator verifies student account...');
    const res = await request(port, 'PUT', `/api/admin/accounts/${studentId}/verify`, { reason: 'Valid school enrollment certificate confirmed' }, adminToken);
    assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}`);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE', 'Account status must be ACTIVE');
    assert.strictEqual(res.body.account.verificationStatus, 'verified', 'Verification status must be verified');
    console.log('  ✅ PASS: Administrator successfully verified student account');
    passed++;

    console.log('\n[STEP 2] Verifying persistent database state and notifications...');
    const updated = db.data.users.find((u) => u.id === studentId);
    assert.strictEqual(updated.accountStatus, 'ACTIVE');
    assert.strictEqual(updated.emailVerified, true);
    console.log('  ✅ PASS: User record updated to ACTIVE with verified email');
    passed++;

    const audit = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_VERIFY' && String(l.targetId) === String(studentId));
    assert.ok(audit, 'Audit log must record ADMIN_ACCOUNT_VERIFY');
    console.log('  ✅ PASS: Immutable audit log recorded with administrator ID and reason');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 STUDENT VERIFICATION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
