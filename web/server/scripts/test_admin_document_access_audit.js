/**
 * ISKOLAR TEST: Administrator Document Access Audit Logging
 * Verifies that whenever an Administrator downloads or views a candidate file,
 * an immutable AuditLog entry with action ADMIN_FILE_ACCESS is immediately created.
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
  console.log('🧪 RUNNING ADMIN DOCUMENT ACCESS AUDIT TEST');
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

    const docId = 77601;
    if (!db.data.documents) db.data.documents = [];
    db.data.documents.push({
      id: docId,
      documentId: docId,
      application_id: 66601,
      studentId: 24,
      filename: 'sample_audit_target.pdf',
      status: 'VERIFIED',
    });
    await db.write();

    console.log('\n[STEP 1] Administrator downloads/accesses candidate file...');
    await request(port, 'GET', `/api/documents/${docId}/download`, null, adminToken);

    console.log('\n[STEP 2] Verifying that ADMIN_FILE_ACCESS audit event was created...');
    const audit = (db.data.audit_logs || []).find((l) => l.action === 'ADMIN_FILE_ACCESS' && String(l.targetId) === String(docId));
    assert.ok(audit, 'AuditLog must contain ADMIN_FILE_ACCESS entry');
    assert.strictEqual(audit.actorUserId, 1);
    assert.strictEqual(audit.actorRole, 'admin');
    console.log('  ✅ PASS: Immutable audit log recorded with admin ID and target document ID');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 ADMIN ACCESS AUDIT SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
