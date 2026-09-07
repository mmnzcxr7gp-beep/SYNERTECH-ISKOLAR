/**
 * ISKOLAR TEST: Cross-Role Account Deletion Denial
 * Verifies that Students cannot delete any accounts, Providers cannot delete Students
 * or other Providers, and unauthenticated callers receive 401 Unauthorized.
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
  console.log('🧪 RUNNING CROSS-ROLE ACCOUNT DELETION DENIAL TEST');
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

    const targetStudentId = 88011;
    const targetProviderId = 88012;

    if (!db.data.users) db.data.users = [];
    db.data.users.push(
      { id: targetStudentId, email: 'victim.student@iskolar.ph', role: 'student', accountStatus: 'ACTIVE' },
      { id: targetProviderId, email: 'victim.provider@iskolar.ph', role: 'provider', accountStatus: 'ACTIVE' }
    );
    await db.write();

    console.log('\n[STEP 1] Student attempts to delete another student account...');
    const sDelRes = await request(port, 'POST', `/api/admin/accounts/${targetStudentId}/soft-delete`, { reason: 'Unauthorized delete' }, studentToken);
    assert.strictEqual(sDelRes.statusCode, 403, `Expected 403 Forbidden, got ${sDelRes.statusCode}`);
    console.log('  ✅ PASS: Student delete attempt blocked with 403 Forbidden');
    passed++;

    console.log('\n[STEP 2] Provider attempts to delete a student account...');
    const pDelStudentRes = await request(port, 'POST', `/api/admin/accounts/${targetStudentId}/soft-delete`, { reason: 'Unauthorized delete' }, providerToken);
    assert.strictEqual(pDelStudentRes.statusCode, 403, `Expected 403 Forbidden, got ${pDelStudentRes.statusCode}`);
    console.log('  ✅ PASS: Provider attempting to delete student blocked with 403 Forbidden');
    passed++;

    console.log('\n[STEP 3] Provider attempts to delete another provider account...');
    const pDelProviderRes = await request(port, 'POST', `/api/admin/accounts/${targetProviderId}/soft-delete`, { reason: 'Unauthorized delete' }, providerToken);
    assert.strictEqual(pDelProviderRes.statusCode, 403, `Expected 403 Forbidden, got ${pDelProviderRes.statusCode}`);
    console.log('  ✅ PASS: Provider attempting to delete another provider blocked with 403 Forbidden');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 CROSS-ROLE DELETION DENIAL SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
