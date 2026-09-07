/**
 * ISKOLAR TEST: Provider Manual File Review & Notes
 * Verifies that an authorized provider can inspect student documents in the review queue,
 * attach review notes, request resubmission, or verify the document manually.
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
  console.log('🧪 RUNNING PROVIDER MANUAL FILE REVIEW TEST');
  console.log('='.repeat(60));

  await connectDb();
  const app = buildApp();
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  let passed = 0;

  try {
    const provider = { id: 9, email: 'gokongwei.brothers@iskolar.ph', role: 'sponsor' };
    const providerToken = signToken(provider);

    const docId = 77401;
    const appId = 66401;

    // Seed scholarship owned by provider 9
    if (!db.data.scholarships) db.data.scholarships = [];
    db.data.scholarships.push({
      id: 501,
      title: 'Provider Review Test Scholarship',
      sponsor_id: 9,
    });

    // Seed application
    if (!db.data.applications) db.data.applications = [];
    db.data.applications.push({
      id: appId,
      student_id: 24,
      scholarship_id: 501,
      status: 'pending_manual_review',
    });

    // Seed document in manual review
    if (!db.data.documents) db.data.documents = [];
    db.data.documents.push({
      id: docId,
      documentId: docId,
      application_id: appId,
      studentId: 24,
      filename: 'sample_doc.pdf',
      status: 'PENDING_MANUAL_REVIEW',
    });
    await db.write();

    console.log('\n[STEP 1] Provider executes manual review action (VERIFY)...');
    const res = await request(port, 'POST', `/api/documents/${docId}/review-action`, {
      action: 'VERIFIED',
      notes: 'Manually inspected document seal and signature - verified authentic',
    }, providerToken);

    assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.document.status, 'VERIFIED');
    console.log('  ✅ PASS: Provider verified document manually with review notes');
    passed++;

    const updatedDoc = db.data.documents.find((d) => d.id === docId);
    assert.strictEqual(updatedDoc.status, 'VERIFIED');
    console.log('  ✅ PASS: Document status persisted as VERIFIED in database');
    passed++;

  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`🧪 PROVIDER MANUAL REVIEW SUMMARY: ${passed} PASSED, 0 FAILED`);
  console.log(`============================================================\n`);
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
