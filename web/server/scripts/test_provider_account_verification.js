/**
 * ISKOLAR TEST: Provider Account Verification
 * Verifies that an authorized Administrator can verify provider accounts and organization evidence,
 * updating status to ACTIVE and setting sponsor_verified = true and organization_verified = true.
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
  console.log('🧪 RUNNING PROVIDER ACCOUNT VERIFICATION TEST');
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

    // Create synthetic unverified provider
    const providerId = 88201;
    const provider = {
      id: providerId,
      name: 'Unverified Foundation Inc',
      email: 'unverified.foundation@iskolar.ph',
      role: 'provider',
      company: 'Unverified Foundation Inc',
      organization_documents: ['sec_cert.pdf', 'bir_2303.pdf'],
      accountStatus: 'PENDING_ADMIN_REVIEW',
      verificationStatus: 'pending',
      sponsor_verified: false,
      organization_verified: false,
    };

    db.data.users = db.data.users.filter((u) => u.id !== providerId);
    db.data.users.push(provider);
    await db.write();

    console.log('\n[STEP 1] Administrator verifies provider organization evidence...');
    const res = await request(port, 'PUT', `/api/admin/accounts/${providerId}/verify`, { reason: 'SEC and BIR certificates authenticated' }, adminToken);
    assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}`);
    assert.strictEqual(res.body.account.accountStatus, 'ACTIVE');
    console.log('  ✅ PASS: Administrator verified provider account to ACTIVE');
    passed++;

    console.log('\n[STEP 2] Verifying sponsor flags and audit ledger...');
    const updated = db.data.users.find((u) => u.id === providerId);
    assert.strictEqual(updated.sponsor_verified, true);
    assert.strictEqual(updated.organization_verified, true);
    console.log('  ✅ PASS: Provider flags sponsor_verified and organization_verified set to true');
    passed++;

    const audit = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_ACCOUNT_VERIFY' && String(l.targetId) === String(providerId));
    assert.ok(audit, 'Audit log must record ADMIN_ACCOUNT_VERIFY for provider');
    console.log('  ✅ PASS: Provider verification audit record verified');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 PROVIDER VERIFICATION SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
